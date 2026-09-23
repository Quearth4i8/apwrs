"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, PageHeader, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CROPS, stationForSite, type Crop } from "@/lib/climate";
import { decadeLabel, MONTH_ABBR, suitability, WATER_CLASS, type DecadeSuitability } from "@/lib/metrics";

/**
 * Sowing-date guidance computed by replaying 30 years of daily weather
 * through each crop's own FAO-56 Kc curve.
 *
 * It answers one question — can rain carry this crop if sown then — and says
 * so plainly. The record holds no base temperature or photoperiod
 * requirement per crop, so it cannot rank a warm-season or perennial crop on
 * what actually gates its sowing date. The agronomist's stated planting
 * month travels with the crop and is marked on the calendar.
 */

export function PagePlanting() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [cropId, setCropId] = React.useState(CROPS.find((c) => c.id === "ble-dur")?.id ?? CROPS[0].id);
  const [metric, setMetric] = React.useState<"water" | "establishment" | "coverage">("water");

  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const decades = suitability(station.id, crop.id);
  const best = [...decades].sort(
    (a, b) => b.establishmentProb - a.establishmentProb || b.rainfedCoverage - a.rainfedCoverage,
  )[0];

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; SOWING WATER ADEQUACY &middot; {station.name.toUpperCase()} &middot;{" "}
            {station.coverage.years} YEARS
          </>
        }
        title="Planting windows"
        lede={
          <>
            For each ten-day sowing period, 30 years of daily weather are replayed through the crop&rsquo;s FAO-56
            K<sub>c</sub> curve. This scores <strong className="font-medium text-ink">rainfall adequacy only</strong>{" "}
            &mdash; the record carries no temperature or photoperiod requirement per crop, so it cannot say when a
            warm-season crop should go in the ground.
          </>
        }
        actions={
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: "water", label: "Class" },
              { value: "establishment", label: "Establishment" },
              { value: "coverage", label: "Coverage" },
            ]}
          />
        }
      />

      {/* ── Crop selector ─────────────────────────────────────────────── */}
      <Blueprint className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {CROPS.map((c) => {
          const on = cropId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCropId(c.id)}
              aria-pressed={on}
              className="flex flex-col gap-1.5 border-b border-r border-divider px-4 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-100"
              style={{
                background: on ? "var(--ap-accent-100)" : "transparent",
                boxShadow: `inset 0 -2px 0 ${on ? "var(--ap-accent)" : "transparent"}`,
              }}
            >
              <span
                className="flex items-center justify-between"
                style={{ color: on ? "var(--ap-accent)" : "var(--ap-muted)" }}
              >
                <Icon name="sprout" size={16} />
                <span className="font-mono text-[10px] text-muted">{c.totalDays} d</span>
              </span>
              <span className="font-heading text-lg font-semibold leading-tight">{c.name}</span>
              <span className="font-mono text-[10.5px] text-muted">
                K<sub>c</sub> {c.kcIni}/{c.kcMid}/{c.kcEnd}
              </span>
            </button>
          );
        })}
      </Blueprint>

      {/* ── Crop facts, straight from the workbook ────────────────────── */}
      <Blueprint className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {(
          [
            ["STATED SOWING", MONTH_ABBR[crop.plantingMonth - 1]],
            ["CYCLE", `${crop.totalDays} d`],
            ["STAGES (d)", `${crop.lIni}/${crop.lDev}/${crop.lMid}/${crop.lLate}`],
            ["Kc INITIAL", crop.kcIni.toFixed(2)],
            ["Kc MID", crop.kcMid.toFixed(2)],
            ["Kc END", crop.kcEnd.toFixed(2)],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={`border-b border-divider px-4 py-3 xl:border-b-0 ${i < 5 ? "xl:border-r" : ""}`}>
            <div className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</div>
            <div className="font-mono text-[15px]">{v}</div>
          </div>
        ))}
      </Blueprint>

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      <Blueprint className="flex flex-col overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
            <span className="font-heading text-lg font-semibold">
              {crop.name} &middot; rainfall adequacy by sowing date
            </span>
            <span className="flex gap-4 font-mono text-[10.5px] text-muted">
              {(Object.keys(WATER_CLASS) as (keyof typeof WATER_CLASS)[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5"
                    style={{ background: WATER_CLASS[k].fill, border: `1px solid ${WATER_CLASS[k].color}` }}
                  />
                  {WATER_CLASS[k].label}
                </span>
              ))}
            </span>
          </div>

          {/* Month ruler */}
          <div className="grid grid-cols-12 border-b border-divider">
            {MONTH_ABBR.map((m, i) => (
              <div
                key={m}
                className="border-r border-divider px-2 py-2 font-mono text-[10.5px] tracking-[0.08em]"
                style={{
                  color: i + 1 === crop.plantingMonth ? "var(--ap-accent)" : "var(--ap-muted)",
                  background: i + 1 === crop.plantingMonth ? "var(--ap-accent-100)" : "transparent",
                }}
              >
                {m}
                {i + 1 === crop.plantingMonth && <span className="ml-1">&#9679;</span>}
              </div>
            ))}
          </div>

          {/* 36 ten-day periods */}
          <div className="relative flex h-[72px]">
            {decades.map((d) => (
              <DecadeCell key={d.decade} d={d} metric={metric} crop={crop} />
            ))}
          </div>

          <div className="flex items-center gap-2 px-5 py-3 font-mono text-[10.5px] text-muted">
            <span className="size-2 bg-accent" />
            marks the sowing month recorded in the crop table
            <span className="ml-auto">36 ten-day periods &middot; {decades[0]?.years ?? 0} years each</span>
          </div>
        </div>
      </Blueprint>

      {/* ── Best period + method ──────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {best && (
          <Blueprint className="flex flex-col gap-3.5 px-5 py-4.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
              MOST RELIABLE RAIN &middot; {crop.name.toUpperCase()}
            </span>
            <span className="font-heading text-[clamp(26px,3vw,34px)] font-semibold leading-none">
              {decadeLabel(best.decade)}
              <span className="text-muted"> &rarr; </span>
              {decadeLabel(best.decade + 1)}
            </span>
            <div className="grid grid-cols-2 border-l border-t border-divider">
              {(
                [
                  ["ESTABLISHMENT", `${(best.establishmentProb * 100).toFixed(0)}%`],
                  ["RAINFED COVERAGE", `${(best.rainfedCoverage * 100).toFixed(0)}%`],
                  ["CYCLE RAIN", `${best.rainMm.toFixed(0)} mm`],
                  ["CYCLE ETc", `${best.etcMm.toFixed(0)} mm`],
                  ["HEAT DAYS >35°C", best.heatDays.toFixed(1)],
                  ["FROST DAYS <0°C", best.frostDays.toFixed(2)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                  <span className="font-mono text-[15px]">{v}</span>
                </div>
              ))}
            </div>
            <Provenance>
              {station.name} &middot; {best.years} years replayed &middot; establishment = P(&ge;20 mm in 21 days)
            </Provenance>
          </Blueprint>
        )}

        <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">HOW THIS IS COMPUTED</span>
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13.5px] leading-[1.55]">
            {[
              <>
                For every one of 36 ten-day sowing periods, each of the {station.coverage.years} years on record is
                replayed day by day.
              </>,
              <>
                The crop&rsquo;s K<sub>c</sub> curve is built from its own stage lengths &mdash; {crop.lIni}/
                {crop.lDev}/{crop.lMid}/{crop.lLate} days &mdash; and multiplied by that day&rsquo;s measured ET
                <sub>0</sub> to give ET<sub>c</sub>.
              </>,
              <>
                <strong className="font-medium text-ink">Establishment</strong> counts the share of years with at
                least 20 mm of rain in the first 21 days after sowing.
              </>,
              <>
                <strong className="font-medium text-ink">Rainfed coverage</strong> is the share of the cycle&rsquo;s
                total ET<sub>c</sub> met by rain, averaged across years and capped at 100%.
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-1 border-t border-divider pt-3 text-[12.5px] leading-[1.5] text-muted">
            Heat and frost days are counted and shown, but do not affect the class &mdash; without a base
            temperature per crop, turning them into a verdict would be guesswork.
          </div>
        </Blueprint>
      </div>
    </div>
  );
}

function DecadeCell({
  d,
  metric,
  crop,
}: {
  d: DecadeSuitability;
  metric: "water" | "establishment" | "coverage";
  crop: Crop;
}) {
  const cls = WATER_CLASS[d.water];
  const intensity =
    metric === "establishment" ? d.establishmentProb : metric === "coverage" ? d.rainfedCoverage : 1;

  const background =
    metric === "water"
      ? cls.fill
      : `color-mix(in srgb, ${cls.color} ${Math.round(intensity * 85)}%, transparent)`;

  const title =
    `${decadeLabel(d.decade)} — ${cls.label}\n` +
    `establishment ${(d.establishmentProb * 100).toFixed(0)}%\n` +
    `rainfed coverage ${(d.rainfedCoverage * 100).toFixed(0)}%\n` +
    `cycle rain ${d.rainMm.toFixed(0)} mm vs ETc ${d.etcMm.toFixed(0)} mm\n` +
    `${crop.name}, ${d.years} years`;

  return (
    <motion.div
      title={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: d.decade * 0.008 }}
      className="relative flex-1 border-r border-divider last:border-r-0"
      style={{ background }}
    >
      {metric !== "water" && (
        <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[8.5px] text-ink opacity-70">
          {(intensity * 100).toFixed(0)}
        </span>
      )}
    </motion.div>
  );
}
