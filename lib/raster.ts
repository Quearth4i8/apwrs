/**
 * Turns the sampled risk grid into a smooth image the map can drape over the
 * ground.
 *
 * Drawing one polygon per sample point produced hard-edged rectangles several
 * kilometres across — an artefact of the sampling, not a feature of the data.
 * A continuous field reads honestly: the model output really is continuous,
 * and the sampling interval is stated separately rather than implied by the
 * shape of the pixels.
 */

/** Risk ramp, matching the badge, the legend and every chart. */
const STOPS: [number, [number, number, number]][] = [
  [0, [56, 168, 138]],   // #38A88A safe
  [25, [56, 168, 138]],
  [40, [231, 168, 59]],  // #E7A83B watch
  [60, [238, 132, 52]],  // #EE8434 severe
  [80, [217, 101, 101]], // #D96565 extreme
  [100, [217, 101, 101]],
];

function rampColor(v: number): [number, number, number] {
  if (v <= STOPS[0][0]) return STOPS[0][1];
  if (v >= STOPS[STOPS.length - 1][0]) return STOPS[STOPS.length - 1][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    const [x0, c0] = STOPS[i - 1];
    if (v <= x1) {
      const t = x1 === x0 ? 0 : (v - x0) / (x1 - x0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export interface RiskGrid {
  rows: number;
  cols: number;
  /** Row-major, length rows × cols; null where the model gave nothing. */
  risk: (number | null)[];
}

/**
 * Bilinear resample of the grid into an RGBA image. The GPU then filters it
 * again when magnifying, so a modest output size is already smooth.
 */
export function renderRiskImage(grid: RiskGrid, width = 512): HTMLCanvasElement {
  const { rows, cols, risk } = grid;
  const height = Math.max(1, Math.round((width * rows) / cols));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const image = ctx.createImageData(width, height);
  const px = image.data;

  const at = (r: number, c: number) => {
    const rr = Math.min(rows - 1, Math.max(0, r));
    const cc = Math.min(cols - 1, Math.max(0, c));
    return risk[rr * cols + cc];
  };

  for (let y = 0; y < height; y++) {
    // Row 0 of the grid is the southern edge; image row 0 is the north.
    const gy = ((height - 1 - y) / (height - 1)) * (rows - 1);
    const r0 = Math.floor(gy);
    const fy = gy - r0;

    for (let x = 0; x < width; x++) {
      const gx = (x / (width - 1)) * (cols - 1);
      const c0 = Math.floor(gx);
      const fx = gx - c0;

      const v00 = at(r0, c0);
      const v01 = at(r0, c0 + 1);
      const v10 = at(r0 + 1, c0);
      const v11 = at(r0 + 1, c0 + 1);

      const i = (y * width + x) * 4;
      if (v00 == null || v01 == null || v10 == null || v11 == null) {
        px[i + 3] = 0;
        continue;
      }

      const top = v00 + (v01 - v00) * fx;
      const bottom = v10 + (v11 - v10) * fx;
      const v = top + (bottom - top) * fy;

      const [r, g, b] = rampColor(v);
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Index of the sample nearest a clicked coordinate. */
export function nearestCell(
  grid: { rows: number; cols: number },
  region: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  lat: number,
  lon: number,
): number | null {
  const { rows, cols } = grid;
  const r = Math.round(((lat - region.minLat) / (region.maxLat - region.minLat)) * (rows - 1));
  const c = Math.round(((lon - region.minLon) / (region.maxLon - region.minLon)) * (cols - 1));
  if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
  return r * cols + c;
}
