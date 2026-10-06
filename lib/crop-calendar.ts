/**
 * The planting calendar: when each crop is sown or planted and when it is
 * harvested, for Tunisia's sub-humid zone, after the FAO Crop Calendar.
 *
 * Periods are in month units from 1 January: 0 = 1 Jan, 0.5 = mid-January,
 * 1 = 1 Feb … 12 = 31 Dec. A crop may have more than one period of either
 * kind (tomato is sown twice a year; dry pea is lifted in spring and again in
 * late autumn).
 *
 * The requirements are agronomic reference ranges (FAO ECOCROP; FAO-29 salt
 * tolerance after Maas & Hoffman) used by lib/advisor.ts to judge a field.
 * Climate ranges are for the growing season, not the whole year: mean air
 * temperature and rain total between sowing and harvest. They are indicative
 * — local varieties can sit outside them.
 */

export type Period = [from: number, to: number];

export type Texture = "sand" | "sandy-loam" | "loam" | "clay-loam" | "clay";
export type Family = "cereal" | "legume" | "oilseed" | "allium" | "root" | "fruit-veg";

export interface Range {
  /** Optimal: full marks inside. */
  opt: [number, number];
  /** Absolute: the crop fails outside. */
  abs: [number, number];
}

export interface Requirements {
  /** Growing-season mean air temperature, °C. */
  temp: Range;
  /** Growing-season rain, mm. Irrigation can make up a shortfall. */
  rain: Range;
  /** Soil pH (water). */
  ph: Range;
  /** Soil salinity, ECe dS/m: full yield up to `ok`, crop lost by `fail`. */
  salinity: { ok: number; fail: number };
  /** Above this season-mean relative humidity, fungal disease pressure rises, %. */
  rhMax: number;
  /** Above this season-mean wind speed, lodging and damage risk rise, m/s. */
  windMax: number;
  /** Below this season-mean solar radiation, growth and quality suffer, MJ/m²/day. */
  radiationMin: number;
  /** Textures the crop does well on, and ones it tolerates. */
  texture: { good: Texture[]; ok: Texture[] };
  /** Minimum useful rooting depth, cm. */
  depthMin: number;
  /** Whether waterlogging in poorly drained soil harms it badly. */
  needsDrainage: boolean;
}

export interface CalendarCrop {
  id: string;
  name: string;
  nameFr: string;
  family: Family;
  /** Expected photo, public/images/crops/<id>.jpg. */
  image: string;
  sow: Period[];
  harvest: Period[];
  req: Requirements;
}

const img = (id: string) => `/images/crops/${id}.jpg`;

const CEREAL_TEXTURE = { good: ["loam", "clay-loam", "sandy-loam"] as Texture[], ok: ["clay"] as Texture[] };

