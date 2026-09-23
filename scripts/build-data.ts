/**
 * ETL: the two station workbooks in `formlas and data/` become the app's
 * historical backbone in lib/generated/.
 *
 *   npm run data:build
 *
 * Output is committed, so a normal install/build never needs to run this.
 * Everything here is derived — nothing is invented. Where a quantity is
 * modelled rather than measured (the soil water balance), it says so.
 */
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { accumulate, computeSpei, computeSpi, type MonthlyPoint } from "../lib/drought";

const SRC = "formlas and data";
const OUT = "lib/generated";

/* ── Station definitions ─────────────────────────────────────────────── */

interface StationSource {
  id: string;
  name: string;
  region: string;
  file: string;
  sheet: string;
  lat: number;
  lon: number;
  alt: number;
}

/** Coordinates come from the `coordonnées` sheet of workbook 1. */
const STATIONS: StationSource[] = [
  {
    id: "ST1",
    name: "Ichkeul",
    region: "Bizerte",
    file: "climate_data_station1ver.xlsx",
    sheet: "climate",
    lat: 37.01,
    lon: 9.731,
    alt: 20,
  },
  {
    id: "ST2",
    name: "Mateur",
    region: "Bizerte",
    file: "climate_data_sation2ver1.xlsx",
    sheet: "climate data",
    lat: 37.117,
    lon: 9.318,
    alt: 108,
  },
];

/* ── Sheet reading ───────────────────────────────────────────────────── */

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/�/g, "")
    .trim()
    .toLowerCase();

/** Resolves a column by trying each candidate as a prefix of the header. */
function columnIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => norm(h).startsWith(norm(c)));
    if (i >= 0) return i;
  }
  throw new Error(`column not found: ${candidates.join(" | ")} in [${headers.join(", ")}]`);
}

interface DailyRow {
  date: string;
  year: number;
  month: number;
  precip: number;
  tmean: number;
  tmin: number;
  tmax: number;
  rh: number;
  rs: number;
  wind: number;
  et0: number;
}

