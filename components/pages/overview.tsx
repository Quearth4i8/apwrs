"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Panel, ButtonLink } from "@/components/ui/primitives";
import { InfoTile, MOISTURE_COLOR, MOISTURE_LABEL, moistureLevel } from "@/components/ui/simple";
import { SoilProbeCard, rootZone, useLatestSoil } from "@/components/soil-probe";
import { CROPS, stationForSite } from "@/lib/climate";
import { conditionsFor, decadeLabel, decadesUntil, periodScore, suitability, type DecadeSuitability } from "@/lib/metrics";
import { useForecast } from "@/lib/use-forecast";

const CARD_IN = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

/**
 * The at-a-glance page: four plain answers (is there a drought, how much
 * rain fell, how much is coming, how wet is the soil), the soil sensor, the
 * risk map and the next sowing period. Index values, units and method notes
 * live on the analysis pages; this page says what they mean.
 */
export function PageOverview() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const cond = React.useMemo(() => conditionsFor(station), [station]);
  const { data: forecast } = useForecast(station.id);
  const soil = useLatestSoil();

  const next7Rain = forecast
    ? forecast.days.filter((d) => d.forecast).slice(0, 7).reduce((a, d) => a + (d.precip ?? 0), 0)
    : null;

  const upcoming = React.useMemo(() => upcomingWindow(station.id), [station.id]);
  const drought = cond.spei3 ? droughtWord(cond.spei3.value) : null;
  const rainWord = rainVsNormal(cond.rain30Anomaly);
  const soilPct = soil.latest ? rootZone(soil.latest) : null;
  const soilLevel = soilPct == null ? null : moistureLevel(soilPct);
  const asOf = monthYear(cond.asOf);

  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <div
        className="pointer-events-none absolute -top-[120px] left-0 h-[360px] w-[720px]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(28px,4.4vw,40px)] leading-none tracking-[-0.02em]">{station.name}</h1>
          <p className="m-0 text-[15px] text-muted">
            {drought ? drought.sentence : "No drought reading yet."}{" "}
            {soilLevel && <>The field sensor shows the soil is {MOISTURE_LABEL[soilLevel].toLowerCase()}.</>}
          </p>
        </div>
        <ButtonLink href="/app/planting" variant="primary">
          <Icon name="sprout" size={15} />
          When to plant
        </ButtonLink>
      </div>

      {/* ── Four plain answers ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <InfoTile
          icon="gauge"
          tint={drought?.color ?? "var(--ap-muted)"}
          label="Drought level"
          value={<span style={{ color: drought?.color }}>{drought?.word ?? "—"}</span>}
          note={`Last 3 months, to ${asOf}`}
        />
        <InfoTile
          icon="rain"
          tint="var(--ap-accent)"
          label="Rain in 30 days"
          value={`${Math.round(cond.rain30)} mm`}
          note={`${rainWord} · to ${asOf}`}
        />
        <InfoTile
          icon="cloud"
          tint="#7B8FD9"
          label="Rain expected"
          value={next7Rain == null ? "…" : `${Math.round(next7Rain)} mm`}
          note="Next 7 days"
        />
        <InfoTile
          icon="droplet"
          tint={soilLevel ? MOISTURE_COLOR[soilLevel] : "var(--ap-muted)"}
          label="Soil moisture"
          value={
            soilLevel ? (
              <span style={{ color: MOISTURE_COLOR[soilLevel] }}>{MOISTURE_LABEL[soilLevel]}</span>
            ) : soil.error ? (
              "—"
            ) : (
              "…"
            )
          }
          note={soilPct == null ? "Field sensor" : `${Math.round(soilPct)}% · field sensor, today`}
        />
      </div>

      {/* ── Soil sensor + map ─────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <motion.div {...CARD_IN}>
          <SoilProbeCard />
        </motion.div>

        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.06 }}>
          <Panel hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
              <span className="text-lg font-semibold">Drought risk map</span>
              <Link
                href="/app/map"
                className="flex items-center gap-1 whitespace-nowrap text-[13px] text-accent no-underline hover:underline"
              >
                Open map <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="relative min-h-[300px] flex-1">
              <MapView layer="risk" sensors legend className="absolute inset-0" />
            </div>
          </Panel>
        </motion.div>
      </div>

      {/* ── Next sowing period ────────────────────────────────────────── */}
      <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.1 }}>
        <Panel className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-5">
          <span
            className="grid size-12 flex-none place-items-center rounded-[12px]"
            style={{ color: "#38A88A", background: "color-mix(in srgb, #38A88A 14%, transparent)" }}
          >
            <Icon name="sprout" size={24} strokeWidth={1.8} />
          </span>
          {upcoming ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-muted">Next good time to sow</span>
                <span className="text-[22px] font-semibold leading-tight">
                  {upcoming.crop.name} &middot; from {decadeLabel(upcoming.decade.decade)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-muted">Chance the crop takes well</span>
                <span className="text-[22px] font-semibold leading-tight">
                  {(upcoming.decade.establishmentProb * 100).toFixed(0)}%
                </span>
              </div>
            </>
          ) : (
            <span className="text-[14px] text-muted">No period has reliable enough rain for any crop here.</span>
          )}
          <ButtonLink href="/app/planting" className="ml-auto">
            All crops
            <Icon name="arrow" size={14} />
          </ButtonLink>
        </Panel>
      </motion.div>
    </div>
  );
}

/* ── Plain-language wording ──────────────────────────────────────────── */

/** SPEI-3 as a word, a colour and a sentence. The index value itself lives on Drought Risk. */
function droughtWord(v: number) {
  if (v <= -2) return { word: "Extreme", color: "#D96565", sentence: "Extreme drought over the last three months." };
  if (v <= -1.5) return { word: "Severe", color: "#EE8434", sentence: "Severe drought over the last three months." };
  if (v <= -1) return { word: "Dry", color: "#E7A83B", sentence: "Drier than usual over the last three months." };
  if (v < 1) return { word: "Normal", color: "#38A88A", sentence: "No drought: the last three months were normal." };
  return { word: "Wet", color: "var(--ap-accent)", sentence: "Wetter than usual over the last three months." };
}

function rainVsNormal(anomaly: number | null) {
  if (anomaly == null) return "No normal to compare";
  if (Math.abs(anomaly) <= 15) return "About normal";
  return `${Math.abs(anomaly)}% ${anomaly < 0 ? "below" : "above"} normal`;
}

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

/* ── Data ────────────────────────────────────────────────────────────── */

/** The soonest rain-reliable ten-day period across all crops, from today. */
function upcomingWindow(stationId: string) {
  let best: { crop: (typeof CROPS)[number]; decade: DecadeSuitability; wait: number } | null = null;
  for (const crop of CROPS) {
    for (const d of suitability(stationId, crop.id)) {
      if (d.water !== "reliable") continue;
      const wait = decadesUntil(d.decade);
      if (!best || wait < best.wait || (wait === best.wait && periodScore(d) > periodScore(best.decade))) {
        best = { crop, decade: d, wait };
      }
    }
  }
  return best;
}
