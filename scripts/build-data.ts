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
import { computeEto, dayOfYear } from "../lib/eto";

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
  /** ET₀ computed here from the raw observations, per Chapter 3. */
  et0: number;
  /** The workbook's own ET₀ column, retained only to verify the above. */
  et0Workbook: number;
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
    const date = d.toISOString().slice(0, 10);
    const tmin = num(col.tmin);
    const tmax = num(col.tmax);
    const rh = num(col.rh);
    const rs = num(col.rs);
    const wind = num(col.wind);

    // ET₀ is computed from the raw observations by the Chapter 3 chain, not
    // taken from the workbook's column — that column is stored to one decimal
    // and would bake ±0.05 mm/d into every derived figure. The column is kept
    // alongside so `npm run data:build` can report the agreement.
    const { eto } = computeEto(
      { dayOfYear: dayOfYear(date), tminC: tmin, tmaxC: tmax, rhMean: rh, solarRadiation: rs, wind },
      { latitudeDeg: s.lat, elevationM: s.alt },
    );

    rows.push({
      date,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      precip: num(col.precip),
      tmean: num(col.tmean),
      tmin,
      tmax,
      rh,
      rs,
      wind,
      et0: eto,
      et0Workbook: num(col.et0),
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


/* ── Planting suitability (FAO-56) ───────────────────────────────────── */

/**
 * FAO-56 single crop coefficient curve: flat at Kc_ini through the initial
 * stage, linear to Kc_mid across development, flat through mid-season, then
 * linear to Kc_end through late season.
 */
function kcAt(crop: Crop, dayOfCycle: number): number {
  const { kcIni, kcMid, kcEnd, lIni, lDev, lMid } = crop;
  if (dayOfCycle < lIni) return kcIni;
  if (dayOfCycle < lIni + lDev) return kcIni + ((kcMid - kcIni) * (dayOfCycle - lIni)) / lDev;
  if (dayOfCycle < lIni + lDev + lMid) return kcMid;
  const intoLate = dayOfCycle - (lIni + lDev + lMid);
  return kcMid + ((kcEnd - kcMid) * intoLate) / Math.max(1, crop.lLate);
}

/** Rain needed in the first three weeks for a seedbed to establish. */
const ESTABLISHMENT_MM = 20;
const ESTABLISHMENT_DAYS = 21;

export interface DecadeSuitability {
  /** 0-35: ten-day period starting 1 Jan. */
  decade: number;
  /** Fraction of years the establishment rain threshold was met. */
  establishmentProb: number;
  /** Mean share of the crop's water need covered by rain over the cycle. */
  rainfedCoverage: number;
  /** Mean days above 35 C during mid-season. */
  heatDays: number;
  /** Mean days below 0 C during establishment. */
  frostDays: number;
  /** Mean cycle ETc, mm. */
  etcMm: number;
  /** Mean cycle rainfall, mm. */
  rainMm: number;
  /**
   * Classifies RAINFALL ADEQUACY ONLY. It is not an agronomic verdict: the
   * record carries no base temperature or photoperiod requirement per crop,
   * so warm-season and perennial crops are not judged on the things that
   * actually gate their sowing date. The UI says so, and shows the
   * agronomist's stated planting month alongside.
   */
  water: "reliable" | "marginal" | "irrigation-dependent";
  years: number;
}

/**
 * For every ten-day sowing period, replays all 30 years of daily weather
 * through the crop's own Kc curve. Nothing here is assumed: establishment
 * probability, rainfed coverage and heat exposure are counted from the
 * record.
 */
function plantingSuitability(rows: DailyRow[], crop: Crop): DecadeSuitability[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const dates = rows.map((r) => r.date);
  const firstYear = rows[0].year;
  const lastYear = rows[rows.length - 1].year;

  const out: DecadeSuitability[] = [];

  for (let decade = 0; decade < 36; decade++) {
    const startDoy = decade * 10;
    let estab = 0;
    let years = 0;
    let coverageSum = 0;
    let heatSum = 0;
    let frostSum = 0;
    let etcSum = 0;
    let rainSum = 0;

    for (let y = firstYear; y <= lastYear; y++) {
      const start = new Date(Date.UTC(y, 0, 1));
      start.setUTCDate(start.getUTCDate() + startDoy);

      // The cycle must finish inside the record.
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + crop.totalDays);
      if (end.toISOString().slice(0, 10) > dates[dates.length - 1]) continue;

      let estabRain = 0;
      let cycleRain = 0;
      let cycleEtc = 0;
      let heat = 0;
      let frost = 0;
      let complete = true;

      for (let d = 0; d < crop.totalDays; d++) {
        const day = new Date(start);
        day.setUTCDate(day.getUTCDate() + d);
        const row = byDate.get(day.toISOString().slice(0, 10));
        if (!row) {
          complete = false;
          break;
        }
        if (d < ESTABLISHMENT_DAYS) {
          estabRain += row.precip;
          if (row.tmin < 0) frost++;
        }
        cycleRain += row.precip;
        cycleEtc += kcAt(crop, d) * row.et0;
        const midStart = crop.lIni + crop.lDev;
        const midEnd = midStart + crop.lMid;
        if (d >= midStart && d < midEnd && row.tmax > 35) heat++;
      }
      if (!complete) continue;

      years++;
      if (estabRain >= ESTABLISHMENT_MM) estab++;
      coverageSum += Math.min(1, cycleEtc > 0 ? cycleRain / cycleEtc : 0);
      heatSum += heat;
      frostSum += frost;
      etcSum += cycleEtc;
      rainSum += cycleRain;
    }

    if (!years) continue;

    const establishmentProb = estab / years;
    const rainfedCoverage = coverageSum / years;
    const water: DecadeSuitability["water"] =
      establishmentProb >= 0.6 && rainfedCoverage >= 0.5
        ? "reliable"
        : establishmentProb >= 0.3 || rainfedCoverage >= 0.35
          ? "marginal"
          : "irrigation-dependent";

    out.push({
      decade,
      establishmentProb: +establishmentProb.toFixed(3),
      rainfedCoverage: +rainfedCoverage.toFixed(3),
      heatDays: +(heatSum / years).toFixed(1),
      frostDays: +(frostSum / years).toFixed(2),
      etcMm: +(etcSum / years).toFixed(1),
      rainMm: +(rainSum / years).toFixed(1),
      water,
      years,
    });
  }

  return out;
}

/* ── Build ───────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(OUT, { recursive: true });
  const stations = [];
  const stationDaily = new Map<string, DailyRow[]>();

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
    // Mean ET₀ by day of year across the whole record. 366 numbers per
    // station, which lets the client draw crop water demand at daily
    // resolution instead of stepping by month, and keeps its cycle totals
    // consistent with the replayed planting figures.
    const et0ByDoy: number[] = [];
    {
      const sums = new Array(366).fill(0);
      const counts = new Array(366).fill(0);
      for (const r of daily) {
        const d = new Date(`${r.date}T00:00:00Z`);
        const doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000);
        sums[doy] += r.et0;
        counts[doy] += 1;
      }
      for (let i = 0; i < 366; i++) {
        et0ByDoy.push(counts[i] ? +(sums[i] / counts[i]).toFixed(3) : 0);
      }
      // 29 February appears only in leap years; if it never did, carry the 28th.
      if (!counts[59]) et0ByDoy[59] = et0ByDoy[58];
    }

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
      et0ByDoy,
      annual,
      recent,
    });

    stationDaily.set(s.id, daily);

    // Cross-check the Chapter 3 chain against the workbook's own ET₀ column.
    // The column is stored to one decimal, so pure rounding alone accounts for
    // an RMSE of sqrt(0.1²/12) = 0.0289 mm/d; anything materially above that
    // would mean the two disagree on method, not just on precision.
    const diffs = daily.map((r) => r.et0 - r.et0Workbook);
    const bias = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const rmse = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
    const maxAbs = Math.max(...diffs.map(Math.abs));
    if (rmse > 0.05) {
      throw new Error(
        `${s.id}: computed ET₀ disagrees with the workbook column (RMSE ${rmse.toFixed(4)} mm/d). ` +
          `Expected ~0.029 from 1-decimal rounding alone.`,
      );
    }

    const last = spei[3].filter((v): v is number => v != null).at(-1);
    console.log(
      `  ${s.id} ${s.name.padEnd(8)} ${daily.length} days, ${years.length}y  ` +
        `SPEI-3 latest ${last?.toFixed(2)}  driest year ${annual.reduce((a, b) => (a.balance < b.balance ? a : b)).year}`,
    );
    console.log(
      `       ET₀ ch.3 vs workbook column: bias ${bias >= 0 ? "+" : ""}${bias.toFixed(4)}  ` +
        `RMSE ${rmse.toFixed(4)}  max ${maxAbs.toFixed(3)} mm/d`,
    );
  }

  const crops = await readCrops();

  // Suitability is per station, because it is the local weather that decides.
  const planting = STATIONS.map((s) => ({
    stationId: s.id,
    crops: crops.map((c) => ({
      cropId: c.id,
      decades: plantingSuitability(stationDaily.get(s.id)!, c),
    })),
  }));
  console.log(
    `  planting: ${crops.length} crops x 36 decades x ${STATIONS.length} stations, replayed over 30 years`,
  );

  const soil = { fieldCapacityMm: FIELD_CAPACITY_MM, wiltingPointMm: WILTING_POINT_MM, tawMm: TAW };
  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      "formlas and data/ — 30-year daily station records; ET₀ computed from the raw " +
      "observations by FAO Penman-Monteith (ETo Calculator Reference Manual V3.2, ch. 3)",
    soilModel: soil,
    stations,
    crops,
    planting,
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
