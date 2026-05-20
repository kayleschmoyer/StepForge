/**
 * Annotation model — drawn over a captured screenshot.
 * Coordinates are in the screenshot's pixel space (pre-zoom).
 */

export type AnnotationColor = string;

export interface ArrowAnnotation {
  id: string;
  kind: 'arrow';
  from: [number, number];
  to: [number, number];
  color: AnnotationColor;
  strokeWidth: number;
}

export interface RectAnnotation {
  id: string;
  kind: 'rect';
  bounds: [number, number, number, number];
  color: AnnotationColor;
  strokeWidth: number;
  filled?: boolean;
}

export interface CircleAnnotation {
  id: string;
  kind: 'circle';
  bounds: [number, number, number, number];
  color: AnnotationColor;
  strokeWidth: number;
}

export interface TextAnnotation {
  id: string;
  kind: 'text';
  at: [number, number];
  text: string;
  color: AnnotationColor;
  fontSize: number;
}

export interface NumberBadgeAnnotation {
  id: string;
  kind: 'number';
  at: [number, number];
  n: number;
  color: AnnotationColor;
}

export interface BlurAnnotation {
  id: string;
  kind: 'blur';
  bounds: [number, number, number, number];
  intensity: number;
}

export interface RedactAnnotation {
  id: string;
  kind: 'redact';
  bounds: [number, number, number, number];
}

export type Annotation =
  | ArrowAnnotation
  | RectAnnotation
  | CircleAnnotation
  | TextAnnotation
  | NumberBadgeAnnotation
  | BlurAnnotation
  | RedactAnnotation;

export type AnnotationKind = Annotation['kind'];
