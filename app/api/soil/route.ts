import { NextResponse } from "next/server";
import { fetchSoilProbe } from "@/lib/smartfarm";

/**
 * Soil moisture at 20, 40 and 60 cm from the SmartFarm probe, plus soil
 * temperature. Proxied server-side so the SmartFarm credentials never reach
 * the browser. The probe reports about once a day, so a 15-minute cache is
 * plenty.
 */

export const revalidate = 900;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 120));

  try {
    const probe = await fetchSoilProbe(days);
    if (!probe) {
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    }
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: "SmartFarm capacitive probe · my.smartfarm.com.tn",
      days,
      probe,
    });
  } catch (err) {
    return NextResponse.json({ error: "soil probe unavailable", detail: String(err) }, { status: 502 });
  }
}
