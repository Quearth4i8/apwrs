/**
 * Copernicus Data Space Ecosystem — Sentinel Hub client.
 *
 * Supplies the two quantities the risk model previously stood in for with
 * weather proxies: NDVI from Sentinel-2 L2A, and land surface temperature
 * from Sentinel-3 SLSTR. Both are real measurements rather than substitutes,
 * which is the whole point of wiring this up.
 *
 * Credentials are read from the environment and never committed:
 *
 *   CDSE_CLIENT_ID=sh-...
 *   CDSE_CLIENT_SECRET=...
 *
 * If either is absent every function here returns null and the caller falls
 * back to the weather-only model. That is deliberate: the app has to keep
 * working for anyone who clones it without a Copernicus account.
 */
import { inflateSync } from "node:zlib";

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process";

export function hasCredentials(): boolean {
  return Boolean(process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET);
}

/* ── OAuth2 ──────────────────────────────────────────────────────────── */

let cached: { token: string; expiresAt: number } | null = null;

/**
 * Client-credentials token, cached in module scope.
 *
 * CDSE tokens live 1800 s. We refresh at 60 s remaining so a request that is
 * already in flight cannot expire mid-call.
 */
async function accessToken(): Promise<string | null> {
  if (!hasCredentials()) return null;
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CDSE_CLIENT_ID!,
    client_secret: process.env.CDSE_CLIENT_SECRET!,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CDSE auth failed: ${res.status}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

/* ── Minimal GeoTIFF reader ──────────────────────────────────────────── */

/**
 * Sentinel Hub returns a stripped, Deflate-compressed, big-endian float32
 * GeoTIFF. That is a narrow enough shape to read directly with node:zlib,
 * which avoids pulling in a full GeoTIFF dependency for one call site.
 * Anything outside that shape throws rather than being guessed at.
 */
function readFloatTiff(buf: Buffer): { width: number; height: number; bands: number; data: Float32Array } {
  const le = buf.toString("ascii", 0, 2) === "II";
  const u16 = (o: number) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));

  const magic = u16(2);
  if (magic !== 42) throw new Error(`not a classic TIFF (magic ${magic})`);

  const ifd = u32(4);
  const count = u16(ifd);
  const SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8 };
  const tags = new Map<number, number[]>();

  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    const tag = u16(e);
    const type = u16(e + 2);
    const n = u32(e + 4);
    if (type !== 3 && type !== 4) continue; // only SHORT/LONG are needed here
    const total = n * SIZE[type];
    const at = total <= 4 ? e + 8 : u32(e + 8);
    const out: number[] = [];
    for (let k = 0; k < n; k++) out.push(type === 3 ? u16(at + k * 2) : u32(at + k * 4));
    tags.set(tag, out);
  }

  const width = tags.get(256)?.[0];
  const height = tags.get(257)?.[0];
  const bands = tags.get(277)?.[0] ?? 1;
  const bits = tags.get(258)?.[0] ?? 0;
  const format = tags.get(339)?.[0] ?? 0;
  const compression = tags.get(259)?.[0] ?? 1;
  const offsets = tags.get(273);
  const counts = tags.get(279);

  if (!width || !height || !offsets || !counts) throw new Error("TIFF missing required tags");
  if (bits !== 32 || format !== 3) throw new Error(`expected float32, got ${bits}-bit format ${format}`);
  if (tags.has(324)) throw new Error("tiled TIFF is not supported");

  const strips = offsets.map((off, i) => {
    const raw = buf.subarray(off, off + counts[i]);
    // 8 = Adobe Deflate, 32946 = Deflate; 1 = none.
    if (compression === 8 || compression === 32946) return inflateSync(raw);
    if (compression === 1) return raw;
    throw new Error(`unsupported TIFF compression ${compression}`);
  });

  const all = Buffer.concat(strips);
  const data = new Float32Array(width * height * bands);
  for (let i = 0; i < data.length; i++) {
    data[i] = le ? all.readFloatLE(i * 4) : all.readFloatBE(i * 4);
  }
  return { width, height, bands, data };
}

/* ── Index requests ──────────────────────────────────────────────────── */

