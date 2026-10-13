import { NextResponse } from "next/server";
import { fetchFieldIndices } from "@/lib/copernicus";
import { landStore } from "@/lib/land-store";

/**
 * NDVI and NDWI of one farmer's field, from the Sentinel-2 pixels inside its
 * outline alone. The polygon is read from the store, not the request, so
 * this cannot be pointed at arbitrary ground; the upstream call is cached a
 * day per outline, so an edited field is fetched afresh.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const land = await landStore()
    .get(id)
    .catch(() => null);
  if (!land || land.polygon.length < 3) return NextResponse.json({ error: "no such field" }, { status: 404 });

  try {
    const indices = await fetchFieldIndices(land.polygon);
    if (!indices) return NextResponse.json({ error: "Copernicus credentials not configured" }, { status: 503 });
    return NextResponse.json(indices, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
