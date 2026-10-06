/**
 * How much each impact factor contributes to the drought risk at one place,
 * by the same entropy-weighted sum that makes the score (lib/risk.ts,
 * lib/drought.ts):
 *
 *   dₖ        = 1 − rₖ, where rₖ is the factor min–max normalised across the
 *               region by direction (0 at the wettest cell, 1 at the driest)
 *   pointsₖ   = 100 · wₖ · dₖ / Σ wⱼ          (over factors present here)
 *   risk      = Σ pointsₖ
 *   impactₖ   = wₖ · dₖ / Σ wⱼ · dⱼ · 100 %   (shares of the score; sum 100)
 *
 * wₖ are the entropy weights — set by how much each factor varies across
 * the region, not by hand.
 */
import type { GridPayload } from "@/components/map-view";
import { nearestCell } from "@/lib/raster";

type GridKey = keyof GridPayload["grid"];

export interface Impact {
  key: string;
  label: string;
  /** True where the factor stands in for a measurement not yet connected. */
  stand: boolean;
  /** Entropy weight wₖ, 0–1. */
  weight: number;
  value: number | null;
  /** dₖ, 0–1: how dry this place is on this factor against the region. */
  dryness: number | null;
  /** Points this factor adds to the 0–100 risk score. */
  points: number;
  /** Its share of the score, 0–100 %. */
  impact: number;
}

/** The scored cell for a place; if it falls on water, the nearest land cell. */
export function cellFor(p: GridPayload, lat: number, lon: number): number | null {
  const i = nearestCell(p.grid, p.region, lat, lon);
  if (i != null && p.grid.risk[i] != null) return i;
  const { rows, cols } = p.grid;
  const { minLat, maxLat, minLon, maxLon } = p.region;
  let best: number | null = null;
  let bestD = Infinity;
  p.grid.risk.forEach((r, k) => {
    if (r == null) return;
    const la = minLat + (Math.floor(k / cols) / (rows - 1)) * (maxLat - minLat);
    const lo = minLon + ((k % cols) / (cols - 1)) * (maxLon - minLon);
    const d = (la - lat) ** 2 + ((lo - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  return best;
}

export function impactsAt(p: GridPayload, i: number): Impact[] {
  const rows: Impact[] = p.factors.map((f) => {
    const col = (p.grid[f.key as GridKey] ?? []) as (number | null)[];
    const finite = col.filter((v): v is number => v != null && Number.isFinite(v));
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const v = col[i] ?? null;
    let dryness: number | null = null;
    if (v != null && finite.length) {
      const span = max - min;
      const r = span === 0 ? 0.5 : f.direction === "positive" ? (v - min) / span : (max - v) / span;
      dryness = 1 - r;
    }
    return {
      key: f.key,
      label: f.label,
      stand: !!f.note?.startsWith("stands in"),
      weight: p.weights[f.key] ?? 0,
      value: v,
      dryness,
      points: 0,
      impact: 0,
    };
  });
  // The score divides by the weight actually used at this cell (lib/drought.ts).
  const used = rows.reduce((s, r) => s + (r.dryness == null ? 0 : r.weight), 0) || 1;
  for (const r of rows) r.points = r.dryness == null ? 0 : (100 * r.weight * r.dryness) / used;
  const total = rows.reduce((s, r) => s + r.points, 0);
  for (const r of rows) r.impact = total > 0 ? (r.points / total) * 100 : 0;
  return rows;
}
