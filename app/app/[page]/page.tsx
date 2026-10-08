import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NAV, type PageId } from "@/lib/data";
import { PageOverview } from "@/components/pages/overview";
import { PageSensors } from "@/components/pages/sensors";
import { PageAlerts } from "@/components/pages/alerts";
import { PageRisk } from "@/components/pages/risk";
import { PageForecasts } from "@/components/pages/forecasts";
import { PagePlanting } from "@/components/pages/planting";
import { PageFieldProfile } from "@/components/pages/field-profile";
import { PageIrrigation } from "@/components/pages/irrigation";
import { PageHistory } from "@/components/pages/history";
import { PageAdmin } from "@/components/pages/admin";

const ALL = NAV.flatMap((g) => g.items);

export function generateStaticParams() {
  return ALL.map((i) => ({ page: i.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const item = ALL.find((i) => i.id === page);
  return { title: item?.en ?? "Console" };
}

function render(page: PageId) {
  switch (page) {
    case "overview":
      return <PageOverview />;
    case "sensors":
      return <PageSensors />;
    case "alerts":
      return <PageAlerts />;
    case "risk":
      return <PageRisk />;
    case "forecasts":
      return <PageForecasts />;
    case "planting":
      return <PagePlanting />;
    case "profile":
      return <PageFieldProfile />;
    case "irrigation":
      return <PageIrrigation />;
    case "history":
      return <PageHistory />;
    case "users":
      return <PageAdmin key="users" section="users" />;
    case "regions":
      return <PageAdmin key="regions" section="regions" />;
    case "settings":
      return <PageAdmin key="settings" section="settings" />;
  }
}

export default async function ConsolePage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!ALL.some((i) => i.id === page)) notFound();
  return render(page as PageId);
}
