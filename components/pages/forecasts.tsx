"use client";

import * as React from "react";
import { useConsole } from "@/components/app-context";
import { Icon } from "@/components/icon";
import { Panel, PageHeader } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { CardTitle, StatTile } from "@/components/ui/simple";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
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
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Forecasts"
        lede={
          data
            ? `Weather at ${station.name} for the next ${data.horizonDays} days, to ${fmtDay(data.days[data.days.length - 1].date, true)}.`
            : "Loading the forecast…"
        }
      />

      {error && (
        <NoData
          icon="cloud"
          title="Forecast unavailable"
          what="The weather service could not be reached, so there is nothing to show. The 30-year station record on Historical Comparison is unaffected."
          needs="connection to Open-Meteo"
        />
      )}

      {data && <ForecastBody station={station} data={data} />}
    </div>
  );
}

const fmtDay = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
const weekday = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });

function ForecastBody({ station, data }: { station: Station; data: ForecastPayload }) {
  const days = data.days;
  const future = days.filter((d) => d.forecast);
  const [showTable, setShowTable] = React.useState(false);

  const sum = (rows: typeof days, k: "precip" | "et0") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);

  const next7 = future.slice(0, 7);
  const next14 = future.slice(0, 14);
  const bal7 = sum(next7, "precip") - sum(next7, "et0");

  /* Root-zone balance carried forward day by day over the whole window. */
  const balance = React.useMemo(() => runBalance(days, station), [days, station]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="rain" label="Rain, next 7 days" value={sum(next7, "precip").toFixed(1)} unit="mm" />
        <StatTile icon="cloud" tint="#7B8FD9" label="Rain, next 14 days" value={sum(next14, "precip").toFixed(1)} unit="mm" />
        <StatTile
          icon="sun"
          tint="#EE8434"
          label="Evaporation, next 7 days"
          value={sum(next7, "et0").toFixed(1)}
          unit="mm"
          note="Water the air can draw from soil and crops (ET₀)"
        />
        <StatTile
          icon="droplet"
          tint={bal7 < 0 ? "#EE8434" : "var(--ap-accent)"}
          label="Water balance, next 7 days"
          value={
            <span style={{ color: bal7 < 0 ? "#EE8434" : "var(--ap-accent)" }}>
              {bal7 > 0 ? "+" : ""}
              {bal7.toFixed(1)}
            </span>
          }
          unit="mm"
          note={bal7 < 0 ? "Soil drying out: more evaporation than rain" : "More rain than evaporation"}
        />
      </div>

      {/* ── Next seven days, one card each ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {next7.map((d, i) => {
          const wet = (d.precip ?? 0) >= 1;
          return (
            <div key={d.date} className={`panel flex flex-col items-center gap-1.5 px-3 py-4 text-center ${i === 0 ? "!border-accent" : ""}`}>
              <span className="text-[13px] font-semibold">{i === 0 ? "Today" : weekday(d.date)}</span>
              <span className="text-[12px] text-muted">{fmtDay(d.date)}</span>
              <span
                className="my-1 grid size-10 place-items-center rounded-full"
                style={{
                  color: wet ? "var(--ap-accent)" : "#E7A83B",
                  background: `color-mix(in srgb, ${wet ? "var(--ap-accent)" : "#E7A83B"} 14%, transparent)`,
                }}
              >
                <Icon name={wet ? "rain" : "sun"} size={20} strokeWidth={1.8} />
              </span>
              <span className="text-[15px] font-semibold tabular-nums">
                {d.tmax == null ? "—" : `${Math.round(d.tmax)}°`}
                <span className="font-normal text-muted"> / {d.tmin == null ? "—" : `${Math.round(d.tmin)}°`}</span>
              </span>
              <span className="text-[12.5px] text-muted tabular-nums">
                {(d.precip ?? 0) < 0.1 ? "No rain" : `${(d.precip ?? 0).toFixed(1)} mm`}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Daily rain + ET0 ──────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-5">
        <CardTitle
          title="Rain and evaporation, day by day"
          sub="Last 60 days and the forecast ahead, in mm"
          right={
            <span className="flex flex-wrap gap-3.5 text-[12.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-accent" />
                Rain
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: "#EE8434" }} />
                Evaporation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded-[3px] bg-neutral-100" />
                Forecast
              </span>
            </span>
          }
        />
        <DailyChart days={days} />
        <Provenance>
          {data.source} &middot; issued {fmtDay(data.generatedAt)}{" "}
          {new Date(data.generatedAt).toISOString().slice(11, 16)} UTC
        </Provenance>
      </Panel>

      {/* ── Water balance ─────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-5">
        <CardTitle
          title="Water left in the soil (modelled)"
          sub="Estimated from rain and evaporation, not measured. See Sensors for S.Sensor's readings."
        />
        <BalanceChart rows={balance} />
      </Panel>

      {/* ── Daily table, on demand ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex w-fit items-center gap-1.5 text-[13px] text-accent hover:underline"
        >
          <Icon name={showTable ? "up" : "down"} size={14} />
          {showTable ? "Hide daily table" : `Show all ${future.length} forecast days as a table`}
        </button>
        {showTable && (
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
              <thead>
                <tr className="text-[12.5px] text-muted">
                  {["Day", "Rain", "Evaporation", "Balance", "Low", "High"].map((h, i) => (
                    <th key={h} className={`border-b border-divider py-3 font-normal ${i === 0 ? "px-5 text-left" : "pr-5 text-right"}`}>
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
                      <td className="border-b border-divider px-5 py-2.5">
                        {weekday(d.date)} {fmtDay(d.date)}
                      </td>
                      <td className="border-b border-divider pr-5 text-right tabular-nums">
                        {d.precip == null ? "—" : `${d.precip.toFixed(1)} mm`}
                      </td>
                      <td className="border-b border-divider pr-5 text-right tabular-nums">
                        {d.et0 == null ? "—" : `${d.et0.toFixed(1)} mm`}
                      </td>
                      <td
                        className="border-b border-divider pr-5 text-right tabular-nums"
                        style={{ color: bal < 0 ? "#EE8434" : "var(--ap-accent)" }}
                      >
                        {bal > 0 ? "+" : ""}
                        {bal.toFixed(1)} mm
                      </td>
                      <td className="border-b border-divider pr-5 text-right tabular-nums">
                        {d.tmin == null ? "—" : `${d.tmin.toFixed(0)}°C`}
                      </td>
                      <td className="border-b border-divider pr-5 text-right tabular-nums">
                        {d.tmax == null ? "—" : `${d.tmax.toFixed(0)}°C`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
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

const H = 230;
const PAD = { l: 40, r: 12, t: 14, b: 28 };

/** Month-start ticks across a daily series, as x-positions and labels. */
function monthTicks(dates: string[], x: (i: number) => number) {
  const ticks = dates
    .map((d, i) => ({ d, i }))
    .filter(({ d }, k) => k === 0 || d.slice(8, 10) === "01")
    .map(({ d, i }) => ({ x: x(i), label: fmtDay(d) }));
  // Drop the opening date when the first month start sits right next to it.
  return ticks.length > 1 && ticks[1].x - ticks[0].x < 70 ? ticks.slice(1) : ticks;
}

function DailyChart({ days }: { days: { date: string; precip: number | null; et0: number | null; forecast: boolean }[] }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const maxRain = Math.max(...days.map((d) => d.precip ?? 0), 10);
  const maxEt = Math.max(...days.map((d) => d.et0 ?? 0), 5);
  const max = Math.ceil(Math.max(maxRain, maxEt) / 5) * 5;
  const bw = innerW / days.length;
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const firstFuture = days.findIndex((d) => d.forecast);

  const hover = useBarHover(days.length, PAD.l, PAD.r, W);
  const at = hover.index == null ? null : days[hover.index];
  const ticks = monthTicks(days.map((d) => d.date), (i) => PAD.l + i * bw);

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={PAD.l} right={PAD.r} width={W}>
        {at && (
          <>
            {weekday(at.date)} {fmtDay(at.date)} &middot; rain {(at.precip ?? 0).toFixed(1)} mm &middot; evaporation{" "}
            {(at.et0 ?? 0).toFixed(1)} mm{at.forecast ? " · forecast" : ""}
          </>
        )}
      </HoverReadout>
      <svg width={W} height={H} className="block">
        {firstFuture >= 0 && (
          <rect
            x={PAD.l + firstFuture * bw}
            y={PAD.t}
            width={innerW - firstFuture * bw}
            height={innerH}
            rx={6}
            style={{ fill: "var(--ap-neutral-100)" }}
          />
        )}
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
              x={PAD.l + i * bw + 0.5}
              y={PAD.t + innerH - h}
              width={Math.max(1, bw - 1.5)}
              height={h}
              rx={Math.min(2, bw / 3)}
              fill="var(--ap-accent)"
              fillOpacity={hover.index === i ? 1 : 0.8}
            />
          );
        })}

        <HoverGuide hover={hover} left={PAD.l} right={PAD.r} width={W} top={PAD.t} bottom={PAD.t + innerH} />

        <path
          d={"M" + days.map((d, i) => `${(PAD.l + i * bw + bw / 2).toFixed(1)} ${y(d.et0 ?? 0).toFixed(1)}`).join("L")}
          fill="none"
          stroke="#EE8434"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {firstFuture > 0 && (
          <text x={PAD.l + firstFuture * bw + 8} y={PAD.t + 16} fontSize={12} style={{ fill: "var(--ap-muted)" }}>
            Forecast
          </text>
        )}

        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          <text x={PAD.l - 8} y={PAD.t + 4} textAnchor="end">
            {max}
          </text>
          <text x={PAD.l - 8} y={PAD.t + innerH / 2 + 4} textAnchor="end">
            {max / 2}
          </text>
          <text x={PAD.l - 8} y={PAD.t + innerH + 4} textAnchor="end">
            0
          </text>
          {ticks.map((t) => (
            <text key={t.label} x={t.x} y={H - 8}>
              {t.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function BalanceChart({ rows }: { rows: { date: string; storage: number; forecast: boolean }[] }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const h = 200;
  const innerW = W - PAD.l - PAD.r;
  const innerH = h - PAD.t - PAD.b;
  const max = SOIL_MODEL.fieldCapacityMm;
  const wp = SOIL_MODEL.wiltingPointMm;
  const min = wp - 8;
  const y = (v: number) => PAD.t + innerH - ((v - min) / (max - min)) * innerH;
  const x = (i: number) => PAD.l + (i / (rows.length - 1)) * innerW;
  const firstFuture = rows.findIndex((d) => d.forecast);
  const line = rows.map((r, i) => `${x(i).toFixed(1)} ${y(r.storage).toFixed(1)}`).join("L");
  const ticks = monthTicks(rows.map((r) => r.date), x);

  return (
    <div ref={ref}>
      <svg width={W} height={h} className="block">
        {firstFuture >= 0 && (
          <rect
            x={x(firstFuture)}
            y={PAD.t}
            width={innerW - (x(firstFuture) - PAD.l)}
            height={innerH}
            rx={6}
            style={{ fill: "var(--ap-neutral-100)" }}
          />
        )}
        {/* Healthy band between wilting point and field capacity. */}
        <rect x={PAD.l} y={y(max)} width={innerW} height={y(wp) - y(max)} fill="#38A88A" fillOpacity={0.06} />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(max)} y2={y(max)} style={{ stroke: "var(--ap-accent)" }} strokeDasharray="4 4" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(wp)} y2={y(wp)} stroke="#D96565" strokeDasharray="4 4" />

        <path d={`M${line}L${x(rows.length - 1)} ${y(min)}L${PAD.l} ${y(min)}Z`} fill="var(--ap-accent)" fillOpacity={0.12} />
        <path d={`M${line}`} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={2} strokeLinejoin="round" />

        <g fontSize={12}>
          <text x={W - PAD.r - 4} y={y(max) - 6} textAnchor="end" style={{ fill: "var(--ap-accent)" }}>
            Soil full ({max} mm)
          </text>
          <text x={W - PAD.r - 4} y={y(wp) - 6} textAnchor="end" fill="#E07B7B">
            Plants wilt ({wp} mm)
          </text>
        </g>
        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {ticks.map((t) => (
            <text key={t.label} x={t.x} y={h - 8}>
              {t.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
