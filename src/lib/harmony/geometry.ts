// Plane geometry for harmony measurements. Points are image pixels (y grows downward).

export interface Point {
  x: number;
  y: number;
}

const DEGREES = 180 / Math.PI;

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

/** The angle at `vertex` between the rays toward `a` and `b`, in degrees. */
export function angleAt(a: Point, vertex: Point, b: Point) {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const lengths = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (!lengths) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / lengths))) * DEGREES;
}

/** Degrees the segment from `from` to `to` rises above horizontal, whichever way it points. */
export function riseAngle(from: Point, to: Point) {
  return Math.atan2(from.y - to.y, Math.abs(to.x - from.x)) * DEGREES;
}

/** How far a line tilts from horizontal, ignoring direction. */
export function tiltFromLevel(a: Point, b: Point) {
  return Math.abs(Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * DEGREES);
}

export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const radians = degrees / DEGREES;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** Unit vector pointing from `from` toward `to`. */
export function direction(from: Point, to: Point): Point {
  const length = distance(from, to) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

/** Distance from the line through `a` and `b`; positive on the side where `toward` lies. */
export function offsetFromLine(point: Point, a: Point, b: Point, toward: Point) {
  const length = distance(a, b);
  if (!length) return 0;
  const side = (p: Point) => ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / length;
  return side(point) * (Math.sign(side(toward)) || 1);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function boundingBox(points: Point[], padding: number): Box {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  const pad = padding * Math.max(width, height);
  return { x: minX - pad, y: minY - pad, width: width + pad * 2, height: height + pad * 2 };
}
