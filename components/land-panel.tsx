"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { CropImage } from "@/components/crop-visual";
import { type GridPayload } from "@/components/map-view";
import { Button, RiskBadge } from "@/components/ui/primitives";
import { calendarCrop } from "@/lib/crop-calendar";
import { cellFor, impactsAt } from "@/lib/impact";
import { landsGeoJSON, type Land } from "@/lib/lands";
import { LAYER, MAP_LAYERS, type LayerKey } from "@/lib/map-layers";

/**
 * A farmer's field as the expert sees it: who farms it, what is on it, its
 * size, and every layer's value on it with each risk factor's impact.
 * Opened from a field's pin on the Drought risk map.
 */

/** The panel's frame: a card sliding in over the right of the map. */
export function LandPanel({
  land,
  payload,
  onZoom,
  onClose,
}: {
  land: Land;
  payload: GridPayload | null;
  onZoom: () => void;
  onClose: () => void;
}) {
  return (
    <motion.aside
      key={land.id}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="absolute inset-y-3 right-3 z-20 flex w-[min(340px,calc(100%-24px))] flex-col overflow-hidden rounded-[16px] border border-panel-border bg-surface shadow-pop"
    >
      <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[19px] font-semibold leading-tight">{land.name}</span>
          <span className="truncate text-[12.5px] text-muted">Field of {land.ownerName}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="grid size-9 flex-none place-items-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-ink"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <LandBody land={land} payload={payload} onZoom={onZoom} />
      </div>
    </motion.aside>
  );
}

/** A field: who farms it, what is on it, and every map layer's value at its centre. */
function LandBody({ land, payload, onZoom }: { land: Land; payload: GridPayload | null; onZoom: () => void }) {
  const crop = land.crop !== "none" ? calendarCrop(land.crop) : null;
  const i = payload ? cellFor(payload, land.center[1], land.center[0]) : null;
  const impacts = payload && i != null ? impactsAt(payload, i) : [];
  const impactOf = new Map(impacts.map((f) => [f.key, f]));
  const value = (k: LayerKey) => (payload && i != null ? ((payload.grid[k] as (number | null)[] | undefined)?.[i] ?? null) : null);
  const risk = value("risk");

  const download = () => {
    const blob = new Blob([JSON.stringify(landsGeoJSON([land]), null, 1)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${land.name.replace(/[^\w-]+/g, "_")}.geojson`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 flex items-center gap-3 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
          {crop ? <CropImage crop={crop} className="size-10 flex-none rounded-full" iconSize={16} /> : <Icon name="sprout" size={20} />}
          <span className="flex flex-col">
            <span className="text-[12.5px] text-muted">Crop</span>
            <span className="text-[15px] font-semibold">{crop ? crop.name : "None / fallow"}</span>
          </span>
        </div>
        <Stat k="Area" v={`${land.areaHa.toFixed(2)} ha`} />
        <Stat k="Corners" v={String(land.polygon.length)} />
        <Stat k="Centre" v={`${land.center[1].toFixed(4)}, ${land.center[0].toFixed(4)}`} />
        <Stat k="Updated" v={new Date(land.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold">Conditions on this field</span>
          {risk != null && <RiskBadge score={risk} />}
        </span>
        {!payload ? (
          <span className="text-[12.5px] text-muted">Loading the layers&hellip;</span>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[24px_minmax(0,1fr)_auto_64px] gap-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
              <span />
              <span>Factor</span>
              <span className="text-right">Value</span>
              <span className="text-right">Impact</span>
            </div>
            {MAP_LAYERS.filter((l) => l.key !== "risk").map((l, n) => {
              const v = value(l.key);
              const f = impactOf.get(l.key);
              return (
                <div
                  key={l.key}
                  className="grid grid-cols-[24px_minmax(0,1fr)_auto_64px] items-center gap-2.5 border-b border-divider py-2 text-[13px] last:border-b-0"
                >
                  <span className="h-2 w-6 rounded-full" style={{ background: `linear-gradient(to right, ${l.ramp.join(", ")})` }} />
                  <span className="truncate text-muted" title={f ? `Weight ${(f.weight * 100).toFixed(0)}%` : "Not part of the risk score"}>
                    {l.label}
                  </span>
                  <span className="text-right font-semibold tabular-nums">{v == null ? "—" : LAYER[l.key].format(v)}</span>
                  {f ? (
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: "#EE8434" }}>
                        {f.impact.toFixed(0)}%
                      </span>
                      <span className="h-1 w-full rounded-full bg-neutral-100">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: "#EE8434" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.impact}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + n * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="text-right text-[12px] text-faint">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <span className="text-[11.5px] leading-snug text-faint">
          Impact = wₖ·dₖ ÷ Σ wⱼ·dⱼ: each factor&apos;s entropy weight wₖ times how dry the field is on it, dₖ (0 wettest, 1 driest in the
          region), as a share of the risk score. Factors marked — are shown but not scored. Read from the ~{payload?.resolutionKm ?? 9} km
          grid cell under the field&apos;s centre.
        </span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="h-[34px] flex-1" onClick={download}>
          <Icon name="download" size={14} />
          Export GeoJSON
        </Button>
        <Button size="sm" variant="primary" className="h-[34px] flex-1" onClick={onZoom}>
          <Icon name="search" size={14} />
          Zoom to field
        </Button>
      </div>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
      <span className="text-[12.5px] text-muted">{k}</span>
      <span className="truncate text-[14.5px] font-semibold tabular-nums">{v}</span>
    </div>
  );
}
