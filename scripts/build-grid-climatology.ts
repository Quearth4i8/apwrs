/**
 * Fits SPEI-3 and SPI-3 distributions for every cell of the risk grid, from
 * 30 years of Open-Meteo archive.
 *
 *   npm run data:grid
 *
 * Why this is a build step and not a request: a standardised index needs a
 * distribution per calendar month per location, and that means 30 years of
 * history for each one. Fetching that live would be ~80 MB and a quarter of
 * an hour. So the distributions are fitted once here and committed; at
 * request time /api/grid only has to accumulate the last three months and map
 * them through the stored fits.
 *
 * Resolution: the archive snaps to roughly 0.07 deg (~7.8 km, ERA5-Land).
 * The 20x16 risk grid is finer than that in latitude, so fitting all 320
 * cells would produce duplicate fits and waste two thirds of the requests.
 * The climatology is fitted on an 8x10 grid that matches the model instead,
 * and each risk cell takes the nearest fit — which is exact rather than an
 * approximation, since the finer cells carry identical data anyway.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  accumulate,
  fitSpeiByMonth,
  fitSpiByMonth,
  type MonthlyPoint,
  type SpeiFits,
  type SpiFits,
} from "../lib/drought";

const OUT = "lib/generated";

/** Must match REGION in app/api/grid/route.ts. */
const REGION = { minLat: 36.85, maxLat: 37.42, minLon: 9.05, maxLon: 10.05 };

/**
 * Climatology grid, at the archive's own resolution.
 *
 * 8 x 10 over this region is ~9 km spacing, which is what ERA5-Land actually
 * resolves. Asking for more cells would return duplicate history and spend
 * request budget for no information.
 */
const ROWS = 8;
const COLS = 10;

const FROM = "1996-01-01";
const TO = "2025-12-31";

/**
 * Locations per request, and the pause between them.
 *
 * Open-Meteo weights a call by how much data it returns, and 30 years times
 * several locations is heavy: eight locations at once tripped the per-minute
 * limit immediately. Five with a long pause stays inside it.
 */
const BATCH = 5;
const PAUSE_MS = 45_000;

interface ArchivePoint {
  latitude: number;
  longitude: number;
  daily?: {
    time: string[];
    precipitation_sum: (number | null)[];
    et0_fao_evapotranspiration: (number | null)[];
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchBatch(lats: number[], lons: number[]): Promise<ArchivePoint[]> {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${lats.join(",")}&longitude=${lons.join(",")}` +
    `&start_date=${FROM}&end_date=${TO}` +
    "&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=UTC";

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = (await res.json()) as ArchivePoint[] | ArchivePoint;
      return Array.isArray(body) ? body : [body];
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 30_000 * 2 ** attempt;
      console.log(`    ${res.status}, retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`archive ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error("archive: giving up after 5 attempts");
}

/** Daily archive series to monthly totals of precipitation and water balance. */
function monthlySeries(p: ArchivePoint): { precip: MonthlyPoint[]; balance: MonthlyPoint[] } {
  const d = p.daily;
  if (!d) return { precip: [], balance: [] };

  const buckets = new Map<string, { y: number; m: number; p: number; e: number }>();
  d.time.forEach((t, i) => {
    const y = Number(t.slice(0, 4));
    const m = Number(t.slice(5, 7));
    const key = `${y}-${m}`;
    const b = buckets.get(key) ?? { y, m, p: 0, e: 0 };
    b.p += d.precipitation_sum?.[i] ?? 0;
    b.e += d.et0_fao_evapotranspiration?.[i] ?? 0;
    buckets.set(key, b);
  });

  const rows = [...buckets.values()].sort((a, b) => a.y - b.y || a.m - b.m);
  return {
    precip: rows.map((r) => ({ year: r.y, month: r.m, value: r.p })),
    balance: rows.map((r) => ({ year: r.y, month: r.m, value: r.p - r.e })),
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const latStep = (REGION.maxLat - REGION.minLat) / (ROWS - 1);
  const lonStep = (REGION.maxLon - REGION.minLon) / (COLS - 1);
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      lats.push(+(REGION.minLat + r * latStep).toFixed(4));
      lons.push(+(REGION.minLon + c * lonStep).toFixed(4));
    }
  }

  const total = lats.length;
  console.log(`  fitting ${ROWS} x ${COLS} = ${total} cells, ${FROM} to ${TO}`);

  const spei: (SpeiFits | null)[] = new Array(total).fill(null);
  const spi: (SpiFits | null)[] = new Array(total).fill(null);
  let months = 0;

  // Resume from whatever a previous run managed to fit.
  //
  // Open-Meteo's archive is rate limited by data volume, and thirty years
  // times eighty cells is enough to exhaust a day's budget. A run that dies
  // partway should not throw away the cells it did get, so progress is
  // written after every batch and reloaded here.
  const path = `${OUT}/grid-climatology.json`;
  if (existsSync(path)) {
    try {
      const prev = JSON.parse(readFileSync(path, "utf8")) as {
        rows?: number;
        cols?: number;
        monthsFitted?: number;
        spei?: (SpeiFits | null)[];
        spi?: (SpiFits | null)[];
      };
      if (prev.rows === ROWS && prev.cols === COLS && Array.isArray(prev.spei)) {
        prev.spei.forEach((f, i) => {
          if (f && i < total) spei[i] = f;
        });
        prev.spi?.forEach((f, i) => {
          if (f && i < total) spi[i] = f;
        });
        months = prev.monthsFitted ?? 0;
        const have = spei.filter((f) => f).length;
        if (have) console.log(`  resuming: ${have}/${total} cells already fitted`);
      }
    } catch {
      // A corrupt or stub file just means starting over.
    }
  }

  const save = () => {
    writeFileSync(
      path,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: `Open-Meteo archive (ERA5-Land derived), ${FROM} to ${TO}`,
        region: REGION,
        rows: ROWS,
        cols: COLS,
        monthsFitted: months,
        spei,
        spi,
      }),
    );
  };

  for (let i = 0; i < total; i += BATCH) {
    // Skip a batch only if every cell in it is already fitted.
    if (spei.slice(i, i + BATCH).every((f) => f)) continue;

    const bl = lats.slice(i, i + BATCH);
    const bo = lons.slice(i, i + BATCH);
    const t0 = Date.now();
    const points = await fetchBatch(bl, bo);

    points.forEach((p, k) => {
      const { precip, balance } = monthlySeries(p);
      if (!balance.length) return;
      months = balance.length;
      spei[i + k] = fitSpeiByMonth(accumulate(balance, 3));
      spi[i + k] = fitSpiByMonth(accumulate(precip, 3));
    });

    save();
    const done = Math.min(i + BATCH, total);
    console.log(
      `    ${String(done).padStart(3)}/${total}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    );
    if (done < total) await sleep(PAUSE_MS);
  }

  const fittedSpei = spei.filter((f) => f && f.some((m) => m)).length;
  const fittedSpi = spi.filter((f) => f && f.some((m) => m)).length;

  save();
  const kb = (readFileSync(path, "utf8").length / 1024).toFixed(0);
  console.log(`\n  wrote ${OUT}/grid-climatology.json  (${kb} KB)`);
  console.log(`  cells with SPEI fits: ${fittedSpei}/${total}   SPI: ${fittedSpi}/${total}`);
  console.log(`  ${months} months per cell`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
