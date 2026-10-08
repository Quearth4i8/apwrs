import { NextResponse } from "next/server";
import { areaHa, centroid, type Land, type LngLat } from "@/lib/land-geometry";
import { landStore } from "@/lib/land-store";

/**
 * Farmers' fields, shared between the farmer who draws them and the expert
 * who reviews them on the Drought risk map. Storage is Redis in production and a
 * local JSON file in development (lib/land-store.ts).
 *
 *   GET    /api/lands[?owner=id]   every field, or one farmer's
 *   POST   /api/lands              create, or update when `id` is given
 *   DELETE /api/lands?id=&owner=   remove one of your own fields
 */

export const dynamic = "force-dynamic";

/** The region the app covers, with a margin: a field outside it is a typo. */
const LIMITS = { minLon: 7, maxLon: 12, minLat: 30, maxLat: 38.5 };

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/**
 * A deployment with a read-only disk (Vercel) and no Redis cannot keep a
 * field. Say so plainly rather than failing on the write.
 */
function unconfigured() {
  const store = landStore();
  if (store.kind === "file" && process.env.VERCEL) {
    return bad(
      "Field storage is not set up on this deployment. Add Upstash Redis from the Vercel Marketplace and redeploy.",
      503,
    );
  }
  return null;
}

function failed(e: unknown) {
  console.error("[api/lands]", e);
  return bad(`Could not reach field storage (${landStore().kind}). Try again in a moment.`, 502);
}

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (unconfigured()) return NextResponse.json([]); // nothing stored, nothing to show
  try {
    const lands = await landStore().all();
    return NextResponse.json(owner ? lands.filter((l) => l.ownerId === owner) : lands);
  } catch (e) {
    return failed(e);
  }
}

export async function POST(req: Request) {
  const blocked = unconfigured();
  if (blocked) return blocked;

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

  try {
    const store = landStore();
    const existing = body.id ? await store.get(body.id) : null;
    if (body.id && !existing) return bad("no such field", 404);
    if (existing && existing.ownerId !== ownerId) return bad("that field belongs to someone else", 403);

    const now = new Date().toISOString();
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
    await store.put(land);
    return NextResponse.json(land, { status: existing ? 200 : 201 });
  } catch (e) {
    return failed(e);
  }
}

export async function DELETE(req: Request) {
  const blocked = unconfigured();
  if (blocked) return blocked;
  const q = new URL(req.url).searchParams;
  const id = q.get("id");
  const owner = q.get("owner");
  if (!id || !owner) return bad("id and owner are required");
  try {
    const store = landStore();
    const land = await store.get(id);
    if (!land) return bad("no such field", 404);
    if (land.ownerId !== owner) return bad("that field belongs to someone else", 403);
    await store.remove(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
