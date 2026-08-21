/**
 * Draw the toolbar ring icon as ImageData via OffscreenCanvas.
 *
 * Track: dark ring. Fill: an arc from 12 o'clock, clockwise, averagePct/100 of
 * 360°. The ring reflects elapsed time only — it is never pace-colored.
 */

export const RING_ACCENT = "#3b82f6"; // brand-neutral blue, distinct from pace colors
export const TRACK_COLOR = "rgba(255,255,255,0.18)";

function canvas2D(size: number): OffscreenCanvasRenderingContext2D {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return ctx;
}

export function drawRingImageData(size: 16 | 32, averagePct: number): ImageData {
  const ctx = canvas2D(size);
  const lineWidth = Math.max(1, Math.round(size / 8));
  const center = size / 2;
  const radius = size / 2 - 1;

  // Dark track
  ctx.strokeStyle = TRACK_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Fill arc from 12 o'clock, clockwise
  const frac = Math.min(1, Math.max(0, averagePct / 100));
  if (frac > 0) {
    ctx.strokeStyle = RING_ACCENT;
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}
