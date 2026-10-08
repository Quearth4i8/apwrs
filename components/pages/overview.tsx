"use client";

import * as React from "react";
import { motion } from "motion/react";
import { BasinMap } from "@/components/basin-map";
import { BasinWaterCard } from "@/components/basin-water";
import { CurrentWeatherCard } from "@/components/current-weather";
import { Reveal } from "@/components/ui/reveal";
import { skyOf, useCurrentWeather } from "@/lib/use-current";
import { useConsole } from "@/components/app-context";
import { Panel } from "@/components/ui/primitives";
import { InfoTile, MOISTURE_COLOR, MOISTURE_LABEL, moistureLevel } from "@/components/ui/simple";
import { rootZone, useLatestSoil } from "@/components/soil-probe";
import { CROPS, stationForSite } from "@/lib/climate";
import { conditionsFor, decadeLabel, decadesUntil, periodScore, suitability, type DecadeSuitability } from "@/lib/metrics";
import { useForecast } from "@/lib/use-forecast";

const CARD_IN = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

/**
 * The at-a-glance page: today's weather, four plain answers (how much rain fell, how much is
 * coming, how wet is the soil, is there a drought), the catchment's water, the
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

      <h1 className="relative text-[clamp(28px,4.4vw,40px)] leading-none tracking-[-0.02em]">{station.name}</h1>

      {/* ── Today's weather and four plain answers ──────────────────── */}
      <Reveal className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" itemClassName="[&>*]:h-full" step={0.07}>
        <WeatherTile stationId={station.id} />
        <InfoTile
          icon="rain"
          tint="var(--ap-accent)"
          label="Rain in 30 days"
          value={`${Math.round(cond.rain30)} mm`}
          note={`${asOf}`}
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
          note={soilPct == null ? "S.Sensor" : `${Math.round(soilPct)}% · S.Sensor, today`}
        />
        <InfoTile
          icon="gauge"
          tint={drought?.color ?? "var(--ap-muted)"}
          label="Drought level"
          value={<span style={{ color: drought?.color }}>{drought?.word ?? "—"}</span>}
          note={`Last 3 months`}
        />
      </Reveal>

      {/* ── Catchment water + map ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <motion.div {...CARD_IN} className="flex flex-col gap-6">
          <BasinWaterCard />
          <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.12 }}>
            <CurrentWeatherCard stationId={station.id} />
          </motion.div>
        </motion.div>

        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.06 }}>
          <Panel className="relative h-full min-h-[460px] overflow-hidden sm:min-h-[580px]">
            <BasinMap className="absolute inset-0" />
          </Panel>
        </motion.div>
      </div>
    </div>
  );
}

/** Today at the station: the sky, the temperature now, and the day's range. */
function WeatherTile({ stationId }: { stationId: string }) {
  const { data, error } = useCurrentWeather(stationId);
  const sky = skyOf(data?.weatherCode ?? null, data?.isDay ?? true);
  const Glyph = sky.icon;
  const t = data?.today;
  return (
    <InfoTile
      glyph={<Glyph size={20} strokeWidth={1.8} />}
      tint={sky.color}
      label="Weather today"
      value={data?.temperature != null ? `${Math.round(data.temperature)}°C` : error ? "—" : "…"}
      note={
        data ? (
          <>
            {sky.label}
            {t?.tmax != null && t.tmin != null && (
              <>
                {" "}· {Math.round(t.tmin)}° / {Math.round(t.tmax)}°
              </>
            )}
            {t?.rainChance != null && t.rainChance >= 20 && <> · {t.rainChance}% rain</>}
          </>
        ) : error ? (
          "Unavailable"
        ) : (
          "Reading…"
        )
      }
    />
  );
}

/* ── Plain-language wording ──────────────────────────────────────────── */

/** SPEI-3 as a word and a colour. The index value itself lives on Drought Risk. */
function droughtWord(v: number) {
  if (v <= -2) return { word: "Extreme", color: "#D96565" };
  if (v <= -1.5) return { word: "Severe", color: "#EE8434" };
  if (v <= -1) return { word: "Dry", color: "#E7A83B" };
  if (v < 1) return { word: "Normal", color: "#38A88A" };
  return { word: "Wet", color: "var(--ap-accent)" };
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
