/**
 * Shelf packing: cells go left to right in rows ("shelves"), with a 1 px gap so
 * neighbors never bleed into each other. A full page starts a new one.
 */
export function packCells(sizes: { w: number; h: number }[], pageSize = 2048): { page: number; x: number; y: number }[] {
  const GAP = 1;
  let page = 0, x = 0, y = 0, shelf = 0;
  return sizes.map(({ w, h }, i) => {
    if (w > pageSize || h > pageSize) {
      throw new Error(`Sprite cell ${i} (${w}×${h}) is bigger than the ${pageSize}×${pageSize} page.`);
    }
    if (x + w > pageSize) { x = 0; y += shelf + GAP; shelf = 0; } // next shelf
    if (y + h > pageSize) { page++; x = 0; y = 0; shelf = 0; } // next page
    const spot = { page, x, y };
    x += w + GAP;
    shelf = Math.max(shelf, h);
    return spot;
  });
}
