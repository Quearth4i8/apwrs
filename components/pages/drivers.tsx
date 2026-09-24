"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type SurfaceInfo } from "@/components/map-view";
import { Panel, PageHeader } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";

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

  const factors = surface?.factors ?? [];
  const maxWeight = surface ? Math.max(...Object.values(surface.weights)) : 1;

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={<>ANALYSIS &middot; RISK DRIVERS</>}
        title="What is driving risk"
        lede={
          <>
            Each factor is normalised across the region, scored by information entropy, and weighted by how much it
            varies. A factor whose values are more dispersed carries more information, so it earns a larger weight.
            No weight is set by hand.
          </>
        }
      />

      {/* The map is what produced these numbers, so it stays on the page. */}
      <div className="hidden">
        <MapView layer="risk" onSurface={onSurface} interactive={false} />
      </div>

      {!surface ? (
        <NoData
          icon="bars"
          title="Computing weights"
          what="The weights come from the live risk surface. If this persists, the upstream weather service could not be reached."
          needs="connection to Open-Meteo"
        />
      ) : (
        <>
          <Panel className="flex flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)_84px_64px] gap-4 border-b border-divider px-5 py-3 font-mono text-[10px] tracking-[0.1em] text-muted sm:grid-cols-[240px_minmax(0,1fr)_84px_64px]">
              <span>FACTOR</span>
              <span className="hidden sm:block">WEIGHT</span>
              <span className="text-right">ENTROPY</span>
              <span className="text-right">WEIGHT</span>
            </div>

            {factors.map((f, i) => {
              const w = surface.weights[f.key] ?? 0;
              const h = surface.entropy[f.key] ?? 0;
              return (
                <div
                  key={f.key}
                  className="grid grid-cols-[minmax(0,1fr)_84px_64px] items-center gap-4 border-b border-divider px-5 py-4.5 sm:grid-cols-[240px_minmax(0,1fr)_84px_64px]"
                >
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 flex text-accent">
                      <Icon name={ICONS[f.key] ?? "info"} size={16} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{f.label}</span>
                      {f.note && <span className="font-mono text-[11px] text-faint">{f.note}</span>}
                    </span>
                  </span>
                  <span className="relative hidden h-3.5 bg-neutral-100 sm:block">
                    <motion.span
                      className="absolute inset-y-0 left-0 bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${(w / maxWeight) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </span>
                  <span className="text-right font-mono text-[13px] text-muted">{h.toFixed(4)}</span>
                  <span className="text-right font-heading text-2xl font-semibold tabular-nums">
                    {(w * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}

            <div className="flex items-center gap-2 px-5 py-3.5 text-[12.5px] text-muted">
              <Icon name="info" size={14} />
              Weights sum to {(Object.values(surface.weights).reduce((a, b) => a + b, 0) * 100).toFixed(0)}%. Lower
              entropy means a more dispersed factor, and so a larger weight.
            </div>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel className="flex flex-col gap-3 px-5 py-4.5">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">THE METHOD</span>
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13.5px] leading-[1.55]">
                {[
                  "Each factor map is normalised 0-1 across the region, flipped where a higher raw value means drier.",
                  "The normalised values become a distribution over cells, and its information entropy H is measured.",
                  "The weight is (1 - H) divided by the sum of (1 - H) across factors, so dispersed factors dominate.",
                  "The composite is the weighted mean, reported as risk = (1 - composite) x 100.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1">{step}</span>
                  </li>
                ))}
              </ol>
              <Provenance>{surface.source}</Provenance>
            </Panel>

            <Panel className="flex flex-col gap-3 px-5 py-4.5">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">WHAT IS NOT IN HERE</span>
              <div className="flex flex-col gap-3 text-[13.5px] leading-[1.55]">
                <p className="m-0">
                  The source method uses NDVI and land surface temperature. NDVI is now measured &mdash;
                  Sentinel-2 L2A from the Copernicus Data Space, cloud- and water-masked. Land surface
                  temperature still has no thermal feed, so maximum air temperature stands in for it and is
                  labelled as such above.
                </p>
                <p className="m-0">
                  Rainfall and ET<sub>0</sub> are no longer scored on their own. They enter through SPEI-3 and
                  SPI-3, fitted per grid cell against thirty years of archive, which say how this three-month
                  period compares with the same months historically rather than how many millimetres fell.
                </p>
                <p className="m-0 text-muted">
                  Adding a factor does not change the arithmetic &mdash; the weighting adapts to whatever
                  factor maps it is given, and a factor with no values at all is dropped rather than carried
                  at zero.
                </p>
              </div>
              <div className="mt-auto grid grid-cols-2 border-l border-t border-divider">
                {(
                  [
                    ["NDVI", "Sentinel-2 L2A"],
                    ["LAND SURFACE TEMP", "no thermal feed"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                    <span className="font-mono text-[12.5px] text-faint">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

const ICONS: Record<string, "rain" | "droplet" | "thermo" | "sun" | "gauge" | "leaf"> = {
  ndvi: "leaf",
  spei3: "gauge",
  spi3: "rain",
  soilMoisture: "droplet",
  tmax: "thermo",
  // Kept so a surface scored before the factor swap still renders.
  precip30: "rain",
  et030: "sun",
};
