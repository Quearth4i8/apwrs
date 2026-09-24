/**
 * Verifies lib/eto.ts — the Chapter 3 chain — equation by equation.
 *
 *   npm run data:verify:eto
 *
 * Two independent kinds of evidence:
 *
 *  1. Worked examples published in FAO Irrigation and Drainage Paper 56
 *     (Allen et al., 1998), which is the source Chapter 3 is drawn from.
 *     Each equation is checked on its own, so a compensating pair of errors
 *     cannot hide inside the final ET₀.
 *
 *  2. The two station workbooks: 21,914 days whose ET₀ was computed
 *     independently by their author. Agreement there should sit at the
 *     rounding floor of their stored column, not merely "close".
 */
import ExcelJS from "exceljs";
import {
  atmosphericPressure,
  psychrometricConstant,
  saturationVapourPressure,
  meanSaturationVapourPressure,
  slopeSaturationVapourPressure,
  vapourPressureFromRhMaxMin,
  extraterrestrialRadiation,
  sunsetHourAngle,
  daylightHours,
  solarDeclination,
  toRadians,
  netLongwaveRadiation,
  netShortwaveRadiation,
  windSpeedAt2m,
  computeEto,
  dayOfYear,
} from "../lib/eto";

let failures = 0;

function check(label: string, got: number, want: number, tol: number) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(46)} got ${got.toFixed(4).padStart(10)}   want ${want}`,
  );
}

console.log("\nFAO-56 worked examples\n");

// Example 2 — atmospheric pressure and psychrometric constant at 1800 m.
check("Eq 3.1  P at z=1800 m [kPa]", atmosphericPressure(1800), 81.8, 0.05);
check("Eq 3.2  gamma at z=1800 m [kPa/°C]", psychrometricConstant(atmosphericPressure(1800)), 0.054, 5e-4);

// Example 3 — saturation vapour pressure, Tmin 15 °C / Tmax 24.5 °C.
check("Eq 3.4  e°(24.5 °C) [kPa]", saturationVapourPressure(24.5), 3.075, 1e-3);
check("Eq 3.4  e°(15.0 °C) [kPa]", saturationVapourPressure(15), 1.705, 1e-3);
check("Eq 3.5  es [kPa]", meanSaturationVapourPressure(15, 24.5), 2.39, 1e-3);

// Annex 2, Table 2.4 — slope of the vapour pressure curve at 30 °C.
check("Eq 3.6  slope at 30 °C [kPa/°C]", slopeSaturationVapourPressure(30), 0.243, 5e-4);

// Example 5 — ea from RHmax/RHmin, Tmin 18 / Tmax 25, RHmax 82 / RHmin 54.
check(
  "Eq 3.10 ea from RHmax/RHmin [kPa]",
  vapourPressureFromRhMaxMin(18, 25, 82, 54),
  1.70,
  5e-3,
);

// Example 8 — extraterrestrial radiation, 3 September at 20 °S.
const J = 246;
check("Eq 3.14 Ra at 20°S, 3 Sep [MJ/m²/d]", extraterrestrialRadiation(-20, J), 32.2, 0.05);
check("Eq 3.17 solar declination [rad]", solarDeclination(J), 0.120, 1e-3);
const ws = sunsetHourAngle(toRadians(-20), solarDeclination(J));
check("Eq 3.18 sunset hour angle [rad]", ws, 1.527, 1e-3);
check("Eq 3.19 daylight hours N [h]", daylightHours(ws), 11.66, 0.01);

// Example 10 — net longwave radiation, Rio de Janeiro, May.
check(
  "Eq 3.24 Rnl [MJ/m²/d]",
  netLongwaveRadiation(19.1, 25.1, 2.1, 14.5, 18.8),
  3.5,
  0.05,
);

// Example 11 — net shortwave from Rs = 14.5.
// FAO prints 11.1; (1 - 0.23) x 14.5 is exactly 11.165, so allow their 1-dp rounding.
check("Eq 3.23 Rns [MJ/m²/d]", netShortwaveRadiation(14.5), 11.1, 0.07);

// Example 14 — wind measured at 10 m, 3.2 m/s.
// FAO prints 2.4 to 1 dp; the exact value is 2.3934.
check("Eq 3.27 u2 from 10 m [m/s]", windSpeedAt2m(3.2, 10), 2.4, 0.01);

/* ── Station cross-check ─────────────────────────────────────────────── */

const SRC = "formlas and data";
const STATIONS = [
  { id: "ST1", name: "Ichkeul", file: "climate_data_station1ver.xlsx", sheet: "climate", lat: 37.01, alt: 20 },
  { id: "ST2", name: "Mateur", file: "climate_data_sation2ver1.xlsx", sheet: "climate data", lat: 37.117, alt: 108 },
];

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/�/g, "")
    .trim()
    .toLowerCase();

function columnIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => norm(h).startsWith(c));
    if (i >= 0) return i;
  }
  throw new Error(`no column for ${candidates.join("/")}`);
}

/** One decimal place of storage gives sqrt(0.1²/12) of quantisation noise. */
const ROUNDING_FLOOR = Math.sqrt(0.1 ** 2 / 12);

async function crossCheck() {
  console.log(`\nStation cross-check — workbook ET₀ column vs the Chapter 3 chain`);
  console.log(`  (their column is stored to 1 dp; rounding alone gives RMSE ${ROUNDING_FLOOR.toFixed(4)})\n`);

  for (const s of STATIONS) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(`${SRC}/${s.file}`);
    const ws = wb.getWorksheet(s.sheet)!;
    const headers = (ws.getRow(1).values as unknown[]).slice(1).map((v) => String(v ?? ""));
    const col = {
      date: columnIndex(headers, ["date"]),
      tmin: columnIndex(headers, ["tmin"]),
      tmax: columnIndex(headers, ["tmax"]),
      rh: columnIndex(headers, ["relative_humidity"]),
      rs: columnIndex(headers, ["solar_radiation"]),
      wind: columnIndex(headers, ["wind_speed"]),
      et0: columnIndex(headers, ["et0", "eto"]),
    };

    const diffs: number[] = [];
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
      const { eto } = computeEto(
        {
          dayOfYear: dayOfYear(date),
          tminC: num(col.tmin),
          tmaxC: num(col.tmax),
          rhMean: num(col.rh),
          solarRadiation: num(col.rs),
          wind: num(col.wind),
        },
        { latitudeDeg: s.lat, elevationM: s.alt },
      );
      const theirs = num(col.et0);
      if (Number.isFinite(eto) && Number.isFinite(theirs)) diffs.push(eto - theirs);
    });

    const n = diffs.length;
    const bias = diffs.reduce((a, b) => a + b, 0) / n;
    const rmse = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / n);
    const within = diffs.filter((d) => Math.abs(d) <= 0.05).length;
    const ok = rmse <= ROUNDING_FLOOR * 1.15 && Math.abs(bias) <= 0.005;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${s.name.padEnd(8)} n=${n}  bias ${bias >= 0 ? "+" : ""}${bias.toFixed(5)}  ` +
        `RMSE ${rmse.toFixed(4)}  within ±0.05: ${((100 * within) / n).toFixed(1)}%`,
    );
  }
}

crossCheck()
  .then(() => {
    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
