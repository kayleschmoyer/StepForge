import sharp from 'sharp';
import type { Annotation } from '@shared/models/Annotation';

export class ImageOps {
  async thumbnail(png: Buffer): Promise<Buffer> {
    return sharp(png).resize({ width: 320, withoutEnlargement: true }).png().toBuffer();
  }

  async applyClickHighlight(png: Buffer, x: number, y: number, radius: number): Promise<Buffer> {
    const diameter = radius * 2;
    const overlay = Buffer.from(`<svg width="${diameter}" height="${diameter}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius - 2}" fill="none" stroke="#ff3b30" stroke-width="4"/><circle cx="${radius}" cy="${radius}" r="4" fill="#ff3b30"/></svg>`);
    return sharp(png)
      .composite([{ input: overlay, left: Math.max(0, Math.round(x - radius)), top: Math.max(0, Math.round(y - radius)) }])
      .png()
      .toBuffer();
  }

  async applyPrivacyAnnotations(png: Buffer, annotations: Annotation[]): Promise<Buffer> {
    let pipeline = sharp(png);
    const metadata = await pipeline.metadata();
    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    let current = await pipeline.png().toBuffer();

    for (const annotation of annotations) {
      if (annotation.kind === 'redact') {
        const [left, top, rectWidth, rectHeight] = this.normalizeBounds(annotation.bounds, width, height);
        const svg = Buffer.from(`<svg width="${rectWidth}" height="${rectHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/></svg>`);
        current = await sharp(current).composite([{ input: svg, left, top }]).png().toBuffer();
      }
      if (annotation.kind === 'blur') {
        const [left, top, rectWidth, rectHeight] = this.normalizeBounds(annotation.bounds, width, height);
        const blurredRegion = await sharp(current)
          .extract({ left, top, width: rectWidth, height: rectHeight })
          .blur(annotation.intensity || 12)
          .png()
          .toBuffer();
        current = await sharp(current).composite([{ input: blurredRegion, left, top }]).png().toBuffer();
      }
    }

    return current;
  }

  async renderExportImage(png: Buffer, annotations: Annotation[]): Promise<Buffer> {
    const privacyApplied = await this.applyPrivacyAnnotations(png, annotations);
    const metadata = await sharp(privacyApplied).metadata();
    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    const visible = annotations.filter((annotation) => annotation.kind !== 'blur' && annotation.kind !== 'redact');
    if (!visible.length) return privacyApplied;

    const overlay = Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${visible.map(renderAnnotationSvg).join('')}</svg>`);
    return sharp(privacyApplied).composite([{ input: overlay, left: 0, top: 0 }]).png().toBuffer();
  }

  private normalizeBounds(bounds: [number, number, number, number], imageWidth: number, imageHeight: number): [number, number, number, number] {
    const [rawLeft, rawTop, rawWidth, rawHeight] = bounds;
    const left = Math.max(0, Math.min(imageWidth - 1, Math.round(rawLeft)));
    const top = Math.max(0, Math.min(imageHeight - 1, Math.round(rawTop)));
    const width = Math.max(1, Math.min(imageWidth - left, Math.round(Math.abs(rawWidth))));
    const height = Math.max(1, Math.min(imageHeight - top, Math.round(Math.abs(rawHeight))));
    return [left, top, width, height];
  }
}

function renderAnnotationSvg(annotation: Annotation): string {
  switch (annotation.kind) {
    case 'arrow': {
      const [x1, y1] = annotation.from;
      const [x2, y2] = annotation.to;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = Math.max(12, annotation.strokeWidth * 4);
      const left = [x2 - Math.cos(angle - Math.PI / 6) * size, y2 - Math.sin(angle - Math.PI / 6) * size];
      const right = [x2 - Math.cos(angle + Math.PI / 6) * size, y2 - Math.sin(angle + Math.PI / 6) * size];
      return `<g fill="none" stroke="${xml(annotation.color)}" stroke-width="${annotation.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon points="${x2},${y2} ${left[0]},${left[1]} ${right[0]},${right[1]}" fill="${xml(annotation.color)}" stroke="none"/></g>`;
    }
    case 'rect': {
      const [x, y, width, height] = annotation.bounds;
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" fill="${annotation.filled ? xml(annotation.color) : 'none'}" stroke="${xml(annotation.color)}" stroke-width="${annotation.strokeWidth}"/>`;
    }
    case 'circle': {
      const [x, y, width, height] = annotation.bounds;
      return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="none" stroke="${xml(annotation.color)}" stroke-width="${annotation.strokeWidth}"/>`;
    }
    case 'text':
      return `<text x="${annotation.at[0]}" y="${annotation.at[1]}" fill="${xml(annotation.color)}" font-family="Segoe UI, Arial, sans-serif" font-size="${annotation.fontSize}" font-weight="700">${xml(annotation.text)}</text>`;
    case 'number':
      return `<g><circle cx="${annotation.at[0]}" cy="${annotation.at[1]}" r="18" fill="${xml(annotation.color)}"/><text x="${annotation.at[0]}" y="${annotation.at[1] + 6}" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="800">${annotation.n}</text></g>`;
    default:
      return '';
  }
}

function xml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}