/**
 * SmartFarm (my.smartfarm.com.tn) client for the capacitive soil probe.
 *
 * The probe reports soil moisture at three depths (20, 40 and 60 cm) and a
 * soil temperature, roughly once a day. SmartFarm calibrates each channel
 * from the raw 12-bit ADC reading (`niv1..3`) between a dry point (4095) and
 * a wet point (~1500) and returns the result as a percentage (`mv1..3`).
 *
 * Credentials are read from the environment and never committed:
 *
 *   SMARTFARM_EMAIL=...
 *   SMARTFARM_UID=...            user id from the SmartFarm login payload
 *   SMARTFARM_REFRESH_TOKEN=...  long-lived; access tokens are minted from it
 *   SMARTFARM_SENSOR=88:57:21:D2:1C:08
 *
 * If any is absent every function here returns null and the page says so.
 */

const API = "https://my.smartfarm.com.tn/api";

/**
 * An environment value as pasted into a hosting dashboard: trimmed, with
 * surrounding quotes removed, and a pasted `{"token":"…"}` object unwrapped.
 * Any of those reaching SmartFarm comes back as a bare "Invalid token".
 */
function env(name: string): string {
  let v = (process.env[name] ?? "").trim();
  if (v.startsWith("{")) {
    try {
      const o = JSON.parse(v) as { token?: string; refreshToken?: string };
      v = o.refreshToken ?? o.token ?? v;
    } catch {
      /* not JSON; use as is */
    }
  }
  return v.replace(/^(["'])(.*)\1$/, "$2").trim();
}

export function hasCredentials(): boolean {
  return Boolean(
    env("SMARTFARM_EMAIL") && env("SMARTFARM_UID") && env("SMARTFARM_REFRESH_TOKEN") && env("SMARTFARM_SENSOR"),
  );
}

/* ── Auth ────────────────────────────────────────────────────────────── */

let cached: { token: string; expiresAt: number } | null = null;

/** A JWT's payload, read without verifying it; null if it isn't one. */
function jwtPayload(token: string): { email?: string; id?: string; iat?: number; exp?: number } | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Expiry of a JWT in ms, read from its payload without verifying it. */
function jwtExpiry(token: string): number {
  const exp = jwtPayload(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : 0;
}

/**
 * Why SmartFarm would reject these credentials, worked out locally. The
 * refresh token carries the email and user id it was issued to, and its
 * lifetime, so a mismatch can be named without exposing any secret. SmartFarm
 * itself answers every one of these with the same "Invalid token".
 */
function credentialProblem(email: string, uid: string, refresh: string): string | null {
  const p = jwtPayload(refresh);
  if (!p) return "SMARTFARM_REFRESH_TOKEN is not a token (check it was pasted whole)";
  if (p.exp && p.iat && p.exp - p.iat <= 2 * 86_400)
    return "SMARTFARM_REFRESH_TOKEN holds the short-lived access token, not the refresh token";
  if (p.exp && p.exp * 1000 < Date.now()) return "SMARTFARM_REFRESH_TOKEN has expired; log in to SmartFarm for a new one";
  if (p.email && p.email !== email) return "SMARTFARM_EMAIL does not match the refresh token (it is case-sensitive)";
  if (p.id && p.id !== uid) return "SMARTFARM_UID does not match the refresh token";
  return null;
}

/**
 * Access token, cached in module scope. SmartFarm's own web app gets one
 * from `POST /refresh` with the user's email, role, id and refresh token;
 * they live 24 h, and we renew at 5 min remaining.
 */
async function accessToken(force = false): Promise<string> {
  if (!force && cached && Date.now() < cached.expiresAt - 300_000) return cached.token;

  const email = env("SMARTFARM_EMAIL");
  const uid = env("SMARTFARM_UID");
  const refreshToken = env("SMARTFARM_REFRESH_TOKEN");
  const problem = credentialProblem(email, uid, refreshToken);
  if (problem) throw new Error(`SmartFarm credentials: ${problem}`);

  const res = await fetch(`${API}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role: "ROLE_USER", uid, refreshToken }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { type?: string; message?: string; token?: string } | null;
  if (!res.ok || !json?.token) {
    throw new Error(`SmartFarm auth failed: ${res.status}${json?.message ? ` (${json.message})` : ""}`);
  }
  cached = { token: json.token, expiresAt: jwtExpiry(json.token) };
  return cached.token;
}

/** GET against the SmartFarm API, retrying once with a fresh token on 401/403. */
async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await accessToken(attempt > 0);
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if ((res.status === 401 || res.status === 403) && attempt === 0) continue;
    if (!res.ok) throw new Error(`SmartFarm ${path.split("?")[0]}: ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error("SmartFarm: unauthorised after token refresh");
}

/* ── Sensor ──────────────────────────────────────────────────────────── */

interface RawSensor {
  code: string;
  created_at: string;
  etat: string | null;
  mv1: number | null;
  mv2: number | null;
  mv3: number | null;
  fields?: { name: string; Latitude: string | null; Longitude: string | null } | null;
}

interface RawReading {
  time: string;
  timestamp_arduino: string | null;
  ts: string | null;
  niv1: string | null;
  niv2: string | null;
  niv3: string | null;
  mv1: number | null;
  mv2: number | null;
  mv3: number | null;
}

interface RawHistory {
  history?: RawReading[];
  totalPages?: number;
}

export interface SoilReading {
  /** ISO timestamp of the measurement. */
  time: string;
  /** Volumetric moisture index, % of the dry→wet calibration span. */
  m20: number | null;
  m40: number | null;
  m60: number | null;
  /** Soil temperature, °C. */
  soilTemp: number | null;
}

export interface SoilProbe {
  code: string;
  field: string | null;
  lat: number | null;
  lon: number | null;
  installed: string;
  /** SmartFarm's own status label for the probe ("optimal", …). */
  status: string | null;
  /** Probe depths in cm, as configured on SmartFarm. */
  depths: [number, number, number];
  readings: SoilReading[];
}

/**
 * A raw ADC value of 4095 is the top of the 12-bit range: the channel reads
 * as open circuit, which is what a probe does in air before it is buried.
 * SmartFarm turns that into 0 %, which would plot as bone-dry soil, so the
 * value is dropped instead. Likewise -127 °C is the temperature sensor's
 * "not connected" code.
 */
function moisture(pct: number | null, raw: string | null): number | null {
  if (pct == null || Number(raw) >= 4095) return null;
  return pct;
}

function temperature(ts: string | null): number | null {
  const t = ts == null ? NaN : Number(ts);
  return Number.isFinite(t) && t > -100 ? t : null;
}

/**
 * The probe's clock runs on Tunisian wall time (UTC+1, no DST), but SmartFarm
 * stores `timestamp_arduino` as if it were UTC. Read as-is, a 09:00 reading
 * displays as 10:00 once converted to Africa/Tunis, so the offset is taken
 * back out here.
 */
const PROBE_UTC_OFFSET_MS = 3_600_000;

function probeTime(stamp: string): string | null {
  const wall = Date.parse(stamp.replace(/(Z|[+-]\d{2}:?\d{2})$/, "") + "Z");
  return Number.isFinite(wall) ? new Date(wall - PROBE_UTC_OFFSET_MS).toISOString() : null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** The configured probe and its readings over the last `days` days, oldest first. */
export async function fetchSoilProbe(days: number): Promise<SoilProbe | null> {
  if (!hasCredentials()) return null;
  const code = env("SMARTFARM_SENSOR");

  const sensors = await get<RawSensor[]>("/sensor/sensors");
  const sensor = sensors.find((s) => s.code === code);
  if (!sensor) throw new Error(`SmartFarm: sensor ${code} not on this account`);

  const end = new Date(Date.now() + 86_400_000); // tomorrow, so no time-zone edge drops today
  const start = new Date(Date.now() - days * 86_400_000);
  const base = `/sensor/sensor-history/${encodeURIComponent(code)}/${day(start)}/${day(end)}`;

  const raw: RawReading[] = [];
  for (let page = 0, pages = 1; page < pages && page < 20; page++) {
    const body = await get<RawHistory>(`${base}?pageNum=${page}&limit=500`);
    raw.push(...(body.history ?? []));
    pages = body.totalPages ?? 1;
  }

  const readings = raw
    .map((r) => ({
      time: (r.timestamp_arduino && r.timestamp_arduino !== "null" && probeTime(r.timestamp_arduino)) || r.time,
      m20: moisture(r.mv1, r.niv1),
      m40: moisture(r.mv2, r.niv2),
      m60: moisture(r.mv3, r.niv3),
      soilTemp: temperature(r.ts),
    }))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  const lat = Number(sensor.fields?.Latitude);
  const lon = Number(sensor.fields?.Longitude);
  return {
    code,
    field: sensor.fields?.name ?? null,
    lat: Number.isFinite(lat) && sensor.fields?.Latitude ? lat : null,
    lon: Number.isFinite(lon) && sensor.fields?.Longitude ? lon : null,
    installed: sensor.created_at,
    status: sensor.etat,
    depths: [sensor.mv1 ?? 20, sensor.mv2 ?? 40, sensor.mv3 ?? 60],
    readings,
  };
}
