"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Blueprint, ButtonLink, PageHeader, RiskBadge, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { stationForSite, type Station } from "@/lib/climate";
import { conditionsFor, indexBand, MONTH_ABBR } from "@/lib/metrics";
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
      <Blueprint className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
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
      </Blueprint>

      {/* ── Standing + explanation ────────────────────────────────────── */}
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Blueprint className="flex flex-col items-center gap-3 px-6 py-5">
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
        </Blueprint>

        <Blueprint
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
        </Blueprint>
      </div>

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "trend", label: "SPEI history" },
          { value: "spatial", label: "Live risk surface" },
        ]}
      />

      {tab === "trend" ? (
        <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
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
        </Blueprint>
      ) : (
        <Blueprint className="relative h-[520px]">
          <MapView layer="risk" sensors legend className="absolute inset-0" />
        </Blueprint>
      )}
    </div>
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
  const innerW = w - padL - 10;
  const innerH = h - 12 - padB;
  const bw = innerW / series.length;
  const scale = 3;
  const y = (v: number) => 12 + innerH / 2 - (Math.max(-scale, Math.min(scale, v)) / scale) * (innerH / 2);
  const zero = y(0);

  return (
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
        const m = station.months[i];
        return (
          <rect
            key={i}
            x={padL + i * bw}
            y={top}
            width={Math.max(0.7, bw - 0.4)}
            height={Math.max(0.6, hh)}
            fill={v <= -1 ? "#D96565" : v < 0 ? "#E7A83B" : "var(--ap-accent)"}
            fillOpacity={v <= -1 ? 0.95 : 0.7}
          >
            <title>
              {MONTH_ABBR[m.m - 1]} {m.y}: {v.toFixed(2)}
            </title>
          </rect>
        );
      })}

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
  );
}

export { riskLevel };
