"use client";

import * as React from "react";
import { useConsole } from "@/components/app-context";
import { Panel, PageHeader } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { SOIL_MODEL, stationForSite, type Station } from "@/lib/climate";
import { useForecast, type ForecastPayload } from "@/lib/use-forecast";

/**
 * Live daily forecast for the selected station, with a FAO-56 root-zone
 * water balance run forward over it.
 *
 * There is no ensemble behind this feed, so there are no confidence
 * intervals — and none are drawn. The recommended-action column the
 * prototype carried is gone: nothing generates advice.
 */
export function PageForecasts() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const { data, error } = useForecast(station.id);

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; FORECASTS &middot; {station.name.toUpperCase()} &middot; {station.lat.toFixed(3)}&deg;N{" "}
            {station.lon.toFixed(3)}&deg;E
          </>
        }
        title="Forecasts"
        lede={
          data
            ? `Daily values to ${data.days[data.days.length - 1].date}, ${data.horizonDays} days ahead.`
            : "Loading the live forecast…"
        }
      />

      {error && (
        <NoData
          icon="cloud"
          title="Forecast unavailable"
          what="The upstream weather service could not be reached, so there is nothing to show. The 30-year station record on Historical Comparison is unaffected."
          needs="connection to Open-Meteo"
        />
      )}

      {data && <ForecastBody station={station} data={data} />}
    </div>
  );
}