export const CALENDAR_CROPS: CalendarCrop[] = [
  {
    id: "barley",
    name: "Barley",
    nameFr: "Orge",
    family: "cereal",
    image: img("barley"),
    sow: [[10, 10.5]],
    harvest: [[5, 6]],
    req: {
      temp: { opt: [10, 20], abs: [4, 26] },
      rain: { opt: [300, 600], abs: [200, 900] },
      ph: { opt: [6, 8], abs: [5.5, 8.5] },
      salinity: { ok: 8, fail: 28 },
      rhMax: 90,
      windMax: 6,
      radiationMin: 8,
      texture: { good: ["loam", "clay-loam", "sandy-loam"], ok: ["clay", "sand"] },
      depthMin: 50,
      needsDrainage: false,
    },
  },
  {
    id: "colza",
    name: "Colza (rapeseed)",
    nameFr: "Colza",
    family: "oilseed",
    image: img("colza"),
    sow: [[9.5, 10]],
    harvest: [[4.5, 6]],
    req: {
      temp: { opt: [10, 20], abs: [4, 26] },
      rain: { opt: [400, 700], abs: [300, 1000] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.2] },
      salinity: { ok: 9.7, fail: 20 },
      rhMax: 88,
      windMax: 6,
      radiationMin: 9,
      texture: { good: ["loam", "clay-loam"], ok: ["sandy-loam", "clay"] },
      depthMin: 60,
      needsDrainage: true,
    },
  },
  {
    id: "garlic",
    name: "Garlic",
    nameFr: "Ail",
    family: "allium",
    image: img("garlic"),
    sow: [[10.5, 11.5]],
    harvest: [[5.5, 6.5]],
    req: {
      temp: { opt: [12, 22], abs: [6, 28] },
      rain: { opt: [350, 550], abs: [250, 800] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.2] },
      salinity: { ok: 1.7, fail: 10 },
      rhMax: 80,
      windMax: 6,
      radiationMin: 9,
      texture: { good: ["loam", "sandy-loam"], ok: ["clay-loam", "sand"] },
      depthMin: 30,
      needsDrainage: true,
    },
  },
  {
    id: "lentil",
    name: "Lentil",
    nameFr: "Lentille",
    family: "legume",
    image: img("lentil"),
    sow: [[10.5, 11]],
    harvest: [[5, 6]],
    req: {
      temp: { opt: [12, 22], abs: [6, 27] },
      rain: { opt: [250, 450], abs: [180, 700] },
      ph: { opt: [6, 8], abs: [5.5, 8.5] },
      salinity: { ok: 1.5, fail: 7 },
      rhMax: 80,
      windMax: 6,
      radiationMin: 9,
      texture: { good: ["loam", "sandy-loam", "clay-loam"], ok: ["clay"] },
      depthMin: 40,
      needsDrainage: true,
    },
  },
  {
    id: "oats",
    name: "Oats",
    nameFr: "Avoine",
    family: "cereal",
    image: img("oats"),
    sow: [[9, 10.5]],
    harvest: [
      [2.75, 3.5],
      [4, 5],
      [5.5, 6.25],
    ],
    req: {
      temp: { opt: [10, 20], abs: [4, 26] },
      rain: { opt: [400, 700], abs: [250, 1000] },
      ph: { opt: [5.5, 7.5], abs: [5, 8.3] },
      salinity: { ok: 5, fail: 16 },
      rhMax: 90,
      windMax: 6,
      radiationMin: 8,
      texture: CEREAL_TEXTURE,
      depthMin: 50,
      needsDrainage: false,
    },
  },
  {
    id: "pea",
    name: "Pea, dry",
    nameFr: "Pois sec",
    family: "legume",
    image: img("pea"),
    sow: [[9, 11.5]],
    harvest: [
      [0, 5],
      [10.5, 12],
    ],
    req: {
      temp: { opt: [12, 20], abs: [6, 25] },
      rain: { opt: [350, 550], abs: [250, 800] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.2] },
      salinity: { ok: 1.5, fail: 8 },
      rhMax: 80,
      windMax: 6,
      radiationMin: 9,
      texture: { good: ["loam", "sandy-loam", "clay-loam"], ok: ["clay"] },
      depthMin: 40,
      needsDrainage: true,
    },
  },
  {
    id: "red-beet",
    name: "Red beet",
    nameFr: "Betterave rouge",
    family: "root",
    image: img("red-beet"),
    sow: [[3, 5]],
    harvest: [[0.5, 6]],
    req: {
      temp: { opt: [15, 22], abs: [8, 28] },
      rain: { opt: [400, 600], abs: [300, 900] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.3] },
      salinity: { ok: 4, fail: 15 },
      rhMax: 88,
      windMax: 6,
      radiationMin: 10,
      texture: { good: ["loam", "sandy-loam"], ok: ["clay-loam", "sand"] },
      depthMin: 40,
      needsDrainage: true,
    },
  },
  {
    id: "sunflower",
    name: "Sunflower",
    nameFr: "Tournesol",
    family: "oilseed",
    image: img("sunflower"),
    sow: [[0.5, 1.5]],
    harvest: [[6.5, 7]],
    req: {
      temp: { opt: [18, 26], abs: [12, 32] },
      rain: { opt: [450, 700], abs: [300, 1000] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.5] },
      salinity: { ok: 4.8, fail: 17 },
      rhMax: 85,
      windMax: 5,
      radiationMin: 16,
      texture: { good: ["loam", "clay-loam"], ok: ["sandy-loam", "clay"] },
      depthMin: 80,
      needsDrainage: true,
    },
  },
  {
    id: "tomato",
    name: "Tomato",
    nameFr: "Tomate",
    family: "fruit-veg",
    image: img("tomato"),
    sow: [
      [4.5, 5.5],
      [7.5, 8.5],
    ],
    harvest: [
      [0, 2.5],
      [8.5, 12],
    ],
    req: {
      temp: { opt: [20, 26], abs: [14, 32] },
      rain: { opt: [500, 800], abs: [400, 1200] },
      ph: { opt: [6, 7], abs: [5.5, 7.8] },
      salinity: { ok: 2.5, fail: 12.5 },
      rhMax: 80,
      windMax: 5,
      radiationMin: 15,
      texture: { good: ["loam", "sandy-loam"], ok: ["clay-loam"] },
      depthMin: 50,
      needsDrainage: true,
    },
  },
  {
    id: "triticale",
    name: "Triticale",
    nameFr: "Triticale",
    family: "cereal",
    image: img("triticale"),
    sow: [[10.5, 11.5]],
    harvest: [[2.5, 3.5]],
    req: {
      temp: { opt: [10, 20], abs: [4, 26] },
      rain: { opt: [350, 650], abs: [250, 900] },
      ph: { opt: [5.5, 7.5], abs: [5, 8.5] },
      salinity: { ok: 6.1, fail: 26 },
      rhMax: 90,
      windMax: 6,
      radiationMin: 8,
      texture: { good: ["loam", "clay-loam", "sandy-loam"], ok: ["clay", "sand"] },
      depthMin: 50,
      needsDrainage: false,
    },
  },
  {
    id: "wheat-bread",
    name: "Wheat, bread",
    nameFr: "Blé tendre",
    family: "cereal",
    image: img("wheat-bread"),
    sow: [[10.5, 11.5]],
    harvest: [[5.5, 7]],
    req: {
      temp: { opt: [10, 20], abs: [4, 26] },
      rain: { opt: [400, 650], abs: [280, 900] },
      ph: { opt: [6, 7.5], abs: [5.5, 8.5] },
      salinity: { ok: 6, fail: 20 },
      rhMax: 90,
      windMax: 6,
      radiationMin: 8,
      texture: CEREAL_TEXTURE,
      depthMin: 50,
      needsDrainage: false,
    },
  },
  {
    id: "wheat-durum",
    name: "Wheat, durum",
    nameFr: "Blé dur",
    family: "cereal",
    image: img("wheat-durum"),
    sow: [[10.5, 11.5]],
    harvest: [[5.5, 7]],
    req: {
      temp: { opt: [11, 21], abs: [5, 27] },
      rain: { opt: [350, 600], abs: [250, 850] },
      ph: { opt: [6.5, 8], abs: [6, 8.5] },
      salinity: { ok: 5.9, fail: 19 },
      rhMax: 90,
      windMax: 6,
      radiationMin: 8,
      texture: CEREAL_TEXTURE,
      depthMin: 50,
      needsDrainage: false,
    },
  },
];

