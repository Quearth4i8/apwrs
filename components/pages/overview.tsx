"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Blueprint, ButtonLink, Kicker, RiskBadge } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CROPS, SOIL_MODEL, stationForSite } from "@/lib/climate";
import { conditionsFor, decadeLabel, indexBand, suitability } from "@/lib/metrics";
import { useForecast } from "@/lib/use-forecast";

const CARD_IN = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

/**
 * Current standing at the selected station. Every figure is measured or
 * derived: the station record supplies the past, Open-Meteo the days ahead.
 * Nothing is shown that neither can produce.
 */
export function PageOverview() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const cond = React.useMemo(() => conditionsFor(station), [station]);
  const { data: forecast } = useForecast(station.id);

  const next7Rain = forecast
    ? forecast.days.filter((d) => d.forecast).slice(0, 7).reduce((a, d) => a + (d.precip ?? 0), 0)
    : null;

  const upcoming = React.useMemo(() => upcomingWindow(station.id), [station.id]);
  const latest = station.annual[station.annual.length - 1];
  const meanPrecip = station.annual.reduce((a, y) => a + y.precip, 0) / station.annual.length;
  const driest = [...station.annual].sort((a, b) => a.balance - b.balance)[0];

  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <div
        className="pointer-events-none absolute -top-[120px] left-0 h-[360px] w-[720px]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Kicker className="text-[11px]">
            OVERVIEW &middot; {station.name.toUpperCase()} &middot; RECORD TO {cond.asOf}
          </Kicker>
          <h1 className="text-[clamp(28px,4.4vw,40px)] leading-none tracking-[-0.02em]">
            {station.name} &mdash; current standing
          </h1>
          <div className="max-w-[70ch] text-sm text-muted">
            {cond.spei3 && (
              <>
                SPEI-3 is <span className="text-ink">{cond.spei3.value.toFixed(2)}</span> for {cond.spei3.label} &mdash;{" "}
                {indexBand(cond.spei3.value)}.{" "}
              </>
            )}
            {cond.rain30} mm of rain in the last 30 days
            {cond.rain30Normal != null && ` against a ${station.coverage.years}-year normal of ${cond.rain30Normal} mm`}.
          </div>
        </div>
        <div className="flex gap-2.5">
          <ButtonLink href="/app/history">
            <Icon name="history" size={15} />
            Full record
          </ButtonLink>
          <ButtonLink href="/app/planting" variant="primary">
            <Icon name="sprout" size={15} />
            Planting windows
          </ButtonLink>
        </div>
      </div>

      {/* ── Measured standing ─────────────────────────────────────────── */}
      <Blueprint
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
        style={{ background: "color-mix(in srgb, var(--ap-surface) 70%, transparent)" }}
      >
        <Kpi
          label={<>SPEI-3</>}
          badge={cond.spei3 ? <RiskBadge level={speiLevel(cond.spei3.value)} showScore={false} /> : null}
          value={cond.spei3 ? cond.spei3.value.toFixed(2) : "—"}
          unit={cond.spei3 ? indexBand(cond.spei3.value) : "not fitted"}
          foot={cond.spei3 ? `${cond.spei3.label} · ${station.coverage.years}-year fit` : "—"}
        />
        <Kpi
          label={<>RAIN &middot; LAST 30 D</>}
          badge={
            <span className="text-teal">
              <Icon name="rain" size={15} />
            </span>
          }
          value={cond.rain30.toFixed(1)}
          unit="mm"
          foot={
            cond.rain30Anomaly == null ? (
              "no comparable window"
            ) : (
              <>
                <span style={{ color: cond.rain30Anomaly < 0 ? "#EE8434" : "var(--ap-teal)" }}>
                  {cond.rain30Anomaly > 0 ? "+" : ""}
                  {cond.rain30Anomaly}%
                </span>{" "}
                vs normal {cond.rain30Normal} mm
              </>
            )
          }
        />
        <Kpi
          label={<>ET&#8320; &middot; LAST 30 D</>}
          badge={
            <span className="text-accent">
              <Icon name="sun" size={15} />
            </span>
          }
          value={cond.et030.toFixed(1)}
          unit="mm"
          foot={
            <>
              balance{" "}
              <span style={{ color: cond.balance30 < 0 ? "#EE8434" : "var(--ap-teal)" }}>
                {cond.balance30.toFixed(1)} mm
              </span>
            </>
          }
        />
        <Kpi
          label={<>SOIL STORAGE</>}
          badge={
            <span className="text-teal">
              <Icon name="droplet" size={15} />
            </span>
          }
          value={cond.soilStorageMm.toFixed(0)}
          unit="mm"
          foot={<>{(cond.soilFraction * 100).toFixed(0)}% of available water &middot; modelled</>}
        />
        <Kpi
          label={<>RAIN &middot; NEXT 7 D</>}
          badge={
            <span className="text-accent">
              <Icon name="cloud" size={15} />
            </span>
          }
          value={next7Rain == null ? "…" : next7Rain.toFixed(1)}
          unit="mm"
          foot={next7Rain == null ? "loading forecast" : "Open-Meteo forecast"}
          last
        />
      </Blueprint>

      {/* ── Map + next window ─────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <motion.div {...CARD_IN}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-heading text-lg font-semibold">Risk surface</span>
                <span className="font-mono text-[10.5px] text-muted">~9 km model grid &middot; Open-Meteo</span>
              </div>
              <Link
                href="/app/map"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-accent no-underline hover:underline"
              >
                Open live map
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="relative h-[360px]">
              <MapView layer="risk" sensors legend className="absolute inset-0" />
            </div>
          </Blueprint>
        </motion.div>

        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.06 }}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <span className="font-heading text-lg font-semibold">Next reliable sowing period</span>
              <span className="font-mono text-[10.5px] text-muted">RAINFALL ADEQUACY</span>
            </div>
            <div className="flex flex-1 flex-col gap-4.5 px-4 py-5">
              {upcoming ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">
                        {upcoming.crop.name.toUpperCase()}
                      </span>
                      <span className="font-heading text-[clamp(26px,3vw,34px)] font-semibold leading-none tracking-[-0.02em]">
                        {decadeLabel(upcoming.decade.decade)}
                      </span>
                      <span className="font-mono text-[11.5px] text-muted">
                        {upcoming.crop.totalDays} day cycle
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-[10.5px] text-muted">ESTABLISHMENT</span>
                      <span className="font-heading text-[26px] font-semibold leading-none">
                        {(upcoming.decade.establishmentProb * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-l border-t border-divider">
                    {(
                      [
                        ["RAINFED COVERAGE", `${(upcoming.decade.rainfedCoverage * 100).toFixed(0)}%`],
                        ["CYCLE RAIN", `${upcoming.decade.rainMm.toFixed(0)} mm`],
                        ["CYCLE ETc", `${upcoming.decade.etcMm.toFixed(0)} mm`],
                        ["YEARS REPLAYED", String(upcoming.decade.years)],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                        <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                        <span className="font-mono text-[15px]">{v}</span>
                      </div>
                    ))}
                  </div>

                  <p className="m-0 text-[12.5px] leading-[1.5] text-muted">
                    Computed by replaying {station.coverage.years} years of daily weather through this crop&rsquo;s
                    FAO-56 K<sub>c</sub> curve. It scores rainfall adequacy only.
                  </p>
                </>
              ) : (
                <p className="m-0 text-[13px] text-muted">
                  No period reaches the rain-reliable threshold for any crop at this station.
                </p>
              )}

              <ButtonLink href="/app/planting" className="mt-auto">
                All crops and periods
                <Icon name="arrow" size={14} />
              </ButtonLink>
            </div>
          </Blueprint>
        </motion.div>
      </div>

      {/* ── Record context ────────────────────────────────────────────── */}
      <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.1 }}>
        <Blueprint className="flex flex-col gap-4 px-5 py-4.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-heading text-lg font-semibold">
              Where {latest.year} sits in {station.coverage.years} years
            </span>
            <Link href="/app/history" className="text-[13px] text-accent no-underline hover:underline">
              Historical comparison &rarr;
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                [`${latest.year} RAINFALL`, `${latest.precip.toFixed(0)} mm`],
                [`${station.coverage.years}-YEAR MEAN`, `${meanPrecip.toFixed(0)} mm`],
                ["DRIEST YEAR", `${driest.year} · ${driest.precip.toFixed(0)} mm`],
                [`${latest.year} MONTHS ≤ −1`, `${latest.monthsInDrought} of 12`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 border border-divider px-3.5 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                <span className="font-mono text-[17px]">{v}</span>
              </div>
            ))}
          </div>

          <Provenance>
            {station.name} &middot; {station.coverage.days.toLocaleString("en-GB")} daily observations &middot; soil
            storage modelled from FC {SOIL_MODEL.fieldCapacityMm} / WP {SOIL_MODEL.wiltingPointMm} mm
          </Provenance>
        </Blueprint>
      </motion.div>
    </div>
  );
}

