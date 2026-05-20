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

  private normalizeBounds(bounds: [number, number, number, number], imageWidth: number, imageHeight: number): [number, number, number, number] {
    const [rawLeft, rawTop, rawWidth, rawHeight] = bounds;
    const left = Math.max(0, Math.min(imageWidth - 1, Math.round(rawLeft)));
    const top = Math.max(0, Math.min(imageHeight - 1, Math.round(rawTop)));
    const width = Math.max(1, Math.min(imageWidth - left, Math.round(Math.abs(rawWidth))));
    const height = Math.max(1, Math.min(imageHeight - top, Math.round(Math.abs(rawHeight))));
    return [left, top, width, height];
  }
}