import { fetchIndexTile } from "@/lib/copernicus";
import { S2_MAXZOOM, S2_MINZOOM, isS2Index, tileInBounds } from "@/lib/s2";

/**
 * One Sentinel-2 L2A index tile, value-encoded (see fetchIndexTile), for the
 * catchment map's close view.
 *
 * Only tiles over the catchment and within the useful zooms are served, so
 * the route cannot be used to spend the Copernicus quota elsewhere. Tiles
 * are cached for a day: Sentinel-2 revisits every ~5 days, so anything more
 * frequent would fetch the same mosaic again.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ index: string; z: string; x: string; y: string }> }) {
  const { index, z: zs, x: xs, y: ys } = await params;
  const [z, x, y] = [zs, xs, ys.replace(/\.png$/, "")].map(Number);

  if (!isS2Index(index) || ![z, x, y].every(Number.isInteger)) return new Response("bad tile", { status: 400 });
  if (z < S2_MINZOOM || z > S2_MAXZOOM || !tileInBounds(z, x, y)) return new Response("out of range", { status: 404 });

  try {
    const png = await fetchIndexTile(index, z, x, y);
    if (!png) return new Response("Copernicus credentials not configured", { status: 503 });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=21600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new Response(String(err), { status: 502 });
  }
}
