/**
 * Snap every pixel to the nearest palette color and drop soft edges, so no blurry
 * in-between colors survive. Pixels fainter than `alphaCut` vanish; the rest become
 * fully opaque. Works in place on RGBA bytes (e.g. ImageData.data).
 */
export function snapToPalette(rgba: Uint8ClampedArray, palette: number[], alphaCut = 120): void {
  const pal = palette.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const);
  const cache = new Map<number, readonly [number, number, number]>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! < alphaCut) {
      rgba[i + 3] = 0;
      continue;
    }
    rgba[i + 3] = 255;
    if (pal.length === 0) continue;
    const r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!, key = (r << 16) | (g << 8) | b;
    let best = cache.get(key);
    if (!best) {
      let bestDist = Infinity;
      // Eyes notice green differences most and red least, so the distance is weighted.
      for (const p of pal) {
        const dr = r - p[0], dg = g - p[1], db = b - p[2], dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < bestDist) { bestDist = dist; best = p; }
      }
      cache.set(key, best!);
    }
    rgba[i] = best![0];
    rgba[i + 1] = best![1];
    rgba[i + 2] = best![2];
  }
}
