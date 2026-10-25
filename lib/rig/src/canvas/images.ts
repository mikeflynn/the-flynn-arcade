/** How big a picture really is (0 × 0 if it hasn't loaded). */
export function imageSize(img: CanvasImageSource): { w: number; h: number } {
  if ("naturalWidth" in img) return { w: img.naturalWidth, h: img.naturalHeight };
  if ("videoWidth" in img) return { w: img.videoWidth, h: img.videoHeight };
  if ("displayWidth" in img) return { w: img.displayWidth, h: img.displayHeight };
  if (img instanceof SVGImageElement) return { w: img.width.baseVal.value, h: img.height.baseVal.value };
  return { w: img.width, h: img.height }; // a canvas or bitmap
}

/** Draw a picture as big as fits inside a box (keeping its shape), centered in it. */
export function drawContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const { w, h } = imageSize(img);
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
  const fit = Math.min(bw / w, bh / h);
  const dw = w * fit, dh = h * fit;
  ctx.drawImage(img, box.x0 + (bw - dw) / 2, box.y0 + (bh - dh) / 2, dw, dh);
}
