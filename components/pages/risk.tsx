"use client";

import * as React from "react";
import { AnimatePresence } from "motion/react";
import { loadGrid, type GridPayload } from "@/components/map-view";
import { SoilDepth } from "@/components/soil-depth";
import { Icon } from "@/components/icon";
import { LandPanel } from "@/components/land-panel";
import { LAND_FILL } from "@/components/land-pin";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/dropdown";
import { bounds, useLands, type Land } from "@/lib/lands";
import { RiskGauge } from "@/components/risk-gauge";
import { AnimatedBars, BandLegend, IndexHistory, PeriodFilter, sliceYears, type Period } from "@/components/index-history";
import { LayerSwitcher } from "@/components/layer-switcher";
import { BasinLayerMap } from "@/components/basin-layer-map";
import type { LayerKey } from "@/lib/map-layers";
import { useConsole } from "@/components/app-context";
import { Panel, PageHeader } from "@/components/ui/primitives";
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
  const [mapLayer, setMapLayer] = React.useState<LayerKey | "none">("risk");

  // Farmers' fields on the catchment map.
  const { lands } = useLands();
  const fields = lands ?? [];
  const [showFields, setShowFields] = React.useState(true);
  const [landId, setLandId] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState<[number, number, number, number] | null>(null);
  const [payload, setPayload] = React.useState<GridPayload | null>(null);
  React.useEffect(() => {
    let live = true;
    loadGrid()
      .then((g) => live && setPayload(g))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const land = landId ? (fields.find((l) => l.id === landId) ?? null) : null;
  const openLand = (l: Land) => {
    setLandId(l.id);
    setShowFields(true);
    setFocus(bounds(l.polygon));
  };


  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader title="Drought risk" />

      {/* ── Standing + explanation ────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* The catchment, as on the Overview, coloured by the risk or a vegetation layer. */}
        <Panel className="relative min-h-[460px] overflow-hidden">
          <BasinLayerMap
            layer={mapLayer}
            lands={showFields ? fields : []}
            selectedLand={landId}
            onLand={openLand}
            focus={focus}
            className="absolute inset-0"
          />
          <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
            <LayerSwitcher value={mapLayer} onChange={setMapLayer} only={["risk", "ndvi", "ndwi"]} allowNone />
            <FieldsMenu
              fields={fields}
              loading={lands == null}
              shown={showFields}
              onToggle={() => {
                setShowFields((v) => !v);
                setLandId(null);
              }}
              onPick={openLand}
            />
          </div>
          <AnimatePresence>
            {land && (
              <LandPanel
                land={land}
                payload={payload}
                onZoom={() => setFocus(bounds(land.polygon))}
                onClose={() => setLandId(null)}
              />
            )}
          </AnimatePresence>
        </Panel>

        <RiskGauge lat={station.lat} lon={station.lon} />
      </div>

      <IndexHistory station={station} />

      <SoilDepth />

      <SpeiHistory station={station} />
    </div>
  );
}

/** The fields pill over the map: show or hide them, and jump to any one. */
function FieldsMenu({
  fields,
  loading,
  shown,
  onToggle,
  onPick,
}: {
  fields: Land[];
  loading: boolean;
  shown: boolean;
  onToggle: () => void;
  onPick: (l: Land) => void;
}) {
  return (
    <Menu
      className="max-h-[360px] w-[280px] overflow-y-auto"
      trigger={
        <button
          type="button"
          className="group flex h-9 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_90%,transparent)] pl-2 pr-3 text-[13px] text-ink shadow-pop outline-none backdrop-blur-md transition-colors hover:bg-[var(--ap-bg)] data-[state=open]:bg-[var(--ap-bg)]"
        >
          <span
            className="grid size-6 place-items-center rounded-full"
            style={{ background: shown ? `${LAND_FILL}33` : "var(--ap-neutral-100)", color: shown ? "#1C9C93" : "var(--ap-muted)" }}
          >
            <Icon name="map" size={13} />
          </span>
          <span className="font-semibold">Fields</span>
          <span className="text-muted tabular-nums">{loading ? "…" : fields.length}</span>
          <span className="text-muted transition-transform duration-150 group-data-[state=open]:rotate-180">
            <Icon name="down" size={14} />
          </span>
        </button>
      }
    >
      <MenuItem icon={shown ? "x" : "map"} onSelect={onToggle}>
        {shown ? "Hide farmers' fields" : "Show farmers' fields"}
      </MenuItem>
      {fields.length > 0 && <MenuSeparator />}
      {fields.length > 0 && <MenuLabel>Go to a field</MenuLabel>}
      {fields.map((l) => (
        <MenuItem key={l.id} hint={`${l.areaHa.toFixed(1)} ha`} onSelect={() => onPick(l)}>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium">{l.name}</span>
            <span className="truncate text-[11.5px] text-muted">{l.ownerName}</span>
          </span>
        </MenuItem>
      ))}
      {!loading && fields.length === 0 && (
        <div className="px-2.5 py-2 text-[12px] leading-snug text-muted">
          No fields yet. Farmers draw theirs on the My fields screen of the farmer view.
        </div>
      )}
    </Menu>
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
