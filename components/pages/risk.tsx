"use client";

import * as React from "react";
import { MapView, type SurfaceInfo } from "@/components/map-view";
import { RiskGauge } from "@/components/risk-gauge";
import { AnimatedBars, BandLegend, IndexHistory, PeriodFilter, sliceYears, type Period } from "@/components/index-history";
import { LayerSwitcher } from "@/components/layer-switcher";
import type { LayerKey } from "@/lib/map-layers";
import { useConsole } from "@/components/app-context";
import { Panel, PageHeader, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CardTitle } from "@/components/ui/simple";
import { stationForSite, type Station } from "@/lib/climate";
import { riskLevel } from "@/lib/utils";

/**
 * Drought standing for the selected station, on the two indices the record
 * actually supports: SPEI (water balance) and SPI (rainfall alone), both
 * fitted per calendar month over 30 years.
 *
 * The prototype's four forecast horizons with confidence bands and
 * P(extreme) are gone. There is no ensemble here, so there is nothing to put
 * a confidence interval on.
 */
export function PageRisk() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [tab, setTab] = React.useState<"trend" | "spatial">("trend");
  const [mapLayer, setMapLayer] = React.useState<LayerKey>("risk");
  const [surface, setSurface] = React.useState<SurfaceInfo | null>(null);
  const onSurface = React.useCallback((info: SurfaceInfo) => setSurface(info), []);


  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader title="Drought risk" />

      {/* ── Standing + explanation ────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <RiskGauge lat={station.lat} lon={station.lon} />

        {/* The drought risk surface, as on Live Map, and each factor behind it. */}
        <Panel className="relative min-h-[420px] overflow-hidden">
          <MapView
            layer={mapLayer}
            sensors
            legend
            opacity={mapLayer === "risk" ? 0.55 : 0.7}
            className="absolute inset-0"
          />
          <LayerSwitcher value={mapLayer} onChange={setMapLayer} className="absolute left-3 top-3 z-10" />
        </Panel>
      </div>

      <IndexHistory station={station} />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "trend", label: "Past 30 years" },
          { value: "spatial", label: "Risk map today" },
        ]}
      />

      {tab === "trend" ? (
        <SpeiHistory station={station} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Panel className="relative h-[520px]">
            <MapView layer="risk" sensors legend onSurface={onSurface} className="absolute inset-0" />
          </Panel>
          <FactorComparison surface={surface} />
        </div>
      )}
    </div>
  );
}

/**
 * What the composite surface is actually made of.
 *
 * The entropy weight method (`formlas and data/entroy_weight_method.png`,
 * §3.4) normalises each factor by direction (eq. 4), scores it by information
 * entropy (eq. 5) and weights it by how much it disperses (eq. 6):
 * ωₖ = (1 − Hₖ) / (K − ΣH). A factor whose values spread out across the
 * region carries more information and so earns more weight. Nothing is set
 * by hand, which is the point of the method.
 */
function FactorComparison({ surface }: { surface: SurfaceInfo | null }) {
  if (!surface) {
    return (
      <Panel className="flex items-center justify-center px-5 py-10">
        <span className="text-[13px] text-muted">Computing weights…</span>
      </Panel>
    );
  }

  const rows = surface.factors
    .map((f) => ({
      ...f,
      weight: surface.weights[f.key] ?? 0,
      entropy: surface.entropy[f.key] ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  const top = rows[0];
  const maxWeight = Math.max(...rows.map((r) => r.weight), 1e-9);

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <CardTitle title="What shapes the map" sub="Weights set by the data, not by hand" />

      {/* The headline the panel exists to answer. */}
      <div className="flex flex-col gap-1 rounded-[12px] bg-accent-100 px-4 py-3.5">
        <span className="text-[13px] text-muted">Biggest influence today</span>
        <span className="flex items-baseline gap-2.5">
          <span className="text-[22px] font-semibold leading-tight">{top.label}</span>
          <span className="text-[15px] font-semibold text-accent">{(top.weight * 100).toFixed(0)}%</span>
        </span>
        <span className="text-[12.5px] leading-snug text-muted">
          It varies the most across the region, so it tells the most apart.
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        {rows.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="flex items-baseline gap-2">
                {f.label}
                <span className="text-[12px] text-faint">{f.direction === "positive" ? "higher is wetter" : "higher is drier"}</span>
              </span>
              <span className="font-semibold tabular-nums">{(f.weight * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(f.weight / maxWeight) * 100}%`,
                  background: "var(--ap-accent)",
                  opacity: f.key === top.key ? 1 : 0.55,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <Provenance>Entropy weight method · weights sum to 100%</Provenance>
    </Panel>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

/** SPEI-3 month by month, with the same bars as the Drought Index chart. */
function SpeiHistory({ station }: { station: Station }) {
  const [period, setPeriod] = React.useState<Period>("all");
  const { months, values } = sliceYears(station, station.spei["3"], period);
  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Every month since {months[0]?.y ?? station.coverage.from.slice(0, 4)}</span>
          <span className="text-[13px] text-muted">SPEI-3: bars below −1 are drought months</span>
        </span>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <AnimatedBars months={months} values={values} code="SPEI-3" id={period} />
      <BandLegend />
    </Panel>
  );
}

export { riskLevel };
