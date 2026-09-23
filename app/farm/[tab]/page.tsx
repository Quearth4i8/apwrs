import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FARM_NAV, type FarmerTab } from "@/lib/data";
import { FarmerPane } from "@/components/farm-pane";

export function generateStaticParams() {
  return FARM_NAV.items.map((i) => ({ tab: i.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  return { title: FARM_NAV.items.find((i) => i.id === tab)?.en ?? "My farm" };
}

export default async function FarmTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!FARM_NAV.items.some((i) => i.id === tab)) notFound();
  return <FarmerPane tab={tab as FarmerTab} />;
}
