import { NextResponse } from "next/server";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { areaHa, centroid, type Land, type LngLat } from "@/lib/land-geometry";

/**
 * Farmers' fields, shared between the farmer who draws them and the expert
 * who reviews them on the Live Map.
 *
 * Stored as one JSON file under data/ — enough for a single server and a
 * few hundred fields, and swappable for a database later without touching
 * the pages: they only see GET / POST / DELETE here.
 *
 *   GET    /api/lands[?owner=id]   every field, or one farmer's
 *   POST   /api/lands              create, or update when `id` is given
 *   DELETE /api/lands?id=&owner=   remove one of your own fields
 */

export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "data", "lands.json");

/** The region the app covers, with a margin: a field outside it is a typo. */
const LIMITS = { minLon: 7, maxLon: 12, minLat: 30, maxLat: 38.5 };

async function readAll(): Promise<Land[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Land[];
  } catch {
    return [];
  }
}

/** Write to a temp file and rename, so a crash never leaves half a file. */
async function writeAll(lands: Land[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(lands, null, 1));
  await rename(tmp, FILE);
}

// Requests are handled one at a time so two saves cannot overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  const lands = await readAll();
  return NextResponse.json(owner ? lands.filter((l) => l.ownerId === owner) : lands);
}

export async function POST(req: Request) {
  let body: Partial<Land> & { polygon?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("body is not JSON");
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const ownerId = String(body.ownerId ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim().slice(0, 80);
  const crop = String(body.crop ?? "none").slice(0, 40);
  if (!ownerId || !ownerName) return bad("a field needs its owner");
  if (!name) return bad("a field needs a name");

  const poly = body.polygon;
  if (!Array.isArray(poly) || poly.length < 3 || poly.length > 200) return bad("a field needs 3 to 200 corners");
  const polygon: LngLat[] = [];
  for (const p of poly) {
    if (!Array.isArray(p) || p.length !== 2) return bad("corners are [longitude, latitude]");
    const [lon, lat] = p.map(Number);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return bad("corners must be numbers");
    if (lon < LIMITS.minLon || lon > LIMITS.maxLon || lat < LIMITS.minLat || lat > LIMITS.maxLat) {
      return bad("the field is outside the region this app covers");
    }
    polygon.push([+lon.toFixed(7), +lat.toFixed(7)]);
  }
  const ha = areaHa(polygon);
  if (ha <= 0.001) return bad("the corners do not enclose an area");
  if (ha > 5000) return bad("that is larger than a single field (over 5,000 ha)");

  return serial(async () => {
    const lands = await readAll();
    const now = new Date().toISOString();
    const existing = body.id ? lands.find((l) => l.id === body.id) : undefined;
    if (body.id && !existing) return bad("no such field", 404);
    if (existing && existing.ownerId !== ownerId) return bad("that field belongs to someone else", 403);

    const land: Land = {
      id: existing?.id ?? crypto.randomUUID(),
      ownerId,
      ownerName,
      name,
      crop,
      polygon,
      areaHa: +ha.toFixed(3),
      center: centroid(polygon).map((v) => +v.toFixed(6)) as LngLat,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const next = existing ? lands.map((l) => (l.id === land.id ? land : l)) : [...lands, land];
    await writeAll(next);
    return NextResponse.json(land, { status: existing ? 200 : 201 });
  });
}

export async function DELETE(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get("id");
  const owner = q.get("owner");
  if (!id || !owner) return bad("id and owner are required");
  return serial(async () => {
    const lands = await readAll();
    const land = lands.find((l) => l.id === id);
    if (!land) return bad("no such field", 404);
    if (land.ownerId !== owner) return bad("that field belongs to someone else", 403);
    await writeAll(lands.filter((l) => l.id !== id));
    return NextResponse.json({ ok: true });
  });
}
