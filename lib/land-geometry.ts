/**
 * Field types and geometry, shared by the browser and the lands API — so no
 * client-only code here.
 */

/** [longitude, latitude], as GeoJSON orders them. */
export type LngLat = [number, number];

export interface Land {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  /** A calendar crop id, or "none". */
  crop: string;
  /** Corners in drawing order; the ring closes back to the first. */
  polygon: LngLat[];
  areaHa: number;
  center: LngLat;
  createdAt: string;
  updatedAt: string;
}

export type LandDraft = Pick<Land, "name" | "crop" | "polygon"> & { id?: string };

/* ── Geometry ────────────────────────────────────────────────────────── */

const R = 6_371_008.8; // mean Earth radius, m

/** Polygon area on the sphere, hectares (Chamberlain & Duquette, 2007). */
export function areaHa(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    s += ((l2 - l1) * Math.PI) / 180 * (2 + Math.sin((p1 * Math.PI) / 180) + Math.sin((p2 * Math.PI) / 180));
  }
  return Math.abs((s * R * R) / 2) / 10_000;
}

/** Area-weighted centroid; the vertex mean for slivers. */
export function centroid(ring: LngLat[]): LngLat {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-12) {
    return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

export function bounds(ring: LngLat[]): [number, number, number, number] {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Fields as GeoJSON for a map source; `selected` marks one for highlighting. */
export function landsGeoJSON(lands: Pick<Land, "id" | "name" | "polygon">[], selected?: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: lands
      .filter((l) => l.polygon.length >= 3)
      .map((l) => ({
        type: "Feature" as const,
        properties: { id: l.id, name: l.name, selected: l.id === selected },
        geometry: { type: "Polygon" as const, coordinates: [[...l.polygon, l.polygon[0]]] },
      })),
  };
}