function speiLevel(v: number) {
  if (v <= -2) return "extreme" as const;
  if (v <= -1.5) return "severe" as const;
  if (v <= -1) return "watch" as const;
  return "safe" as const;
}

/** The soonest rain-reliable ten-day period across all crops, from today. */
function upcomingWindow(stationId: string) {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const doy = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  const currentDecade = Math.floor(doy / 10);

  let best: { crop: (typeof CROPS)[number]; decade: ReturnType<typeof suitability>[number]; wait: number } | null =
    null;

  for (const crop of CROPS) {
    for (const d of suitability(stationId, crop.id)) {
      if (d.water !== "reliable") continue;
      const wait = (d.decade - currentDecade + 36) % 36;
      if (!best || wait < best.wait || (wait === best.wait && d.establishmentProb > best.decade.establishmentProb)) {
        best = { crop, decade: d, wait };
      }
    }
  }
  return best;
}

function Kpi({
  label,
  badge,
  value,
  unit,
  foot,
  last,
}: {
  label: React.ReactNode;
  badge: React.ReactNode;
  value: React.ReactNode;
  unit: React.ReactNode;
  foot: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 border-b border-divider px-5 py-4.5 xl:border-b-0 ${
        last ? "" : "xl:border-r"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{label}</span>
        {badge}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {value}
        </span>
        <span className="font-mono text-[11px] text-muted">{unit}</span>
      </div>
      <div className="font-mono text-[11px] leading-[1.4] text-muted">{foot}</div>
    </div>
  );
}