async function readDaily(s: StationSource): Promise<DailyRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(`${SRC}/${s.file}`);
  const ws = wb.getWorksheet(s.sheet);
  if (!ws) throw new Error(`sheet '${s.sheet}' missing in ${s.file}`);

  const headers = (ws.getRow(1).values as unknown[]).slice(1).map((v) => String(v ?? ""));
  const col = {
    date: columnIndex(headers, ["date"]),
    precip: columnIndex(headers, ["precipitation"]),
    tmean: columnIndex(headers, ["tmean"]),
    tmin: columnIndex(headers, ["tmin"]),
    tmax: columnIndex(headers, ["tmax"]),
    rh: columnIndex(headers, ["relative_humidity"]),
    rs: columnIndex(headers, ["solar_radiation"]),
    wind: columnIndex(headers, ["wind_speed"]),
    et0: columnIndex(headers, ["et0", "eto"]),
  };

  const rows: DailyRow[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const cells = (row.values as unknown[]).slice(1);
    const raw = cells[col.date];
    const d = raw instanceof Date ? raw : new Date(String(raw));
    if (Number.isNaN(d.getTime())) return;
    const num = (i: number) => {
      const v = cells[i];
      const f = typeof v === "number" ? v : Number((v as { result?: number })?.result ?? v);
      return Number.isFinite(f) ? f : NaN;
    };
    rows.push({
      date: d.toISOString().slice(0, 10),
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      precip: num(col.precip),
      tmean: num(col.tmean),
      tmin: num(col.tmin),
      tmax: num(col.tmax),
      rh: num(col.rh),
      rs: num(col.rs),
      wind: num(col.wind),
      et0: num(col.et0),
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

/* ── Crop coefficients (FAO-56) ──────────────────────────────────────── */

const MONTH_FR: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const CROP_EN: Record<string, string> = {
  "tomate de saison": "Tomato",
  barley: "Barley",
  garlic: "Garlic",
  lentil: "Lentil",
  oats: "Oats",
  "pomme de terre": "Potato",
  feve: "Faba bean",
  olivier: "Olive",
  "ble dur": "Durum wheat",
};

const deaccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/�/g, "").trim().toLowerCase();

interface Crop {
  id: string;
  name: string;
  nameFr: string;
  plantingMonth: number;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  lIni: number;
  lDev: number;
  lMid: number;
  lLate: number;
  totalDays: number;
}

async function readCrops(): Promise<Crop[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(`${SRC}/${STATIONS[0].file}`);
  const ws = wb.getWorksheet("culture");
  if (!ws) throw new Error("sheet 'culture' missing");

  const out: Crop[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const c = (row.values as unknown[]).slice(1);
    const nameFr = String(c[0] ?? "").replace(/�/g, "é").trim();
    if (!nameFr) return;
    const key = deaccent(nameFr);
    const num = (i: number) => Number(c[i]);
    out.push({
      id: key.replace(/\s+/g, "-"),
      name: CROP_EN[key] ?? nameFr,
      nameFr,
      plantingMonth: MONTH_FR[deaccent(String(c[1] ?? ""))] ?? 1,
      kcIni: num(2),
      kcMid: num(3),
      kcEnd: num(4),
      lIni: num(5),
      lDev: num(6),
      lMid: num(7),
      lLate: num(8),
      totalDays: num(9),
    });
  });
  return out;
}

/* ── Derived series ──────────────────────────────────────────────────── */

interface MonthAgg {
  year: number;
  month: number;
  precip: number;
  et0: number;
  balance: number;
  tmean: number;
  tmax: number;
  tmin: number;
  rh: number;
  wind: number;
  rs: number;
  rainDays: number;
}

function monthly(rows: DailyRow[]): MonthAgg[] {
  const buckets = new Map<string, DailyRow[]>();
  for (const r of rows) {
    const k = `${r.year}-${r.month}`;
    const b = buckets.get(k);
    if (b) b.push(r);
    else buckets.set(k, [r]);
  }
  const mean = (a: DailyRow[], f: (r: DailyRow) => number) => a.reduce((s, r) => s + f(r), 0) / a.length;
  const sum = (a: DailyRow[], f: (r: DailyRow) => number) => a.reduce((s, r) => s + f(r), 0);

  return [...buckets.values()]
    .map((b) => ({
      year: b[0].year,
      month: b[0].month,
      precip: +sum(b, (r) => r.precip).toFixed(2),
      et0: +sum(b, (r) => r.et0).toFixed(2),
      balance: +(sum(b, (r) => r.precip) - sum(b, (r) => r.et0)).toFixed(2),
      tmean: +mean(b, (r) => r.tmean).toFixed(2),
      tmax: +mean(b, (r) => r.tmax).toFixed(2),
      tmin: +mean(b, (r) => r.tmin).toFixed(2),
      rh: +mean(b, (r) => r.rh).toFixed(1),
      wind: +mean(b, (r) => r.wind).toFixed(2),
      rs: +mean(b, (r) => r.rs).toFixed(2),
      rainDays: b.filter((r) => r.precip >= 1).length,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

/**
 * FAO-56 root-zone water balance (single coefficient, reference surface).
 * Depletion Dr grows with ET₀ and is drawn down by rain; soil moisture is
 * reported as the fraction of total available water still in the profile.
 * This is a MODEL, not a probe reading — the workbooks carry no soil data.
 */
const FIELD_CAPACITY_MM = 96;
const WILTING_POINT_MM = 38;
const TAW = FIELD_CAPACITY_MM - WILTING_POINT_MM;

function soilWaterBalance(rows: DailyRow[]) {
  let depletion = TAW * 0.5; // start the record half-depleted
  return rows.map((r) => {
    depletion = Math.min(TAW, Math.max(0, depletion + r.et0 - r.precip));
    return {
      date: r.date,
      depletionMm: +depletion.toFixed(2),
      availableFraction: +(1 - depletion / TAW).toFixed(4),
      storageMm: +(WILTING_POINT_MM + (TAW - depletion)).toFixed(2),
    };
  });
}

function toPoints(m: MonthAgg[], f: (a: MonthAgg) => number): MonthlyPoint[] {
  return m.map((a) => ({ year: a.year, month: a.month, value: f(a) }));
}

/* ── Build ───────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(OUT, { recursive: true });
  const stations = [];

  for (const s of STATIONS) {
    const daily = await readDaily(s);
    const months = monthly(daily);

    const balance = toPoints(months, (a) => a.balance);
    const precip = toPoints(months, (a) => a.precip);

    const spei: Record<string, (number | null)[]> = {};
    for (const scale of [1, 3, 6, 12]) {
      spei[scale] = computeSpei(accumulate(balance, scale)).map((p) =>
        p.value == null ? null : +p.value.toFixed(4),
      );
    }
    const spi: Record<string, (number | null)[]> = {};
    for (const scale of [1, 3, 12]) {
      spi[scale] = computeSpi(accumulate(precip, scale)).map((p) =>
        p.value == null ? null : +p.value.toFixed(4),
      );
    }

    // 1996–2025 monthly normals
    const normals = Array.from({ length: 12 }, (_, i) => {
      const m = months.filter((a) => a.month === i + 1);
      const avg = (f: (a: MonthAgg) => number) => +(m.reduce((s, a) => s + f(a), 0) / m.length).toFixed(2);
      return {
        month: i + 1,
        precip: avg((a) => a.precip),
        et0: avg((a) => a.et0),
        tmax: avg((a) => a.tmax),
        tmean: avg((a) => a.tmean),
        rainDays: +(m.reduce((s, a) => s + a.rainDays, 0) / m.length).toFixed(1),
      };
    });

    const years = [...new Set(months.map((a) => a.year))].sort();
    const annual = years.map((y) => {
      const m = months.filter((a) => a.year === y);
      const idx = months.map((a, i) => ({ a, i })).filter(({ a }) => a.year === y);
      const s3 = idx.map(({ i }) => spei[3][i]).filter((v): v is number => v != null);
      return {
        year: y,
        precip: +m.reduce((s, a) => s + a.precip, 0).toFixed(1),
        et0: +m.reduce((s, a) => s + a.et0, 0).toFixed(1),
        balance: +m.reduce((s, a) => s + a.balance, 0).toFixed(1),
        tmax: +(m.reduce((s, a) => s + a.tmax, 0) / m.length).toFixed(2),
        minSpei3: s3.length ? +Math.min(...s3).toFixed(2) : null,
        meanSpei3: s3.length ? +(s3.reduce((x, y2) => x + y2, 0) / s3.length).toFixed(2) : null,
        monthsInDrought: s3.filter((v) => v <= -1).length,
      };
    });

    const swb = soilWaterBalance(daily);
    const recentFrom = daily.length - 1095; // three years of daily detail
    const recent = daily.slice(Math.max(0, recentFrom)).map((r, i, arr) => {
      const w = swb[swb.length - arr.length + i];
      return {
        date: r.date,
        precip: +r.precip.toFixed(2),
        tmax: +r.tmax.toFixed(1),
        tmin: +r.tmin.toFixed(1),
        tmean: +r.tmean.toFixed(1),
        et0: +r.et0.toFixed(2),
        rh: +r.rh.toFixed(1),
        wind: +r.wind.toFixed(2),
        soilStorageMm: w.storageMm,
        soilFraction: w.availableFraction,
      };
    });

    stations.push({
      id: s.id,
      name: s.name,
      region: s.region,
      lat: s.lat,
      lon: s.lon,
      alt: s.alt,
      coverage: { from: daily[0].date, to: daily[daily.length - 1].date, days: daily.length, years: years.length },
      months: months.map((a) => ({ y: a.year, m: a.month, p: a.precip, e: a.et0, b: a.balance, tx: a.tmax, tm: a.tmean, rd: a.rainDays })),
      spei,
      spi,
      normals,
      annual,
      recent,
    });

    const last = spei[3].filter((v): v is number => v != null).at(-1);
    console.log(
      `  ${s.id} ${s.name.padEnd(8)} ${daily.length} days, ${years.length}y  ` +
        `SPEI-3 latest ${last?.toFixed(2)}  driest year ${annual.reduce((a, b) => (a.balance < b.balance ? a : b)).year}`,
    );
  }

  const crops = await readCrops();

  const soil = { fieldCapacityMm: FIELD_CAPACITY_MM, wiltingPointMm: WILTING_POINT_MM, tawMm: TAW };
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "formlas and data/ — 30-year daily station records, ET0 by FAO-56 Penman-Monteith",
    soilModel: soil,
    stations,
    crops,
  };

  writeFileSync(`${OUT}/climate.json`, JSON.stringify(payload));
  const kb = (JSON.stringify(payload).length / 1024).toFixed(0);
  console.log(`\n  wrote ${OUT}/climate.json  (${kb} KB)`);
  console.log(`  crops: ${crops.map((c) => c.name).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
