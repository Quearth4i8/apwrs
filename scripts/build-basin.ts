/**
 * The Ichkeul catchment (bassin versant) for the Overview map and its water
 * card, built from the study in ichkeul-soil-moisture/:
 *
 *   limit2.shp            the catchment outline, UTM 32N
 *   data/sections.geojson the catchment cut on the ERA5-Land 0.1° grid,
 *                         one section per model cell (build_sections.py)
 *   data/soil.json        ERA5-Land monthly soil water, rain and temperature
 *                         per section, with 1991–2020 normals and percentiles
 *                         (fetch_soil.py, Copernicus CDS)
 *
 * Writes
 *   public/data/basin.geojson  outline + sections with the latest state,
 *                              fetched by the map only
 *   lib/generated/basin.json   catchment-wide monthly series for the card
 *
 * Usage: npm run data:basin
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type * as GeoJSON from "geojson";

const SRC = "ichkeul-soil-moisture/ichkeul-soil-moisture";
const SIMPLIFY_DEG = 0.0002; // ~22 m, the tolerance build_sections.py suggests

type Ring = [number, number][];

/* ── Shapefile ───────────────────────────────────────────────────────── */

/** Polygon records from a .shp (type 5), as rings in the file's own CRS. */
function readPolygons(path: string): Ring[][] {
  const b = readFileSync(path);
  if (b.readInt32LE(32) !== 5) throw new Error(`${path}: not a polygon shapefile`);
  const polys: Ring[][] = [];
  let o = 100;
  while (o < b.length) {
    const len = b.readInt32BE(o + 4) * 2;
    const rec = o + 8;
    if (b.readInt32LE(rec) === 5) {
      const nParts = b.readInt32LE(rec + 36);
      const nPoints = b.readInt32LE(rec + 40);
      const parts = Array.from({ length: nParts }, (_, i) => b.readInt32LE(rec + 44 + i * 4));
      const pts = rec + 44 + nParts * 4;
      const rings: Ring[] = parts.map((start, i) => {
        const end = i + 1 < nParts ? parts[i + 1] : nPoints;
        const ring: Ring = [];
        for (let k = start; k < end; k++) ring.push([b.readDoubleLE(pts + k * 16), b.readDoubleLE(pts + k * 16 + 8)]);
        return ring;
      });
      polys.push(rings);
    }
    o = rec + len;
  }
  return polys;
}

/**
 * UTM → WGS84 (Snyder, Map Projections — A Working Manual, eqs. 8-18 to
 * 8-25). Millimetre-accurate this close to the central meridian.
 */
