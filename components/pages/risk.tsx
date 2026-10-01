"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type SurfaceInfo } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Panel, ButtonLink, PageHeader, RiskBadge, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CardTitle, StatTile } from "@/components/ui/simple";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { stationForSite, latestSpei, latestSpi, type Station } from "@/lib/climate";
import { conditionsFor, indexBand, spanLabel, MONTH_ABBR } from "@/lib/metrics";
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
  const [surface, setSurface] = React.useState<SurfaceInfo | null>(null);
  const onSurface = React.useCallback((info: SurfaceInfo) => setSurface(info), []);
  const cond = React.useMemo(() => conditionsFor(station), [station]);

  const spei3 = cond.spei3;
  const level = spei3 ? speiToLevel(spei3.value) : null;

  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Drought risk"
        lede={
          spei3 ? (
            <>
              Over the three months to {monthWord(spei3.label)} {spei3.label.split(" ")[1]}, {station.name} is{" "}
              <strong className="font-semibold text-ink">{indexBand(spei3.value)}</strong> compared with the same
              months in the last {station.coverage.years} years.
            </>
          ) : (
            "No drought index for the latest month."
          )
        }
      />

      {/* ── Standing ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndexTile label="Water balance · SPEI-3" icon="gauge" value={spei3?.value ?? null} month={spei3?.label ?? null} />
        <IndexTile label="Rainfall only · SPI-3" icon="rain" value={cond.spi3?.value ?? null} month={cond.spi3?.label ?? null} />
        <StatTile
          icon="droplet"
          label="Rain in 30 days"
          value={cond.rain30}
          unit="mm"
          note={
            cond.rain30Normal == null ? (
              "No normal to compare"
            ) : (
              <>
                Normal is {cond.rain30Normal} mm
                {cond.rain30Anomaly != null && (
                  <span style={{ color: cond.rain30Anomaly < 0 ? "#EE8434" : "var(--ap-accent)" }}>
                    {" "}
                    ({cond.rain30Anomaly > 0 ? "+" : ""}
                    {cond.rain30Anomaly}%)
                  </span>
                )}
              </>
            )
          }
        />
        <StatTile
          icon="sun"
          tint="#E7A83B"
          label="Days since rain"
          value={cond.dryDays}
          unit={cond.dryDays === 1 ? "day" : "days"}
          note={`At least 1 mm · to ${fmtDate(cond.asOf)}`}
        />
      </div>

      {/* ── Standing + explanation ────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel className="flex flex-col items-center gap-3 px-6 py-5">
          <CardTitle className="w-full" title="Where this month sits" sub={`SPEI-3 · ${spei3 ? mon(spei3.label) : "—"}`} />
          {spei3 ? (
            <>
              <SpeiDial value={spei3.value} />
              <span className="-mt-3 text-[52px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                {spei3.value.toFixed(2)}
              </span>
              {level && <RiskBadge level={level} showScore={false} />}
              <span className="text-center text-[13.5px] text-muted">{indexBand(spei3.value)}</span>
            </>
          ) : (
            <div className="py-10 text-[13.5px] text-muted">Not fitted for this month.</div>
          )}
        </Panel>

        <Panel className="flex flex-col gap-4 px-6 py-5">
          <CardTitle
            title="What the number means"
            sub={`Compared with every other ${spei3 ? monthWord(spei3.label) : "month"} since ${station.coverage.from.slice(0, 4)}`}
          />
          <p className="m-0 text-[14px] leading-[1.6] text-muted text-pretty">
            The index takes the rain that fell minus the water the air could evaporate, over three months, and
            ranks it against the same months in past years. Zero is a normal year; below &minus;1 is drier than
            about 84% of years, which counts as drought.
          </p>

          <div className="flex flex-col gap-2.5">
            {BANDS.map((b) => {
              const active = spei3 != null && spei3.value > b.from && spei3.value <= b.to;
              return (
                <div
                  key={b.label}
                  className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px]"
                  style={{ background: active ? `color-mix(in srgb, ${b.color} 14%, transparent)` : undefined }}
                >
                  <span className="size-2.5 rounded-full" style={{ background: b.color, opacity: active ? 1 : 0.5 }} />
                  <span className={active ? "font-semibold text-ink" : "text-muted"}>
                    {b.label}
                    {active && <span className="ml-2 font-normal text-muted">&larr; now</span>}
                  </span>
                  <span className="text-[12.5px] text-faint tabular-nums">{b.range}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap gap-2.5">
            <ButtonLink href="/app/drivers" size="sm">
              How the map is weighted
              <Icon name="arrow" size={14} />
            </ButtonLink>
            <Link href="/app/history" className="flex items-center px-1 text-[13px] text-accent no-underline hover:underline">
              Compare with past years
            </Link>
          </div>
        </Panel>
      </div>

      <IndexScales station={station} />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "trend", label: "Past 30 years" },
          { value: "spatial", label: "Risk map today" },
        ]}
      />

      {tab === "trend" ? (
        <Panel className="flex flex-col gap-3 px-5 py-5">
          <CardTitle
            title={`Every month since ${station.coverage.from.slice(0, 4)}`}
            sub="SPEI-3: bars below −1 are drought months"
            right={
              <span className="flex gap-3.5 text-[12.5px] text-muted">
                <Swatch color="var(--ap-accent)" label="Wetter" />
                <Swatch color="#E7A83B" label="Slightly dry" />
                <Swatch color="#D96565" label="Drought" />
              </span>
            }
          />
          <SpeiSeries station={station} />
        </Panel>
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

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
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

/**
 * Every standardised index the record supports, at every fitted timescale.
 *
 * Both are computed the same way and differ only in what goes in: SPEI
 * accumulates P − ET₀, so it feels evaporative demand, while SPI accumulates
 * rainfall alone. Reading them together separates a dry spell caused by heat
 * from one caused by absent rain. The timescales matter as much: a short one
 * reacts to the last few weeks, a long one carries the whole year.
 */
function IndexScales({ station }: { station: Station }) {
  const rows = [
    { name: "Water balance", code: "SPEI", scales: [1, 3, 6, 12], latest: (k: number) => latestSpei(station, k as 1 | 3 | 6 | 12) },
    // SPI has no six-month fit in the record.
    { name: "Rainfall only", code: "SPI", scales: [1, 3, 12], latest: (k: number) => latestSpi(station, k as 1 | 3 | 12) },
  ];
  const scaleName: Record<number, string> = { 1: "1 month", 3: "3 months", 6: "6 months", 12: "12 months" };

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <CardTitle
        title="Short and long term"
        sub="The same index over different spans: short spans react to recent weeks, long ones carry the whole year"
      />
      {rows.map((r) => (
        <div key={r.code} className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">
            {r.name} <span className="font-normal text-faint">({r.code})</span>
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {r.scales.map((k) => {
              const l = r.latest(k);
              const v = l?.value ?? null;
              const c = bandColor(v);
              return (
                <div
                  key={k}
                  className="flex flex-col gap-1 rounded-[12px] border border-divider px-3.5 py-3"
                  style={{ background: v == null ? undefined : `color-mix(in srgb, ${c} 8%, transparent)` }}
                >
                  <span className="flex items-center justify-between gap-2 text-[12.5px] text-muted">
                    {scaleName[k]}
                    <span className="size-2 rounded-full" style={{ background: v == null ? "transparent" : c }} />
                  </span>
                  {v == null ? (
                    <span className="text-[13px] text-faint">Not fitted</span>
                  ) : (
                    <>
                      <span className="text-[22px] font-semibold leading-none tabular-nums">
                        {v > 0 ? "+" : ""}
                        {v.toFixed(2)}
                      </span>
                      <span className="text-[12px] text-muted">
                        {indexBand(v)} · {l ? mon(spanLabel(l.month, k)) : ""}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Panel>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

const BANDS = [
  { label: "Extremely dry", range: "≤ −2.0", from: -99, to: -2, color: "#D96565" },
  { label: "Severely dry", range: "−2.0 to −1.5", from: -2, to: -1.5, color: "#EE8434" },
  { label: "Moderately dry", range: "−1.5 to −1.0", from: -1.5, to: -1, color: "#E7A83B" },
  { label: "Near normal", range: "−1.0 to 1.0", from: -1, to: 1, color: "#38A88A" },
  { label: "Wet", range: "≥ 1.0", from: 1, to: 99, color: "#2BA6B8" },
];

function bandColor(v: number | null) {
  if (v == null) return "var(--ap-muted)";
  return BANDS.find((b) => v > b.from && v <= b.to)?.color ?? "#2BA6B8";
}

function speiToLevel(v: number) {
  if (v <= -2) return "extreme" as const;
  if (v <= -1.5) return "severe" as const;
  if (v <= -1) return "watch" as const;
  return "safe" as const;
}

/** "OCT–DEC 2025" → "Oct–Dec 2025": month labels are stored in capitals. */
const mon = (label: string) => label.replace(/\b([A-Z])([A-Z]{2})\b/g, (_, a: string, b: string) => a + b.toLowerCase());

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function monthWord(label: string) {
  const m = label.split(" ")[0];
  const i = MONTH_ABBR.indexOf(m);
  return i >= 0
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i]
    : "month";
}

function IndexTile({
  label,
  icon,
  value,
  month,
}: {
  label: string;
  icon: "gauge" | "rain";
  value: number | null;
  month: string | null;
}) {
  return (
    <StatTile
      icon={icon}
      tint={bandColor(value)}
      label={label}
      value={value == null ? "—" : value.toFixed(2)}
      badge={value != null ? <RiskBadge level={speiToLevel(value)} showScore={false} /> : undefined}
      note={value == null ? "Not fitted" : `${indexBand(value)} · three months to ${month ? mon(month) : "—"}`}
    />
  );
}

/** A linear scale from −3 to +3 with the current value marked. */
function SpeiDial({ value }: { value: number }) {
  const clamped = Math.max(-3, Math.min(3, value));
  const pct = ((clamped + 3) / 6) * 100;
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-2 pt-4">
      <div className="relative h-3 rounded-full">
        <div
          className="absolute inset-0 rounded-full opacity-85"
          style={{
            background:
              "linear-gradient(to right, #D96565 0%, #EE8434 16%, #E7A83B 25%, #38A88A 50%, #2BA6B8 75%, #9EDFF1 100%)",
          }}
        />
        <motion.span
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--ap-bg)] bg-[var(--ap-text)] shadow"
          animate={{ left: `${pct}%` }}
          initial={false}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <div className="flex justify-between text-[12px] text-faint tabular-nums">
        {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
          <span key={t}>{t > 0 ? `+${t}` : t}</span>
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        <span>Drier</span>
        <span>Wetter</span>
      </div>
    </div>
  );
}

function SpeiSeries({ station }: { station: Station }) {
  const series = station.spei["3"];
  const [ref, w] = useElementWidth<HTMLDivElement>(880);
  const h = 220;
  const padL = 34;
  const padB = 26;
  const padR = 10;
  const innerW = w - padL - padR;
  const innerH = h - 12 - padB;
  const bw = innerW / series.length;
  const scale = 3;
  const y = (v: number) => 12 + innerH / 2 - (Math.max(-scale, Math.min(scale, v)) / scale) * (innerH / 2);
  const zero = y(0);

  const hover = useBarHover(series.length, padL, padR, w);
  const atMonth = hover.index == null ? null : station.months[hover.index];
  const atValue = hover.index == null ? null : series[hover.index];

  // A label every five years, starting from the first January.
  const yearTicks = station.months
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.m === 1 && m.y % 5 === 0);

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={padL} right={padR} width={w}>
        {atMonth && (
          <>
            {MONTH_ABBR[atMonth.m - 1]} {atMonth.y} &middot;{" "}
            {atValue == null ? "no value" : `${atValue > 0 ? "+" : ""}${atValue.toFixed(2)} · ${indexBand(atValue)}`}
          </>
        )}
      </HoverReadout>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {[-2, -1, 1, 2].map((t) => (
            <line key={t} x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} strokeDasharray={t === -1 ? "3 3" : undefined} />
          ))}
        </g>

        {series.map((v, i) => {
          if (v == null) return null;
          const top = Math.min(y(v), zero);
          const hh = Math.abs(y(v) - zero);
          return (
            <rect
              key={i}
              x={padL + i * bw}
              y={top}
              width={Math.max(0.8, bw - 0.6)}
              height={Math.max(0.6, hh)}
              rx={Math.min(1.5, bw / 3)}
              fill={v <= -1 ? "#D96565" : v < 0 ? "#E7A83B" : "var(--ap-accent)"}
              fillOpacity={hover.index === i ? 1 : 0.8}
            />
          );
        })}

        <HoverGuide hover={hover} left={padL} right={padR} width={w} top={12} bottom={h - padB} />
        <line x1={padL} x2={w - padR} y1={zero} y2={zero} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }} />

        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {[2, 0, -2].map((t) => (
            <text key={t} x={padL - 8} y={y(t) + 4} textAnchor="end">
              {t > 0 ? `+${t}` : t}
            </text>
          ))}
          {yearTicks.map((m) => (
            <text key={m.i} x={padL + m.i * bw} y={h - 6} textAnchor="middle">
              {m.y}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

export { riskLevel };
