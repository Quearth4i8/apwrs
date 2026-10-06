/**
 * Where farmers' fields are kept.
 *
 * On Vercel the file system is read-only, so fields go to Redis (Upstash,
 * added from the Vercel Marketplace), spoken to over its REST API with plain
 * fetch — no client library. Each field is one entry in a Redis hash,
 * `apwrs:lands`, keyed by its id, so saving one field never rewrites the
 * others and two farmers saving at once cannot overwrite each other.
 *
 * Without Redis credentials (local development) the fields live in
 * data/lands.json instead, as before.
 *
 * Credentials, whichever the integration provides:
 *   KV_REST_API_URL / KV_REST_API_TOKEN               (Vercel's Upstash integration,
 *   STORAGE_REST_API_URL / STORAGE_REST_API_TOKEN      or with its default prefix)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash console)
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Land } from "@/lib/land-geometry";

export interface LandStore {
  all(): Promise<Land[]>;
  get(id: string): Promise<Land | null>;
  put(land: Land): Promise<void>;
  remove(id: string): Promise<void>;
  /** For error messages: which backend failed. */
  kind: "redis" | "file";
}

const HASH = "apwrs:lands";

function redisCredentials() {
  // The Vercel integration names them <prefix>_REST_API_URL / _TOKEN; KV is
  // its classic prefix and STORAGE the dashboard's default.
  const env = process.env;
  const url = env.KV_REST_API_URL ?? env.STORAGE_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.STORAGE_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** One Redis command over Upstash's REST API: POST the command as a JSON array. */
async function redis<T>(creds: { url: string; token: string }, ...command: string[]): Promise<T> {
  const res = await fetch(creds.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || body.error) throw new Error(`redis ${command[0]}: ${body.error ?? res.status}`);
  return body.result as T;
}

function redisStore(creds: { url: string; token: string }): LandStore {
  return {
    kind: "redis",
    async all() {
      // HGETALL comes back flat: [field, value, field, value, …]
      const flat = (await redis<string[]>(creds, "HGETALL", HASH)) ?? [];
      const lands: Land[] = [];
      for (let i = 1; i < flat.length; i += 2) lands.push(JSON.parse(flat[i]) as Land);
      return lands.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async get(id) {
      const raw = await redis<string | null>(creds, "HGET", HASH, id);
      return raw ? (JSON.parse(raw) as Land) : null;
    },
    async put(land) {
      await redis(creds, "HSET", HASH, land.id, JSON.stringify(land));
    },
    async remove(id) {
      await redis(creds, "HDEL", HASH, id);
    },
  };
}

/* ── Local file, for development ─────────────────────────────────────── */

const FILE = path.join(process.cwd(), "data", "lands.json");

async function readFileLands(): Promise<Land[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Land[];
  } catch {
    return [];
  }
}

/** Write to a temp file and rename, so a crash never leaves half a file. */
async function writeFileLands(lands: Land[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(lands, null, 1));
  await rename(tmp, FILE);
}

// File writes are read-modify-write, so they run one at a time.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const fileStore: LandStore = {
  kind: "file",
  all: readFileLands,
  async get(id) {
    return (await readFileLands()).find((l) => l.id === id) ?? null;
  },
  put: (land) =>
    serial(async () => {
      const lands = await readFileLands();
      const i = lands.findIndex((l) => l.id === land.id);
      if (i >= 0) lands[i] = land;
      else lands.push(land);
      await writeFileLands(lands);
    }),
  remove: (id) => serial(async () => writeFileLands((await readFileLands()).filter((l) => l.id !== id))),
};

export function landStore(): LandStore {
  const creds = redisCredentials();
  return creds ? redisStore(creds) : fileStore;
}
