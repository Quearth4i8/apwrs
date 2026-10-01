"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type SurfaceInfo } from "@/components/map-view";
import { Panel, PageHeader } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { CardTitle } from "@/components/ui/simple";

/**
 * What actually drives the composite score: the entropy weights computed
 * across the live grid.
 *
 * The prototype showed SHAP contributions from a model that does not exist.
 * These weights do exist — they fall out of the factor maps themselves, and
 * the page shows the entropy they come from so the arithmetic is checkable.
 */
export function PageDrivers() {
  const [surface, setSurface] = React.useState<SurfaceInfo | null>(null);
  const onSurface = React.useCallback((info: SurfaceInfo) => setSurface(info), []);

  const factors = surface
    ? [...surface.factors].sort((a, b) => (surface.weights[b.key] ?? 0) - (surface.weights[a.key] ?? 0))
    : [];
  const maxWeight = surface ? Math.max(...Object.values(surface.weights)) : 1;
  // Whether rainfall enters through the 30-year indices or is scored raw
  // depends on whether the gridded indices were available for this surface.
  const usesIndices = factors.some((f) => f.key === "spei3" || f.key === "spi3");

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="What drives the risk map"
        lede="The map combines several measurements. Each one counts for more when it varies more across the region today, so no weight is picked by hand."
      />

      {/* The map is what produced these numbers, so it stays on the page. */}
      <div className="hidden">
        <MapView layer="risk" onSurface={onSurface} interactive={false} />
      </div>

      {!surface ? (
        <NoData
          icon="bars"
          title="Computing weights"
          what="The weights come from the live risk map. If this persists, the weather service could not be reached."
          needs="connection to Open-Meteo"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {factors.map((f, i) => {
              const w = surface.weights[f.key] ?? 0;
              const h = surface.entropy[f.key] ?? 0;
              const meta = FACTOR_META[f.key];
              return (
                <Panel key={f.key} className="grid items-center gap-x-5 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)_88px]">
                  <span className="flex items-center gap-3.5">
                    <span
                      className="grid size-10 flex-none place-items-center rounded-[10px]"
                      style={{ color: meta?.tint ?? "var(--ap-accent)", background: `color-mix(in srgb, ${meta?.tint ?? "var(--ap-accent)"} 14%, transparent)` }}
                    >
                      <Icon name={meta?.icon ?? "info"} size={19} strokeWidth={1.8} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{f.label}</span>
                      <span className="text-[12.5px] text-muted">
                        {meta?.plain ?? f.note}
                        {f.note && meta && <span className="text-faint"> · {f.note}</span>}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="relative h-2.5 rounded-full bg-neutral-100">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${(w / maxWeight) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                        style={{ opacity: i === 0 ? 1 : 0.6 }}
                      />
                    </span>
                    <span className="text-[11.5px] text-faint tabular-nums">entropy {h.toFixed(4)}</span>
                  </span>
                  <span className="text-right text-[26px] font-semibold leading-none tabular-nums">
                    {(w * 100).toFixed(1)}
                    <span className="text-[15px] font-normal text-muted">%</span>
                  </span>
                </Panel>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel className="flex flex-col gap-4 px-5 py-5">
              <CardTitle title="How the weights are worked out" sub="The entropy weight method, in four steps" />
              <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[14px] leading-[1.55]">
                {[
                  "Each measurement is rescaled from 0 to 1 across the region, flipped where a higher value means drier.",
                  "The rescaled values are treated as a distribution over the map, and its entropy (how evenly spread it is) is measured.",
                  "The less even a measurement is, the more it tells places apart, and the bigger its share of the weight.",
                  "The map's score is the weighted mix of all measurements, shown from 0 (wettest) to 100 (driest).",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 flex-none place-items-center rounded-full bg-accent-100 text-[12px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    <span className="flex-1">{step}</span>
                  </li>
                ))}
              </ol>
              <Provenance>{surface.source}</Provenance>
            </Panel>

            <Panel className="flex flex-col gap-4 px-5 py-5">
              <CardTitle title="Good to know" sub="What the map measures directly, and what stands in" />
              <div className="flex flex-col gap-3 text-[14px] leading-[1.6]">
                <p className="m-0">
                  <strong className="font-semibold">Vegetation is measured</strong> from Sentinel-2 satellite images,
                  with clouds and water removed. <strong className="font-semibold">Ground temperature is not</strong>:
                  there is no thermal satellite feed, so daytime air temperature stands in for it.
                </p>
                {usesIndices ? (
                  <p className="m-0">
                    Rain and evaporation are not scored on their own. They come in through the drought indices, which
                    compare this three-month period with the same months over thirty years at each spot.
                  </p>
                ) : (
                  <p className="m-0">
                    Rain and evaporation are scored as raw 30-day totals for now. The 30-year drought indices are
                    not yet available for the whole map; once they are, they replace these two.
                  </p>
                )}
                <p className="m-0 text-muted">
                  A measurement with no values is left out rather than counted as zero, and the other weights adjust
                  on their own.
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,#38A88A_14%,transparent)] px-3 py-1 text-[12.5px] text-[#38A88A]">
                  <Icon name="check" size={13} />
                  Vegetation: Sentinel-2
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[12.5px] text-muted">
                  <Icon name="x" size={13} />
                  Ground temperature: no feed
                </span>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

type IconKey = "rain" | "droplet" | "thermo" | "sun" | "gauge" | "leaf";

const FACTOR_META: Record<string, { icon: IconKey; tint: string; plain: string }> = {
  ndvi: { icon: "leaf", tint: "#38A88A", plain: "How green the plants are" },
  spei3: { icon: "gauge", tint: "var(--ap-accent)", plain: "Rain minus evaporation vs. 30 years" },
  spi3: { icon: "rain", tint: "var(--ap-accent)", plain: "Rain vs. 30 years" },
  soilMoisture: { icon: "droplet", tint: "var(--ap-accent)", plain: "Water in the top metre of soil" },
  tmax: { icon: "thermo", tint: "#EE8434", plain: "Daytime heat" },
  precip30: { icon: "rain", tint: "#7B8FD9", plain: "Rain in the last 30 days" },
  et030: { icon: "sun", tint: "#E7A83B", plain: "Water lost to evaporation, 30 days" },
};