export interface Region {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * SCL classes counted as usable land.
 *
 * 4 vegetation, 5 not-vegetated, 7 unclassified. Water (6) is excluded along
 * with cloud, shadow, snow and saturated pixels — sea pixels would otherwise
 * drag the vegetation signal down exactly as they poisoned the soil-moisture
 * factor before it was land-masked.
 */
const USABLE_SCL = "s.SCL==4||s.SCL==5||s.SCL==7";

const NDVI_EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:['B04','B08','SCL','dataMask']}],output:{bands:2,sampleType:'FLOAT32'}}}
function evaluatePixel(s){
  var land = ${USABLE_SCL};
  var den = s.B08 + s.B04;
  var ok = s.dataMask == 1 && land && den > 0;
  return [ok ? (s.B08 - s.B04) / den : 0, ok ? 1 : 0];
}`;

/**
 * Sentinel-2 imposes a 1500 m/pixel ceiling, so the raster is requested finer
 * than the risk grid and averaged down. That is better than sampling one
 * point per cell anyway: each cell becomes a block statistic over ~16 pixels.
 */
const OVERSAMPLE = 4;

/** A factor field on the risk grid, row 0 = southern edge. */
export interface IndexField {
  values: (number | null)[];
  rows: number;
  cols: number;
  /** Share of cells that carried usable pixels. */
  coverage: number;
  source: string;
}

/**
 * Mean NDVI per risk-grid cell over the given window.
 *
 * Returns null when no credentials are configured, so callers degrade to the
 * weather-only model rather than failing.
 */
export async function fetchNdviGrid(
  region: Region,
  rows: number,
  cols: number,
  days = 30,
): Promise<IndexField | null> {
  const token = await accessToken();
  if (!token) return null;

  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const width = cols * OVERSAMPLE;
  const height = rows * OVERSAMPLE;

  const res = await fetch(PROCESS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: [region.minLon, region.minLat, region.maxLon, region.maxLat],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: { from: from.toISOString(), to: to.toISOString() },
              mosaickingOrder: "leastCC",
            },
          },
        ],
      },
      output: {
        width,
        height,
        responses: [{ identifier: "default", format: { type: "image/tiff" } }],
      },
      evalscript: NDVI_EVALSCRIPT,
    }),
    next: { revalidate: 21_600 }, // six hours; Sentinel-2 revisits in ~5 days
  });

  if (!res.ok) {
    throw new Error(`CDSE process failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }

  const tiff = readFloatTiff(Buffer.from(await res.arrayBuffer()));
  return aggregate(tiff, rows, cols, `Sentinel-2 L2A NDVI · ${days} d least-cloud mosaic · CDSE`);
}

/**
 * Collapses the oversampled raster onto the risk grid.
 *
 * The TIFF's first row is the northern edge; the risk grid's first row is the
 * southern one, so rows are flipped here. Cells are summarised by the mean of
 * their valid pixels, and NDVI is clamped to [-1, 1] because single saturated
 * pixels come back at exactly ±1.
 */
function aggregate(
  tiff: { width: number; height: number; bands: number; data: Float32Array },
  rows: number,
  cols: number,
  source: string,
): IndexField {
  const { width, height, bands, data } = tiff;
  const blockX = Math.floor(width / cols);
  const blockY = Math.floor(height / rows);
  const values: (number | null)[] = new Array(rows * cols).fill(null);
  let covered = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Flip north-up raster rows onto the south-up grid.
      const y0 = (rows - 1 - r) * blockY;
      const x0 = c * blockX;
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y0 + blockY && y < height; y++) {
        for (let x = x0; x < x0 + blockX && x < width; x++) {
          const i = (y * width + x) * bands;
          const valid = bands > 1 ? data[i + 1] === 1 : Number.isFinite(data[i]);
          if (!valid) continue;
          const v = data[i];
          if (!Number.isFinite(v)) continue;
          sum += Math.max(-1, Math.min(1, v));
          n++;
        }
      }
      if (n > 0) {
        values[r * cols + c] = +(sum / n).toFixed(4);
        covered++;
      }
    }
  }

  return { values, rows, cols, coverage: +(covered / (rows * cols)).toFixed(3), source };
}
