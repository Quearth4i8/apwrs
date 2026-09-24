/**
 * Gridded SPEI-3 and SPI-3 for the live risk surface.
 *
 * The distributions are fitted once at build time by
 * scripts/build-grid-climatology.ts, from 30 years of Open-Meteo archive.
 * Here we only accumulate the three most recent complete calendar months and
 * map them through those fits — the same arithmetic computeSpei/computeSpi
 * do in one pass over a station series, split in two so the expensive half
 * does not run per request.
 *
 * Calendar months, not a rolling 90-day window: the fits were built on
 * three-month calendar accumulations, so an index has to be evaluated against
 * the distribution for the month it actually ends in. Pairing a rolling
 * window with a calendar-month fit would compare unlike things.
 */
import { speiFromFit, spiFromFit, type SpeiFits, type SpiFits } from "@/lib/drought";
import climatology from "@/lib/generated/grid-climatology.json";

interface Climatology {
  generatedAt: string | null;
  source: string | null;
  region: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  rows: number;
  cols: number;
  monthsFitted: number;
  spei: (SpeiFits | null)[];
  spi: (SpiFits | null)[];
}

const CLIM = climatology as unknown as Climatology;

/**
 * Whether any distributions were actually fitted.
 *
 * The repo ships a stub so the import always resolves; a clone that has not
 * run `npm run data:grid` therefore has no fits, and the indices are simply
 * absent rather than the route failing. Same graceful path as missing
 * Copernicus credentials.
 */
export const HAS_CLIMATOLOGY =
  Array.isArray(CLIM.spei) && CLIM.spei.some((cell) => cell?.some((m) => m));

export const CLIMATOLOGY_SOURCE = CLIM.source;

/** The three complete calendar months ending most recently. */
export function indexWindow(now = new Date()) {
  // The archive lags a few days, so the current month is never complete.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  end.setUTCDate(0); // last day of the previous month
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    /** Calendar month the three-month accumulation ends in, 1-12. */
    month: end.getUTCMonth() + 1,
    year: end.getUTCFullYear(),
  };
}

/**
 * Nearest climatology cell for a risk-grid position.
 *
 * The climatology is fitted at the archive's own resolution, which is coarser
 * than the risk grid in latitude. Nearest-neighbour is exact rather than an
 * approximation here: the finer risk cells resolve to the same model cell and
 * therefore carry identical history.
 */
function nearestFit(lat: number, lon: number): number {
  const { region, rows, cols } = CLIM;
  const r = Math.round(
    ((lat - region.minLat) / (region.maxLat - region.minLat)) * (rows - 1),
  );
  const c = Math.round(
    ((lon - region.minLon) / (region.maxLon - region.minLon)) * (cols - 1),
  );
  return Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c));
}

export interface GridIndexResult {
  spei3: (number | null)[];
  spi3: (number | null)[];
  window: ReturnType<typeof indexWindow>;
  /** Share of cells that produced a value. */
  coverage: number;
}

interface ArchivePoint {
  latitude: number;
  longitude: number;
  daily?: {
    time: string[];
    precipitation_sum?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
}

/**
 * Accumulates the window for each cell and standardises it.
 *
 * @param lats  risk-grid latitudes, row-major
 * @param lons  risk-grid longitudes, row-major
 */
export async function fetchGridIndices(
  lats: number[],
  lons: number[],
  revalidate: number,
): Promise<GridIndexResult | null> {
  if (!HAS_CLIMATOLOGY) return null;
  const w = indexWindow();
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${lats.join(",")}&longitude=${lons.join(",")}` +
    `&start_date=${w.from}&end_date=${w.to}` +
    "&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=UTC";

  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`archive ${res.status}`);

  const body = (await res.json()) as ArchivePoint[] | ArchivePoint;
  const points = Array.isArray(body) ? body : [body];

  const spei3: (number | null)[] = [];
  const spi3: (number | null)[] = [];
  let covered = 0;

  points.forEach((p, i) => {
    const d = p.daily;
    if (!d) {
      spei3.push(null);
      spi3.push(null);
      return;
    }
    let precip = 0;
    let balance = 0;
    for (let k = 0; k < d.time.length; k++) {
      const rain = d.precipitation_sum?.[k] ?? 0;
      const et0 = d.et0_fao_evapotranspiration?.[k] ?? 0;
      precip += rain;
      balance += rain - et0;
    }

    const cell = nearestFit(lats[i], lons[i]);
    const speiFit = CLIM.spei[cell]?.[w.month - 1] ?? null;
    const spiFit = CLIM.spi[cell]?.[w.month - 1] ?? null;

    const a = speiFromFit(balance, speiFit);
    const b = spiFromFit(precip, spiFit);
    spei3.push(a == null ? null : +a.toFixed(3));
    spi3.push(b == null ? null : +b.toFixed(3));
    if (a != null || b != null) covered++;
  });

  return {
    spei3,
    spi3,
    window: w,
    coverage: +(covered / Math.max(1, points.length)).toFixed(3),
  };
}
