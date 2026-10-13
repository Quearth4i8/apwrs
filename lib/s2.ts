/**
 * The Sentinel-2 index tiles shared by the tile route and the map: which
 * indices, over what area, down to what zoom, and on what colour scale.
 */

export type S2Index = "ndvi" | "ndwi";

/** The catchment's bounding box with a little margin, [west, south, east, north]. */
export const S2_BOUNDS: [number, number, number, number] = [9.1, 36.83, 9.87, 37.3];

/** Below this a tile spans so much ground the 1500 m/pixel ceiling bites. */
export const S2_MINZOOM = 8;

/**
 * Tiles go down to z16 (~1.9 m per pixel here), well past the bands' own
 * 10 m (B04, B08) and 20 m (B11). The extra pixels hold no extra detail —
 * Sentinel Hub blends them bilinearly — but they draw the field smoothly
 * rather than as blocks, and let a clip follow a field's edge closely.
 */
export const S2_MAXZOOM = 16;

export const S2: Record<S2Index, { resolutionM: number; domain: [number, number] }> = {
  ndvi: { resolutionM: 10, domain: [0, 0.8] },
  ndwi: { resolutionM: 20, domain: [-0.3, 0.4] },
};

export const isS2Index = (v: string): v is S2Index => v === "ndvi" || v === "ndwi";

/** Tile x, y (fractional) of a point at zoom z. */
export function lonLatToTile(lon: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
}

/** Whether tile z/x/y touches S2_BOUNDS. */
export function tileInBounds(z: number, x: number, y: number): boolean {
  const [w, s, e, n] = S2_BOUNDS;
  const [x0, y0] = lonLatToTile(w, n, z);
  const [x1, y1] = lonLatToTile(e, s, z);
  return x >= Math.floor(x0) && x <= Math.floor(x1) && y >= Math.floor(y0) && y <= Math.floor(y1);
}
