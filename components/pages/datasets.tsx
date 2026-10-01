"use client";

import * as React from "react";
import { Icon, type IconName } from "@/components/icon";
import { PageHeader, TabStrip } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { climateFile, CROPS, STATIONS } from "@/lib/climate";

/**
 * Every source the app reads from: the two station workbooks it was derived
 * from, the crop table, and the live feeds (Open-Meteo, Copernicus
 * Sentinel-2, the SmartFarm soil probe). The activity log needs an audit
 * trail nothing is writing to yet.
 */

interface Source {
  id: string;
  name: string;
  icon: IconName;
  tint: string;
  source: string;
  live: boolean;
  size: string;
  period: string;
  contents: string;
}

export function PageDatasets({ tab: initial }: { tab: "datasets" | "activity" }) {
  const [tab, setTab] = React.useState(initial);

  const sources: Source[] = [
    ...STATIONS.map((s) => ({
      id: s.id,
      name: `${s.name} weather record`,
      icon: "cloudsun" as const,
      tint: "var(--ap-accent)",
      source: "Station workbook",
      live: false,
      size: `${s.coverage.days.toLocaleString("en-GB")} days`,
      period: `${s.coverage.from.slice(0, 4)} to ${s.coverage.to.slice(0, 4)}`,
      contents: "Rain, temperature, humidity, sunlight, wind, evaporation",
    })),
    {
      id: "probe",
      name: "Field sensor",
      icon: "radio",
      tint: "#38A88A",
      source: "SmartFarm",
      live: true,
      size: "About 1 reading a day",
      period: "Since Jul 2026",
      contents: "Soil moisture at 20, 40 and 60 cm, soil temperature",
    },
    {
      id: "grid",
      name: "Regional weather grid",
      icon: "grid",
      tint: "#7B8FD9",
      source: "Open-Meteo",
      live: true,
      size: "320 points",
      period: "Last 30 days, refreshed every 30 min",
      contents: "Rain, evaporation, daytime high, soil moisture",
    },
    {
      id: "forecast",
      name: "Weather forecast",
      icon: "cloud",
      tint: "#7B8FD9",
      source: "Open-Meteo",
      live: true,
      size: "16 days ahead",
      period: "Plus the last 60 days",
      contents: "Rain, evaporation, low and high temperature",
    },
    {
      id: "ndvi",
      name: "Vegetation from satellite",
      icon: "satellite",
      tint: "#38A88A",
      source: "Copernicus Sentinel-2",
      live: true,
      size: "One image mosaic",
      period: "Clearest view of the last 30 days",
      contents: "How green the plants are (NDVI)",
    },
    {
      id: "crops",
      name: "Crop table",
      icon: "sprout",
      tint: "#E7A83B",
      source: "Station workbook",
      live: false,
      size: `${CROPS.length} crops`,
      period: "Fixed",
      contents: "Growth stage lengths and water coefficients (FAO-56)",
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title={tab === "datasets" ? "Datasets" : "Activity log"}
        lede={tab === "datasets" ? "Everything the app reads its figures from." : "Who changed what, and when."}
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "datasets", label: "Datasets", count: sources.length },
          { value: "activity", label: "Activity log" },
        ]}
      />

      {tab === "datasets" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((d) => (
              <div key={d.id} className="panel flex flex-col gap-3.5 px-5 py-4.5">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 flex-none place-items-center rounded-[10px]"
                    style={{ color: d.tint, background: `color-mix(in srgb, ${d.tint} 14%, transparent)` }}
                  >
                    <Icon name={d.icon} size={19} strokeWidth={1.8} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold leading-tight">{d.name}</span>
                    <span className="text-[12.5px] text-muted">{d.source}</span>
                  </span>
                  <span
                    className="flex-none rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                    style={
                      d.live
                        ? { color: "#38A88A", background: "rgb(56 168 138 / 0.14)" }
                        : { color: "var(--ap-muted)", background: "var(--ap-neutral-100)" }
                    }
                  >
                    {d.live ? "Live" : "Archive"}
                  </span>
                </div>
                <p className="m-0 text-[13.5px] leading-snug">{d.contents}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Icon name="database" size={13} />
                    {d.size}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="calendar" size={13} />
                    {d.period}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Provenance>Station data prepared {new Date(climateFile.generatedAt).toISOString().slice(0, 10)}</Provenance>
        </>
      ) : (
        <NoData
          icon="activity"
          title="No activity recorded"
          what="An activity log needs a record of who changed what, and when. Nothing is keeping one yet, and the actions it would record (uploads, edits, role changes) are not saved anywhere."
          needs="an audit trail"
        />
      )}
    </div>
  );
}
