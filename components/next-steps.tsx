"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";
import { CropImage } from "@/components/crop-visual";
import { useForecast } from "@/lib/use-forecast";
import {
  CALENDAR_CROPS,
  daysBetween,
  inPeriod,
  monthPos,
  type CalendarCrop,
} from "@/lib/crop-calendar";
import type { Lang } from "@/lib/farmer-data";

/**
 * What the farmer should do next, beside the home carousel: the crops whose
 * sowing window is open now (closing soonest first), the ones that open next,
 * and a tip read from this week's forecast. Windows come from the FAO crop
 * calendar for Tunisia's sub-humid zone.
 */
export function NextSteps({ stationId, lang }: { stationId: string; lang: Lang }) {
  const fr = lang === "fr";
  const locale = fr ? "fr-FR" : "en-GB";
  const today = monthPos();

  const open = CALENDAR_CROPS.flatMap((crop) => {
    const window = crop.sow.find((s) => inPeriod(today, s));
    if (!window) return [];
    const left = daysBetween(today, window[1]);
    const length = Math.max(daysBetween(window[0], window[1]), 1);
    return [{ crop, window, left, progress: 1 - left / length }];
  }).sort((a, b) => a.left - b.left);

  const soon = CALENDAR_CROPS.filter((c) => !open.some((o) => o.crop.id === c.id))
    .map((crop) => {
      const window = [...crop.sow].sort((a, b) => daysBetween(today, a[0]) - daysBetween(today, b[0]))[0];
      return { crop, window, wait: daysBetween(today, window[0]) };
    })
    .sort((a, b) => a.wait - b.wait)
    .slice(0, 3);

  const tip = useWeatherTip(stationId, lang);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 lg:self-stretch"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-muted">{fr ? "À faire maintenant" : "What to do next"}</span>
        <span className="text-[13px] capitalize text-muted">
          {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <Panel className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {tip && (
          <div
            className="flex items-start gap-3 rounded-control border px-3.5 py-3"
            style={{ borderColor: `${tip.color}55`, background: `${tip.color}14` }}
          >
            <span
              className="grid size-8 flex-none place-items-center rounded-full text-white"
              style={{ background: tip.color }}
            >
              <Icon name={tip.icon} size={16} strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] font-semibold">{tip.title}</span>
              <span className="text-[13px] leading-[1.45] text-muted text-pretty">{tip.body}</span>
            </div>
          </div>
        )}

        {open.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel color="#38A88A">{fr ? "Semer maintenant" : "Sow now"}</SectionLabel>
            {open.slice(0, 3).map(({ crop, window, left, progress }, i) => (
              <CropRow key={crop.id} crop={crop} lang={lang} delay={0.2 + i * 0.06}>
                <div className="flex items-center gap-2">
                  <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--ap-divider)]">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: left <= 14 ? "#D9621A" : "#38A88A" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max(progress, 0.04), 1) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[12px] text-muted">
                    {fr ? `jusqu’au ${posDate(window[1] - 0.01, locale)}` : `until ${posDate(window[1] - 0.01, locale)}`}
                  </span>
                </div>
                <Badge urgent={left <= 14}>
                  {fr ? `${left} j restants` : `${left} days left`}
                </Badge>
              </CropRow>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionLabel color="#E7A83B">{fr ? "Bientôt" : "Coming up"}</SectionLabel>
          {soon.map(({ crop, window, wait }, i) => (
            <CropRow key={crop.id} crop={crop} lang={lang} delay={0.35 + i * 0.06}>
              <span className="text-[12px] text-muted">
                {fr ? `Semis à partir du ${posDate(window[0], locale)}` : `Sow from ${posDate(window[0], locale)}`}
              </span>
              <Badge>{fr ? `dans ${wait} j` : `in ${wait} days`}</Badge>
            </CropRow>
          ))}
        </div>
      </Panel>
    </motion.section>
  );
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function CropRow({
  crop,
  lang,
  delay,
  children,
}: {
  crop: CalendarCrop;
  lang: Lang;
  delay: number;
  children: [React.ReactNode, React.ReactNode];
}) {
  const [detail, badge] = children;
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center gap-3 rounded-control border border-panel-border bg-surface px-2.5 py-2 transition-colors hover:border-divider-strong"
    >
      <CropImage crop={crop} className="size-10 flex-none rounded-full" iconSize={18} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold">{lang === "fr" ? crop.nameFr : crop.name}</span>
        {detail}
      </div>
      {badge}
    </motion.div>
  );
}

function Badge({ urgent, children }: { urgent?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{
        background: urgent ? "rgb(217 98 26 / 0.14)" : "var(--ap-neutral-100)",
        color: urgent ? "#D9621A" : "var(--ap-text)",
      }}
    >
      {children}
    </span>
  );
}

/** A month position (0 = 1 Jan … 12 = 31 Dec) as "5 November". */
function posDate(p: number, locale: string) {
  const m = ((Math.floor(p) % 12) + 12) % 12;
  const days = new Date(2001, m + 1, 0).getDate();
  const day = 1 + Math.floor((p - Math.floor(p)) * days);
  return new Date(2001, m, day).toLocaleDateString(locale, { day: "numeric", month: "long" });
}

/** One line of advice from the next seven days of the forecast. */
function useWeatherTip(stationId: string, lang: Lang) {
  const { data } = useForecast(stationId);
  if (!data) return null;
  const days = data.days.filter((d) => d.forecast).slice(0, 7);
  if (!days.length) return null;

  const fr = lang === "fr";
  const rain = days.reduce((a, d) => a + (d.precip ?? 0), 0);
  const hottest = Math.max(...days.map((d) => d.tmax ?? -Infinity));
  const firstWet = days.find((d) => (d.precip ?? 0) >= 2);
  const weekday = firstWet
    ? new Date(firstWet.date).toLocaleDateString(fr ? "fr-FR" : "en-GB", { weekday: "long", timeZone: "UTC" })
    : "";
  const mm = rain.toFixed(0);

  if (hottest >= 35) {
    return {
      icon: "sun" as const,
      color: "#D9621A",
      title: fr ? `Forte chaleur : jusqu’à ${hottest.toFixed(0)}°` : `Heat ahead: up to ${hottest.toFixed(0)}°`,
      body: fr
        ? "Arrosez tôt le matin ou le soir et protégez les jeunes plants."
        : "Water early in the morning or in the evening and shade young plants.",
    };
  }
  if (rain >= 10) {
    return {
      icon: "rain" as const,
      color: "#2F8FB5",
      title: fr ? `${mm} mm de pluie attendus` : `${mm} mm of rain on the way`,
      body: fr
        ? `La pluie arrive ${weekday}. Préparez le sol et semez juste avant pour en profiter.`
        : `Rain arrives on ${weekday}. Prepare the soil and sow just before it so the seeds get the water.`,
    };
  }
  if (rain >= 2) {
    return {
      icon: "rain" as const,
      color: "#B7860B",
      title: fr ? `Pluie faible : ${mm} mm` : `Light rain only: ${mm} mm`,
      body: fr
        ? "Pas assez pour faire lever un semis seul. Prévoyez un arrosage d’appoint."
        : "Not enough on its own to bring up a new sowing. Plan some extra watering.",
    };
  }
  return {
    icon: "sun" as const,
    color: "#B7860B",
    title: fr ? "Semaine sèche" : "Dry week ahead",
    body: fr
      ? "Travaillez le sol maintenant, mais attendez la pluie avant de semer les cultures pluviales."
      : "Work the soil now, but wait for rain before sowing rain-fed crops.",
  };
}
