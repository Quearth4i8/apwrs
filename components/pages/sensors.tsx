"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { Blueprint, PageHeader, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { STATIONS, type Station } from "@/lib/climate";

/**
 * Two stations exist, and what exists about them is their position and their
 * 30-year record. There is no live telemetry — no battery, no link quality,
 * no uptime — because nothing is streaming from them, so those columns are
 * absent rather than filled with plausible numbers.
 */
export function PageSensors() {
  const [view, setView] = React.useState<"table" | "map">("table");
  const [selected, setSelected] = React.useState<Station>(STATIONS[0]);

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={<>MONITOR &middot; GROUND STATIONS</>}
        title="Field stations"
        lede={
          <>
            {STATIONS.length} stations with a complete daily record from {STATIONS[0].coverage.from.slice(0, 4)} to{" "}
            {STATIONS[0].coverage.to.slice(0, 4)}. These are archive stations: they are not reporting live, so there
            is no status, battery or link to show.
          </>
        }
        actions={
          <Segmented
            value={view}
            onChange={setView}
            className="h-9"
            options={[
              {
                value: "table",
                label: (
                  <>
                    <Icon name="table" size={14} />
                    Table
                  </>
                ),
              },
              {
                value: "map",
                label: (
                  <>
                    <Icon name="map" size={14} />
                    Map
                  </>
                ),
              },
            ]}
          />
        }
      />

      {view === "table" ? (
        <Blueprint className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                {[
                  "Station",
                  "Coordinates",
                  "Altitude",
                  "Record",
                  "Observations",
                  "Mean annual rain",
                  "Mean ET₀",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`border-b border-divider py-3 font-normal uppercase ${
                      i === 0 ? "px-4 text-left" : i >= 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s) => {
                const meanRain = s.annual.reduce((a, y) => a + y.precip, 0) / s.annual.length;
                const meanEt = s.annual.reduce((a, y) => a + y.et0, 0) / s.annual.length;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer transition-colors hover:bg-neutral-100"
                  >
                    <td className="border-b border-divider px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{s.id}</span>
                        <span className="text-xs text-muted">{s.name}</span>
                      </div>
                    </td>
                    <td className="border-b border-divider font-mono text-[11.5px] text-muted">
                      {s.lat.toFixed(3)}&deg;N {s.lon.toFixed(3)}&deg;E
                    </td>
                    <td className="border-b border-divider text-right font-mono">{s.alt} m</td>
                    <td className="border-b border-divider text-right font-mono text-[11.5px]">
                      {s.coverage.from.slice(0, 4)}&ndash;{s.coverage.to.slice(0, 4)}
                    </td>
                    <td className="border-b border-divider text-right font-mono">
                      {s.coverage.days.toLocaleString("en-GB")}
                    </td>
                    <td className="border-b border-divider text-right font-mono">{meanRain.toFixed(0)} mm</td>
                    <td className="border-b border-divider pr-4 text-right font-mono">{meanEt.toFixed(0)} mm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Blueprint>
      ) : (
        <Blueprint className="relative h-[560px]">
          <MapView layer="none" sensors className="absolute inset-0" />
        </Blueprint>
      )}

      {/* ── Measured variables ────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Blueprint className="flex flex-col gap-3.5 px-5 py-4.5">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
            MEASURED AT {selected.name.toUpperCase()}
          </span>
          <div className="grid grid-cols-2 border-l border-t border-divider">
            {(
              [
                ["PRECIPITATION", "mm/day"],
                ["TEMPERATURE", "min / mean / max °C"],
                ["RELATIVE HUMIDITY", "%"],
                ["SOLAR RADIATION", "MJ/m²/day"],
                ["WIND SPEED @2 m", "m/s"],
                ["ET₀", "mm/day, FAO-56"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                <span className="font-mono text-[12.5px]">{v}</span>
              </div>
            ))}
          </div>
          <Provenance>Seven variables, {selected.coverage.days.toLocaleString("en-GB")} days, no gaps</Provenance>
        </Blueprint>

        <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-heading text-lg font-semibold">Last 90 days at {selected.name}</span>
            <span className="font-mono text-[10.5px] text-muted">
              RAINFALL mm &middot; TO {selected.recent[selected.recent.length - 1].date}
            </span>
          </div>
          <RecentRain station={selected} />
        </Blueprint>
      </div>
    </div>
  );
}

function RecentRain({ station }: { station: Station }) {
  const rows = station.recent.slice(-90);
  const max = Math.max(...rows.map((r) => r.precip), 5);
  const w = 720;
  const h = 150;
  const bw = w / rows.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
      <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
        <line x1={0} x2={w} y1={h - 20} y2={h - 20} />
        <line x1={0} x2={w} y1={(h - 20) / 2} y2={(h - 20) / 2} />
      </g>
      {rows.map((r, i) => {
        const bh = (r.precip / max) * (h - 30);
        return (
          <rect
            key={r.date}
            x={i * bw}
            y={h - 20 - bh}
            width={Math.max(1, bw - 0.8)}
            height={bh}
            fill="var(--ap-teal)"
            fillOpacity={0.85}
          >
            <title>
              {r.date}: {r.precip.toFixed(1)} mm
            </title>
          </rect>
        );
      })}
      <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
        <text x={2} y={12}>
          {max.toFixed(0)} mm
        </text>
        <text x={2} y={h - 6}>
          {rows[0].date}
        </text>
        <text x={w - 2} y={h - 6} textAnchor="end">
          {rows[rows.length - 1].date}
        </text>
      </g>
    </svg>
  );
}