export const CALENDAR_SOURCE = "FAO Crop Calendar · Tunisia, sub-humid zone";

export const FAMILY_LABEL: Record<Family, string> = {
  cereal: "Cereal",
  legume: "Legume",
  oilseed: "Oilseed",
  allium: "Allium",
  root: "Root crop",
  "fruit-veg": "Fruiting vegetable",
};

export function calendarCrop(id: string) {
  return CALENDAR_CROPS.find((c) => c.id === id) ?? CALENDAR_CROPS[0];
}

/* ── Dates ───────────────────────────────────────────────────────────── */

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Today as a month position, 0 = 1 Jan … 12 = 31 Dec. */
export function monthPos(d = new Date()): number {
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getMonth() + (d.getDate() - 1) / days;
}

/** A month position as a date label: 10.5 → "mid-November", 11 → "1 December". */
export function posLabel(p: number): string {
  const m = Math.floor(p) % 12;
  const f = p - Math.floor(p);
  if (f < 0.1) return `early ${MONTHS[m]}`;
  if (f < 0.4) return `early ${MONTHS[m]}`;
  if (f < 0.7) return `mid-${MONTHS[m]}`;
  return `late ${MONTHS[m]}`;
}

/** "mid-November to mid-December"; a period ending on a month boundary reads as the end of the month before. */
export function periodLabel([from, to]: Period): string {
  const end = to - Math.floor(to) < 0.05 && to > from ? `end of ${MONTHS[(Math.round(to) + 11) % 12]}` : posLabel(to);
  return `${posLabel(from)} to ${end}`;
}

/** Days from month position `a` forward to `b`, wrapping into next year. */
export function daysBetween(a: number, b: number): number {
  return Math.round((((b - a) % 12) + 12) % 12 * 30.44);
}

export function inPeriod(p: number, [from, to]: Period): boolean {
  return from <= to ? p >= from && p < to : p >= from || p < to;
}

/**
 * The growing season the advice reads: from the sowing period open now (or
 * the next one) to the end of the first harvest period after it. Returns the
 * calendar months it spans, at most twelve.
 */
export function growingSeason(crop: CalendarCrop, today = monthPos()) {
  const open = crop.sow.find((s) => inPeriod(today, s));
  const next = open ?? [...crop.sow].sort((a, b) => daysBetween(today, a[0]) - daysBetween(today, b[0]))[0];
  const mid = (next[0] + next[1]) / 2;
  // The harvest that closes this sowing is the first to END at least three
  // months on — a crop needs time to grow. (Dry pea sown in October is not
  // the one lifted in November.)
  const MIN_SEASON = 3;
  const after = (h: Period) => (((h[1] - (mid + MIN_SEASON)) % 12) + 12) % 12;
  const harvest = [...crop.harvest].sort((a, b) => after(a) - after(b))[0];
  let end = mid + MIN_SEASON + after(harvest);
  if (end - next[0] > 12) end = next[0] + 12;
  const months: number[] = [];
  for (let m = Math.floor(next[0]); m < Math.ceil(end); m++) months.push(((m % 12) + 12) % 12);
  return { sow: next, harvest, months: [...new Set(months)].slice(0, 12), open: !!open };
}
