"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useForecast } from "@/lib/use-forecast";
import { FARMER_TEXT, type Lang } from "@/lib/farmer-data";

/**
 * The next seven days from the live forecast, laid out as a strip of day
 * cards under the home carousel. Each card shows the day's temperature range
 * against the whole week's, so warm and cool days read at a glance.
 */
export function WeekForecast({ stationId, lang }: { stationId: string; lang: Lang }) {
  const t = FARMER_TEXT[lang];
  const { data, error } = useForecast(stationId);
  const days = data ? data.days.filter((d) => d.forecast).slice(0, 7) : [];

  const lows = days.map((d) => d.tmin ?? d.tmax).filter((v): v is number => v != null);
  const highs = days.map((d) => d.tmax ?? d.tmin).filter((v): v is number => v != null);
  const weekMin = Math.min(...lows);
  const weekMax = Math.max(...highs);
  const span = Math.max(weekMax - weekMin, 1);
  const totalRain = days.reduce((a, d) => a + (d.precip ?? 0), 0);
  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 lg:col-span-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-muted">{t.weather}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          {days.length ? (
            <>
              <span style={{ color: "var(--ap-teal)" }}>
                <Icon name="droplet" size={14} />
              </span>
              {lang === "fr" ? `${totalRain.toFixed(0)} mm cette semaine` : `${totalRain.toFixed(0)} mm this week`}
            </>
          ) : error ? null : lang === "fr" ? (
            "chargement…"
          ) : (
            "loading…"
          )}
        </span>
      </div>

      {days.length ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
          {days.map((d, i) => {
            const today = i === 0;
            const rain = d.precip ?? 0;
            const wet = rain >= 1;
            const lo = d.tmin ?? d.tmax;
            const hi = d.tmax ?? d.tmin;
            return (
              <motion.div
                key={d.date}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-w-[92px] flex-none flex-col items-center gap-2.5 rounded-control border px-2 py-4 shadow-panel transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-divider-strong sm:min-w-0"
                style={{
                  borderColor: today ? "var(--ap-text)" : "var(--ap-panel-border)",
                  background: wet
                    ? "linear-gradient(to bottom, rgb(47 143 181 / 0.10), var(--ap-surface) 70%)"
                    : "linear-gradient(to bottom, rgb(217 162 11 / 0.08), var(--ap-surface) 70%)",
                }}
              >
                <span className="text-[13px] capitalize" style={{ fontWeight: today ? 700 : 500 }}>
                  {today
                    ? lang === "fr"
                      ? "Auj."
                      : "Today"
                    : new Date(d.date).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className="text-[11px] text-muted">
                  {new Date(d.date).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" })}
                </span>

                <span style={{ color: wet ? "var(--ap-teal)" : "#D9A20B" }}>
                  <Icon name={wet ? "rain" : "sun"} size={26} />
                </span>

                <div className="flex items-baseline gap-1">
                  <span className="text-[17px] font-semibold">{hi == null ? "—" : `${hi.toFixed(0)}°`}</span>
                  <span className="text-[13px] text-muted">{lo == null ? "" : `${lo.toFixed(0)}°`}</span>
                </div>

                {/* Today's range placed on the week's range */}
                <div className="relative h-1 w-full max-w-[64px] overflow-hidden rounded-full bg-[var(--ap-divider)]">
                  {lo != null && hi != null && (
                    <span
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${((lo - weekMin) / span) * 100}%`,
                        width: `${Math.max(((hi - lo) / span) * 100, 6)}%`,
                        background: "linear-gradient(to right, #2F8FB5, #E7A83B, #D9621A)",
                      }}
                    />
                  )}
                </div>

                <span
                  className="font-mono text-[11px]"
                  style={{ color: wet ? "var(--ap-teal)" : "var(--ap-faint)" }}
                >
                  {rain.toFixed(0)} mm
                </span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-panel border border-dashed border-divider p-6 text-center text-[13px] text-muted">
          {error
            ? lang === "fr"
              ? "Prévisions indisponibles"
              : "Forecast unavailable"
            : lang === "fr"
              ? "Chargement des prévisions…"
              : "Loading forecast…"}
        </div>
      )}
    </motion.section>
  );
}
