"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type SurfaceInfo } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Panel, ButtonLink, PageHeader, RiskBadge, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { useBarHover, HoverReadout, HoverGuide } from "@/components/ui/chart-hover";
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
    <div className="relative flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <div
        className="pointer-events-none absolute left-0 top-10 h-[420px] w-[640px]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; DROUGHT INDICES &middot; {station.name.toUpperCase()} &middot;{" "}
            {station.coverage.from.slice(0, 4)}&ndash;{station.coverage.to.slice(0, 4)}
          </>
        }
        title="Drought standing"
        lede={
          spei3 ? (
            <>
              SPEI-3 for {spei3.label} is{" "}
              <strong className="font-medium text-ink">{spei3.value.toFixed(2)}</strong> &mdash;{" "}
              {indexBand(spei3.value)} against the {station.coverage.years}-year distribution for that month.
            </>
          ) : (
            "No fitted index for the latest month."
          )
        }
      />

      {/* ── Index standing ────────────────────────────────────────────── */}
      <Panel className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <IndexCell
          label="SPEI-3"
          sub="water balance"
          value={spei3?.value ?? null}
          month={spei3?.label ?? null}
        />
        <IndexCell
          label="SPI-3"
          sub="rainfall only"
          value={cond.spi3?.value ?? null}
          month={cond.spi3?.label ?? null}
        />
        <div className="flex flex-col gap-2 border-b border-divider px-5 py-4.5 xl:border-b-0 xl:border-r">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">RAIN &middot; LAST 30 D</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-heading text-[40px] font-semibold leading-none tabular-nums">{cond.rain30}</span>
            <span className="font-mono text-xs text-muted">mm</span>
          </span>
          <span className="font-mono text-[11px] text-muted">
            {cond.rain30Normal == null ? (
              "no comparable window"
            ) : (
              <>
                normal {cond.rain30Normal} mm
                {cond.rain30Anomaly != null && (
                  <span style={{ color: cond.rain30Anomaly < 0 ? "#EE8434" : "var(--ap-teal)" }}>
                    {" "}
                    {cond.rain30Anomaly > 0 ? "+" : ""}
                    {cond.rain30Anomaly}%
                  </span>
                )}
              </>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-2 px-5 py-4.5">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">DAYS SINCE 1 mm</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-heading text-[40px] font-semibold leading-none tabular-nums">{cond.dryDays}</span>
            <span className="font-mono text-xs text-muted">days</span>
          </span>
          <span className="font-mono text-[11px] text-muted">to {cond.asOf}</span>
        </div>
      </Panel>

      {/* ── Standing + explanation ────────────────────────────────────── */}
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel className="flex flex-col items-center gap-3 px-6 py-5">
          <div className="flex w-full justify-between font-mono text-[10.5px] tracking-[0.1em] text-muted">
            <span>SPEI-3 &middot; {spei3?.label ?? "—"}</span>
            <span>{station.name}</span>
          </div>
          {spei3 ? (
            <>
              <SpeiDial value={spei3.value} />
              <div className="-mt-6 flex items-baseline gap-2">
                <span className="font-heading text-[56px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                  {spei3.value.toFixed(2)}
                </span>
              </div>
              {level && <RiskBadge level={level} showScore={false} />}
              <span className="text-center text-[13px] text-muted">{indexBand(spei3.value)}</span>
            </>
          ) : (
            <div className="py-10 text-[13px] text-muted">Not fitted for this month.</div>
          )}
          <Provenance>
            log-logistic fitted per calendar month over {station.coverage.years} years
          </Provenance>
        </Panel>

        <Panel
          className="flex flex-col gap-4 px-6 py-5.5"
          style={{ background: "linear-gradient(180deg, var(--ap-accent-100), transparent 60%)" }}
        >
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] text-accent">
            <Icon name="gauge" size={14} />
            WHAT THE INDEX MEANS
          </div>
          <div className="font-heading text-[clamp(18px,2.2vw,24px)] font-semibold leading-[1.2] tracking-[-0.01em] text-pretty">
            SPEI compares this month&rsquo;s water balance against every other {spei3 ? monthWord(spei3.label) : "month"}{" "}
            in the record.
          </div>
          <div className="text-sm leading-[1.65] text-muted text-pretty">
            The balance is rainfall minus reference evapotranspiration, accumulated over three months and fitted to
            a log-logistic distribution separately for each calendar month. That removes the seasonal cycle, so a
            value of &minus;1.5 in August means the same thing as &minus;1.5 in January: drier than roughly 93% of
            years.
          </div>

          <div className="flex flex-col gap-2 border-t border-divider pt-3.5">
            {BANDS.map((b) => {
              const active = spei3 != null && spei3.value > b.from && spei3.value <= b.to;
              return (
                <div key={b.label} className="grid grid-cols-[110px_minmax(0,1fr)_84px] items-center gap-3 text-[13px]">
                  <span className="font-mono text-[11px]" style={{ color: active ? b.color : "var(--ap-muted)" }}>
                    {b.range}
                  </span>
                  <div className="h-2 bg-neutral-100">
                    <div className="h-full" style={{ width: active ? "100%" : "0%", background: b.color, transition: "width .4s" }} />
                  </div>
                  <span style={{ color: active ? "var(--ap-text)" : "var(--ap-muted)", fontWeight: active ? 600 : 400 }}>
                    {b.label}
                  </span>
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
              Compare against the full record
            </Link>
          </div>
        </Panel>
      </div>

      <IndexScales station={station} />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "trend", label: "SPEI history" },
          { value: "spatial", label: "Live risk surface" },
        ]}
      />

      {tab === "trend" ? (
        <Panel className="flex flex-col gap-3 px-5 py-4.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-heading text-lg font-semibold">
              SPEI-3 &middot; every fitted month, {station.coverage.from.slice(0, 4)}&ndash;
              {station.coverage.to.slice(0, 4)}
            </span>
            <span className="font-mono text-[10.5px] text-muted">
              {station.spei["3"].filter((v) => v != null).length} fitted of {station.months.length} months
            </span>
          </div>
          <SpeiSeries station={station} />
          <Provenance>Bars below &minus;1 are the months the index classes as in drought</Provenance>
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
        <span className="font-mono text-[11px] text-muted">Computing weights…</span>
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
  const sumH = rows.reduce((a, r) => a + r.entropy, 0);

  return (
    <Panel className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3.5">
        <span className="font-heading text-lg font-semibold">Factor comparison</span>
        <span className="font-mono text-[10.5px] text-muted">ENTROPY WEIGHT METHOD</span>
      </div>

      {/* The headline the page exists to answer. */}
      <div className="flex flex-col gap-1.5 border-b border-divider px-5 py-4">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">MOST IMPACTING FACTOR</span>
        <div className="flex items-baseline gap-2.5">
          <span className="font-heading text-[26px] font-semibold leading-none">{top.label}</span>
          <span className="font-mono text-sm text-accent">{(top.weight * 100).toFixed(1)}%</span>
        </div>
        <span className="text-[12.5px] leading-[1.5] text-muted">
          Lowest entropy of the {rows.length} factors at H = {top.entropy.toFixed(4)}, so its values are the most
          dispersed across the region and it carries the most information.
        </span>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {rows.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex items-baseline gap-2">
                {f.label}
                <span className="font-mono text-[10px] text-faint">
                  {f.direction === "positive" ? "↑ wetter" : "↓ drier"}
                </span>
                {f.note && <span className="font-mono text-[10px] text-faint">{f.note}</span>}
              </span>
              <span className="font-mono text-[11.5px] tabular-nums">{(f.weight * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-s3">
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(f.weight / maxWeight) * 100}%`,
                  background: f.key === top.key ? "var(--ap-accent)" : "var(--ap-teal)",
                  opacity: f.key === top.key ? 1 : 0.55,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted">H = {f.entropy.toFixed(4)}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-divider px-5 py-3.5 font-mono text-[10.5px] text-muted">
        <div className="flex justify-between">
          <span>Σ WEIGHTS</span>
          <span className="text-ink">{(rows.reduce((a, r) => a + r.weight, 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>K − ΣH</span>
          <span className="text-ink">{(rows.length - sumH).toFixed(4)}</span>
        </div>
      </div>
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
  const SPEI = [1, 3, 6, 12] as const;
  const SPI = [1, 3, 12] as const;

  const cell = (v: number | null, window: string | null) => {
    if (v == null) return <span className="font-mono text-[11px] text-faint">not fitted</span>;
    return (
      <>
        <span className="font-heading text-[22px] font-semibold leading-none tabular-nums">
          {v > 0 ? "+" : ""}
          {v.toFixed(2)}
        </span>
        <span className="text-[11.5px] leading-tight text-muted">{indexBand(v)}</span>
        <span className="font-mono text-[10px] text-faint">{window}</span>
      </>
    );
  };

  const swatch = (v: number | null) =>
    v == null
      ? "transparent"
      : v <= -2
        ? "#D96565"
        : v <= -1.5
          ? "#EE8434"
          : v <= -1
            ? "#E7A83B"
            : v < 1
              ? "#38A88A"
              : "#2BA6B8";

  return (
    <Panel className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3.5">
        <span className="font-heading text-lg font-semibold">Standardised indices</span>
        <span className="font-mono text-[10.5px] text-muted">
          {station.coverage.years}-YEAR FIT PER CALENDAR MONTH
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        {SPEI.map((k, i) => {
          const l = latestSpei(station, k);
          return (
            <div
              key={`spei${k}`}
              className={`flex flex-col gap-1.5 border-b border-divider px-4 py-3.5 ${i < 3 ? "sm:border-r" : ""}`}
            >
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-muted">
                <span className="size-1.5" style={{ background: swatch(l?.value ?? null) }} />
                SPEI-{k}
              </span>
              {cell(l?.value ?? null, l ? spanLabel(l.month, k) : null)}
            </div>
          );
        })}

        {SPI.map((k, i) => {
          const l = latestSpi(station, k);
          return (
            <div
              key={`spi${k}`}
              className={`flex flex-col gap-1.5 px-4 py-3.5 ${i < 2 ? "sm:border-r" : ""} border-b border-divider sm:border-b-0`}
            >
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-muted">
                <span className="size-1.5" style={{ background: swatch(l?.value ?? null) }} />
                SPI-{k}
              </span>
              {cell(l?.value ?? null, l ? spanLabel(l.month, k) : null)}
            </div>
          );
        })}

        {/* SPI has no six-month fit in the record, so the slot is left empty. */}
        <div className="hidden px-4 py-3.5 sm:block" />
      </div>

      <Provenance>
        SPEI accumulates P &minus; ET&#8320;; SPI accumulates rainfall alone. A gap between them at the same
        timescale is evaporative demand rather than missing rain.
      </Provenance>
    </Panel>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

const BANDS = [
  { label: "Extremely dry", range: "≤ −2.0", from: -99, to: -2, color: "#D96565" },
  { label: "Severely dry", range: "−2.0 … −1.5", from: -2, to: -1.5, color: "#EE8434" },
  { label: "Moderately dry", range: "−1.5 … −1.0", from: -1.5, to: -1, color: "#E7A83B" },
  { label: "Near normal", range: "−1.0 … 1.0", from: -1, to: 1, color: "#38A88A" },
  { label: "Wet", range: "≥ 1.0", from: 1, to: 99, color: "#2BA6B8" },
];

function speiToLevel(v: number) {
  if (v <= -2) return "extreme" as const;
  if (v <= -1.5) return "severe" as const;
  if (v <= -1) return "watch" as const;
  return "safe" as const;
}

function monthWord(label: string) {
  const m = label.split(" ")[0];
  const i = MONTH_ABBR.indexOf(m);
  return i >= 0
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i]
    : "month";
}

function IndexCell({
  label,
  sub,
  value,
  month,
}: {
  label: string;
  sub: string;
  value: number | null;
  month: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-divider px-5 py-4.5 xl:border-b-0 xl:border-r">
      <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
        {label} &middot; {sub.toUpperCase()}
      </span>
      <span className="flex items-baseline gap-2.5">
        <span className="font-heading text-[40px] font-semibold leading-none tabular-nums">
          {value == null ? "—" : value.toFixed(2)}
        </span>
        {value != null && <RiskBadge level={speiToLevel(value)} showScore={false} />}
      </span>
      <span className="font-mono text-[11px] text-muted">{month ?? "not fitted"}</span>
    </div>
  );
}

/** A linear scale from −3 to +3 with the current value marked. */
function SpeiDial({ value }: { value: number }) {
  const clamped = Math.max(-3, Math.min(3, value));
  const pct = ((clamped + 3) / 6) * 100;
  return (
    <svg viewBox="0 0 300 96" className="block w-full max-w-[380px]">
      <defs>
        <linearGradient id="speiRamp" x1="0" x2="1">
          <stop offset="0%" stopColor="#D96565" />
          <stop offset="16%" stopColor="#EE8434" />
          <stop offset="25%" stopColor="#E7A83B" />
          <stop offset="50%" stopColor="#38A88A" />
          <stop offset="75%" stopColor="#2BA6B8" />
          <stop offset="100%" stopColor="#9EDFF1" />
        </linearGradient>
      </defs>
      <rect x={10} y={40} width={280} height={14} fill="url(#speiRamp)" opacity={0.85} />
      {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
        <g key={t}>
          <line x1={10 + ((t + 3) / 6) * 280} x2={10 + ((t + 3) / 6) * 280} y1={36} y2={58} style={{ stroke: "var(--ap-bg)" }} strokeWidth={1} />
          <text
            x={10 + ((t + 3) / 6) * 280}
            y={72}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }}
            fontSize={9}
          >
            {t}
          </text>
        </g>
      ))}
      <motion.g animate={{ x: 10 + (pct / 100) * 280 }} initial={false} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
        <rect x={-5} y={28} width={10} height={10} style={{ fill: "var(--ap-bg)", stroke: "var(--ap-text)" }} strokeWidth={1.5} />
        <line x1={0} x2={0} y1={38} y2={58} style={{ stroke: "var(--ap-text)" }} strokeWidth={2} />
      </motion.g>
    </svg>
  );
}

function SpeiSeries({ station }: { station: Station }) {
  const series = station.spei["3"];
  const w = 880;
  const h = 210;
  const padL = 34;
  const padB = 24;
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

  return (
    <div className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={padL} right={padR} width={w}>
        {atMonth && (
          <>
            {MONTH_ABBR[atMonth.m - 1]} {atMonth.y} &middot;{" "}
            {atValue == null
              ? "no value"
              : `SPEI-3 ${atValue > 0 ? "+" : ""}${atValue.toFixed(2)} · ${indexBand(atValue)}`}
          </>
        )}
      </HoverReadout>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
      <rect x={padL} y={y(-1)} width={innerW} height={y(-3) - y(-1)} fill="#D96565" fillOpacity={0.06} />
      <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.1 }}>
        {[-2, -1, 0, 1, 2].map((t) => (
          <line key={t} x1={padL} x2={w - 10} y1={y(t)} y2={y(t)} />
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
            width={Math.max(0.7, bw - 0.4)}
            height={Math.max(0.6, hh)}
            fill={v <= -1 ? "#D96565" : v < 0 ? "#E7A83B" : "var(--ap-accent)"}
            fillOpacity={hover.index === i ? 1 : v <= -1 ? 0.95 : 0.7}
          />
        );
      })}

      <HoverGuide hover={hover} left={padL} right={padR} width={w} top={12} bottom={h - padB} />

      <line x1={padL} x2={w - 10} y1={zero} y2={zero} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.4 }} />

      <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
        {[2, 0, -2].map((t) => (
          <text key={t} x={padL - 6} y={y(t) + 3} textAnchor="end">
            {t > 0 ? `+${t}` : t}
          </text>
        ))}
        <text x={padL} y={h - 6}>{station.months[0].y}</text>
        <text x={w - 10} y={h - 6} textAnchor="end">{station.months[station.months.length - 1].y}</text>
      </g>
      </svg>
    </div>
  );
}

export { riskLevel };