function ForecastBody({ station, data }: { station: Station; data: ForecastPayload }) {
  const days = data.days;
  const future = days.filter((d) => d.forecast);

  const sum = (rows: typeof days, k: "precip" | "et0") =>
    rows.reduce((a, r) => a + (r[k] ?? 0), 0);

  const next7 = future.slice(0, 7);
  const next14 = future.slice(0, 14);

  /* Root-zone balance carried forward day by day over the whole window. */
  const balance = React.useMemo(() => runBalance(days, station), [days, station]);

  return (
    <>
      <Panel className="grid grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["RAIN · NEXT 7 D", `${sum(next7, "precip").toFixed(1)}`, "mm"],
            ["RAIN · NEXT 14 D", `${sum(next14, "precip").toFixed(1)}`, "mm"],
            ["ET₀ · NEXT 7 D", `${sum(next7, "et0").toFixed(1)}`, "mm"],
            [
              "BALANCE · NEXT 7 D",
              `${(sum(next7, "precip") - sum(next7, "et0")).toFixed(1)}`,
              "mm",
            ],
          ] as const
        ).map(([k, v, unit], i) => (
          <div
            key={k}
            className={`flex flex-col gap-2 border-b border-divider px-5 py-4.5 xl:border-b-0 ${
              i < 3 ? "xl:border-r" : ""
            }`}
          >
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{k}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-heading text-[40px] font-semibold leading-none tabular-nums">{v}</span>
              <span className="font-mono text-xs text-muted">{unit}</span>
            </span>
          </div>
        ))}
      </Panel>

      {/* ── Daily rain + ET0 ──────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-4.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-heading text-lg font-semibold">Rainfall and reference evapotranspiration</span>
          <span className="font-mono text-[10.5px] text-muted">DAILY &middot; mm</span>
        </div>
        <DailyChart days={days} />
        <div className="flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-teal" />
            Rainfall
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5" style={{ background: "#EE8434" }} />
            ET&#8320;
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-ink opacity-50" />
            today
          </span>
        </div>
        <Provenance>{data.source} &middot; issued {new Date(data.generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</Provenance>
      </Panel>

      {/* ── Water balance ─────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-4.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-heading text-lg font-semibold">Modelled root-zone water balance</span>
          <span className="font-mono text-[10.5px] text-muted">
            FC {SOIL_MODEL.fieldCapacityMm} mm &middot; WP {SOIL_MODEL.wiltingPointMm} mm
          </span>
        </div>
        <BalanceChart rows={balance} />
        <div className="text-[12.5px] leading-[1.5] text-muted">
          A single-coefficient FAO-56 balance driven by the forecast above. This is a model, not a probe reading
          &mdash; the station record carries no soil measurements.
        </div>
      </Panel>

      {/* ── Daily table ───────────────────────────────────────────────── */}
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
              {["Date", "Rain mm", "ET₀ mm", "Balance mm", "Tmin °C", "Tmax °C"].map((h, i) => (
                <th
                  key={h}
                  className={`border-b border-divider py-2.5 font-normal uppercase ${
                    i === 0 ? "px-4 text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {future.map((d) => {
              const bal = (d.precip ?? 0) - (d.et0 ?? 0);
              return (
                <tr key={d.date} className="transition-colors hover:bg-neutral-100">
                  <td className="border-b border-divider px-4 py-2.25 font-mono text-[12px]">{d.date}</td>
                  <td className="border-b border-divider text-right font-mono">
                    {d.precip == null ? "—" : d.precip.toFixed(1)}
                  </td>
                  <td className="border-b border-divider text-right font-mono">
                    {d.et0 == null ? "—" : d.et0.toFixed(1)}
                  </td>
                  <td
                    className="border-b border-divider text-right font-mono"
                    style={{ color: bal < 0 ? "#EE8434" : "var(--ap-teal)" }}
                  >
                    {bal.toFixed(1)}
                  </td>
                  <td className="border-b border-divider text-right font-mono">
                    {d.tmin == null ? "—" : d.tmin.toFixed(1)}
                  </td>
                  <td className="border-b border-divider text-right font-mono">
                    {d.tmax == null ? "—" : d.tmax.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

/**
 * FAO-56 single-coefficient depletion, seeded from the station's last
 * modelled state and carried forward across the forecast.
 */
function runBalance(days: ForecastPayload["days"], station: Station) {
  const taw = SOIL_MODEL.tawMm;
  const seed = station.recent[station.recent.length - 1]?.soilFraction ?? 0.5;
  const out: { date: string; storage: number; forecast: boolean }[] = [];
  let depletion = taw * (1 - seed);
  for (const d of days) {
    depletion = Math.min(taw, Math.max(0, depletion + (d.et0 ?? 0) - (d.precip ?? 0)));
    out.push({
      date: d.date,
      storage: +(SOIL_MODEL.wiltingPointMm + (taw - depletion)).toFixed(1),
      forecast: d.forecast,
    });
  }
  return out;
}

const W = 880;
const H = 220;
const PAD = { l: 40, r: 12, t: 14, b: 26 };

function DailyChart({ days }: { days: { date: string; precip: number | null; et0: number | null; forecast: boolean }[] }) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const maxRain = Math.max(...days.map((d) => d.precip ?? 0), 10);
  const maxEt = Math.max(...days.map((d) => d.et0 ?? 0), 5);
  const max = Math.max(maxRain, maxEt);
  const bw = innerW / days.length;
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const firstFuture = days.findIndex((d) => d.forecast);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH * f} y2={PAD.t + innerH * f} />
        ))}
      </g>

      {days.map((d, i) => {
        const v = d.precip ?? 0;
        const h = (v / max) * innerH;
        return (
          <rect
            key={d.date}
            x={PAD.l + i * bw}
            y={PAD.t + innerH - h}
            width={Math.max(0.8, bw - 0.6)}
            height={h}
            fill="var(--ap-teal)"
            fillOpacity={d.forecast ? 0.55 : 0.9}
          >
            <title>
              {d.date}: {v.toFixed(1)} mm
            </title>
          </rect>
        );
      })}

      <path
        d={"M" + days.map((d, i) => `${(PAD.l + i * bw + bw / 2).toFixed(1)} ${y(d.et0 ?? 0).toFixed(1)}`).join("L")}
        fill="none"
        stroke="#EE8434"
        strokeWidth={1.5}
      />

      {firstFuture > 0 && (
        <line
          x1={PAD.l + firstFuture * bw}
          x2={PAD.l + firstFuture * bw}
          y1={PAD.t}
          y2={PAD.t + innerH}
          style={{ stroke: "var(--ap-text)", strokeOpacity: 0.5 }}
          strokeDasharray="3 3"
        />
      )}

      <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
        <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end">{max.toFixed(0)}</text>
        <text x={PAD.l - 6} y={PAD.t + innerH} textAnchor="end">0</text>
        <text x={PAD.l} y={H - 8}>{days[0].date}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end">{days[days.length - 1].date}</text>
      </g>
    </svg>
  );
}

function BalanceChart({ rows }: { rows: { date: string; storage: number; forecast: boolean }[] }) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = SOIL_MODEL.fieldCapacityMm;
  const min = SOIL_MODEL.wiltingPointMm - 8;
  const y = (v: number) => PAD.t + innerH - ((v - min) / (max - min)) * innerH;
  const x = (i: number) => PAD.l + (i / (rows.length - 1)) * innerW;
  const firstFuture = rows.findIndex((d) => d.forecast);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      <line x1={PAD.l} x2={W - PAD.r} y1={y(max)} y2={y(max)} style={{ stroke: "var(--ap-teal)" }} strokeDasharray="4 3" />
      <text x={W - PAD.r} y={y(max) - 5} textAnchor="end" style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-teal)" }} fontSize={9}>
        FIELD CAPACITY {max}
      </text>
      <line
        x1={PAD.l}
        x2={W - PAD.r}
        y1={y(SOIL_MODEL.wiltingPointMm)}
        y2={y(SOIL_MODEL.wiltingPointMm)}
        stroke="#D96565"
        strokeDasharray="4 3"
      />
      <text
        x={W - PAD.r}
        y={y(SOIL_MODEL.wiltingPointMm) - 5}
        textAnchor="end"
        style={{ fontFamily: "var(--font-mono)" }}
        fill="#E07B7B"
        fontSize={9}
      >
        WILTING POINT {SOIL_MODEL.wiltingPointMm}
      </text>

      <path
        d={"M" + rows.map((r, i) => `${x(i).toFixed(1)} ${y(r.storage).toFixed(1)}`).join("L")}
        fill="none"
        style={{ stroke: "var(--ap-text)" }}
        strokeWidth={1.75}
      />

      {firstFuture > 0 && (
        <line
          x1={x(firstFuture)}
          x2={x(firstFuture)}
          y1={PAD.t}
          y2={PAD.t + innerH}
          style={{ stroke: "var(--ap-text)", strokeOpacity: 0.5 }}
          strokeDasharray="3 3"
        />
      )}

      <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
        <text x={PAD.l - 6} y={y(max) + 4} textAnchor="end">{max}</text>
        <text x={PAD.l - 6} y={y(min) } textAnchor="end">{min}</text>
        <text x={PAD.l} y={H - 8}>{rows[0].date}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end">{rows[rows.length - 1].date}</text>
      </g>
    </svg>
  );
}