function utmToLonLat(x: number, y: number, zone: number): [number, number] {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

  const m = y / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const c1 = ep2 * Math.cos(phi1) ** 2;
  const t1 = Math.tan(phi1) ** 2;
  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const r1 = (a * (1 - e2)) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5;
  const d = (x - 500000) / (n1 * k0);

  const lat =
    phi1 -
    ((n1 * Math.tan(phi1)) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lon =
    lon0 +
    (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) /
      Math.cos(phi1);
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

/** Shoelace area of a lon/lat ring, in km², on a local equal-area scale. */
function ringKm2(r: Ring): number {
  const lat0 = (r.reduce((s, p) => s + p[1], 0) / r.length) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(lat0);
  const ky = 110.57;
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * kx * (y2 * ky) - x2 * kx * (y1 * ky);
  }
  return Math.abs(s) / 2;
}

/* ── Geometry helpers ────────────────────────────────────────────────── */

/**
 * Douglas–Peucker, iterative; keeps the ring closed. A closed ring starts and
 * ends on the same point, which gives no baseline, so it is anchored on that
 * point and the vertex farthest from it as well.
 */
function simplify(ring: Ring, tol: number): Ring {
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length);
  let far = 0;
  let farD = -1;
  ring.forEach(([x, y], i) => {
    const d = Math.hypot(x - ring[0][0], y - ring[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  });
  keep[0] = keep[far] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [
    [0, far],
    [far, ring.length - 1],
  ];
  while (stack.length) {
    const [i0, i1] = stack.pop()!;
    if (i1 - i0 < 2) continue;
    const [ax, ay] = ring[i0];
    const [bx, by] = ring[i1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let best = -1;
    let at = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs(dy * ring[i][0] - dx * ring[i][1] + bx * ay - by * ax) / len;
      if (d > best) {
        best = d;
        at = i;
      }
    }
    if (best > tol) {
      keep[at] = 1;
      stack.push([i0, at], [at, i1]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}

const round5 = (r: Ring): Ring => r.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);

/* ── Soil study ──────────────────────────────────────────────────────── */

interface Layer {
  valeurs: (number | null)[];
  normale_1991_2020: (number | null)[];
  anomalie: (number | null)[];
  percentile: (number | null)[];
  eau_mm?: (number | null)[];
  epaisseur_cm: number;
}
interface Section {
  id: string;
  nom: string;
  lat: number;
  lon: number;
  surface_km2: number;
  couches: Record<string, Layer>;
  meteo: Record<string, { valeurs: (number | null)[]; normale_1991_2020: (number | null)[] }>;
}
interface SoilFile {
  meta: { genere_le: string; couches: { cle: string; libelle: string; epaisseur_cm: number }[] };
  mois: string[];
  sections: Section[];
}

function main() {
  /* Outline: the shapefile's one real polygon (the other is a 25 m² stray). */
  const prj = readFileSync(`${SRC}/limit2.prj`, "utf8");
  const zone = Number(/UTM_Zone_(\d+)N/i.exec(prj)?.[1]);
  if (!zone) throw new Error(`limit2.prj: expected a UTM north zone, got ${prj.slice(0, 80)}`);
  const polys = readPolygons(`${SRC}/limit2.shp`)
    .map((rings) => rings.map((r) => r.map(([x, y]) => utmToLonLat(x, y, zone)) as Ring))
    .filter((rings) => ringKm2(rings[0]) >= 1);
  const outline = polys.map((rings) => rings.map((r) => round5(simplify(r, SIMPLIFY_DEG))));
  const basinKm2 = polys.reduce((s, rings) => s + ringKm2(rings[0]) - rings.slice(1).reduce((h, r) => h + ringKm2(r), 0), 0);

  /* Sections and their monthly state. */
  const sections = JSON.parse(readFileSync(`${SRC}/data/sections.geojson`, "utf8")) as GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    { id: string; nom: string; surface_km2: number }
  >;
  const soil = JSON.parse(readFileSync(`${SRC}/data/soil.json`, "utf8")) as SoilFile;
  const months = soil.mois;
  const last = months.length - 1;
  const byId = new Map(soil.sections.map((s) => [s.id, s]));

  const features: GeoJSON.Feature[] = [
    {
      type: "Feature",
      properties: { kind: "outline" },
      geometry:
        outline.length === 1
          ? { type: "Polygon", coordinates: outline[0] }
          : { type: "MultiPolygon", coordinates: outline },
    },
  ];
  for (const f of sections.features) {
    const s = byId.get(f.properties.id);
    if (!s) throw new Error(`soil.json has no ${f.properties.id}`);
    const root = s.couches.racinaire;
    const geom = f.geometry;
    const coords =
      geom.type === "Polygon"
        ? geom.coordinates.map((r) => round5(simplify(r as Ring, SIMPLIFY_DEG)))
        : geom.coordinates.map((p) => p.map((r) => round5(simplify(r as Ring, SIMPLIFY_DEG))));
    features.push({
      type: "Feature",
      properties: {
        kind: "section",
        id: s.id,
        km2: s.surface_km2,
        pct: root.percentile[last],
        mm: root.eau_mm?.[last] ?? null,
        rain: s.meteo.pluie_mm.valeurs[last],
        rainNormal: s.meteo.pluie_mm.normale_1991_2020[last],
      },
      geometry: { type: geom.type, coordinates: coords } as GeoJSON.Geometry,
    });
  }

  /* Catchment-wide series: each section weighted by its area. */
  const weighted = (pick: (s: Section) => (number | null)[], digits: number) =>
    months.map((_, i) => {
      let sum = 0;
      let w = 0;
      for (const s of soil.sections) {
        const v = pick(s)[i];
        if (v == null) continue;
        sum += v * s.surface_km2;
        w += s.surface_km2;
      }
      return w ? +(sum / w).toFixed(digits) : null;
    });
  const mmOf = (key: string, field: "valeurs" | "normale_1991_2020") => (s: Section) => {
    const l = s.couches[key];
    return l[field].map((v) => (v == null ? null : v * l.epaisseur_cm * 10)); // m³/m³ × cm → mm
  };

  const layers = soil.meta.couches
    .filter((c) => c.cle !== "racinaire")
    .map((c) => ({
      key: c.cle,
      label: c.libelle,
      cm: c.epaisseur_cm,
      pct: weighted((s) => s.couches[c.cle].percentile, 0),
      vol: weighted((s) => s.couches[c.cle].valeurs, 3),
    }));

  const basin = {
    generatedAt: new Date().toISOString(),
    source: "ERA5-Land monthly means, Copernicus Climate Change Service (C3S) — ichkeul-soil-moisture/",
    fetchedOn: soil.meta.genere_le,
    areaKm2: +basinKm2.toFixed(0),
    sections: soil.sections.length,
    months,
    rain: weighted((s) => s.meteo.pluie_mm.valeurs, 1),
    rainNormal: weighted((s) => s.meteo.pluie_mm.normale_1991_2020, 1),
    temp: weighted((s) => s.meteo.temp_c.valeurs, 1),
    reserveMm: weighted(mmOf("racinaire", "valeurs"), 0),
    reserveNormalMm: weighted(mmOf("racinaire", "normale_1991_2020"), 0),
    reservePct: weighted((s) => s.couches.racinaire.percentile, 0),
    layers,
  };

  mkdirSync("public/data", { recursive: true });
  const geo = JSON.stringify({ type: "FeatureCollection", month: months[last], features });
  writeFileSync("public/data/basin.geojson", geo);
  writeFileSync("lib/generated/basin.json", JSON.stringify(basin));

  const ring = outline[0][0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  console.log(`  outline   ${ring.length} points (from ${polys[0][0].length}), ${basinKm2.toFixed(0)} km²`);
  console.log(`  bbox      ${Math.min(...xs).toFixed(4)} ${Math.min(...ys).toFixed(4)} ${Math.max(...xs).toFixed(4)} ${Math.max(...ys).toFixed(4)}`);
  console.log(`  sections  ${soil.sections.length}, ${months[0]} → ${months[last]}`);
  console.log(`  wrote public/data/basin.geojson (${(geo.length / 1024).toFixed(0)} KB), lib/generated/basin.json`);
}

main();
