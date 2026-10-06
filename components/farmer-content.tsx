"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { CROPS, STATIONS, type Station } from "@/lib/climate";
import { conditionsFor, decadeLabel, suitability, type DecadeSuitability } from "@/lib/metrics";
import { useForecast } from "@/lib/use-forecast";
import { FARMER_TEXT, type Lang } from "@/lib/farmer-data";
import { FarmLands } from "@/components/farm-lands";
import type { FarmerTab } from "@/lib/data";

/**
 * The farmer screens, in plain language and with no chrome of their own.
 *
 * Every number comes from the same place the expert console gets it: the
 * 30-year station record and the live forecast. The invented fields, advisor
 * and message history the prototype carried are gone — there is no farm
 * profile behind this app, and pretending otherwise would be worse than an
 * empty screen.
 */
export function FarmerContent({
  tab,
  lang,
  className,
}: {
  tab: FarmerTab;
  lang: Lang;
  className?: string;
}) {
  const t = FARMER_TEXT[lang];
  const station: Station = STATIONS[0];
  const cond = React.useMemo(() => conditionsFor(station), [station]);
  const { data: forecast } = useForecast(station.id);
  const [cropId, setCropId] = React.useState(CROPS.find((c) => c.id === "ble-dur")?.id ?? CROPS[0].id);
  const [speaking, setSpeaking] = React.useState(false);

  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const verdict = React.useMemo(() => verdictFor(station.id, crop.id), [station.id, crop.id]);

  React.useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak() {
    if (!window.speechSynthesis) return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`${crop.name}. ${verdict.headline}. ${verdict.detail}`);
    u.lang = lang === "fr" ? "fr-FR" : "en-GB";
    u.onend = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setSpeaking(true);
  }

  const next7 = forecast
    ? forecast.days.filter((d) => d.forecast).slice(0, 7)
    : [];

  return (
    <div
      className={
        className ??
        "grid content-start items-start gap-5 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-2 lg:gap-7 lg:px-8"
      }
    >
      {tab === "today" && (
        <>
          <div className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-muted">{t.myCrops}</span>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {CROPS.map((c) => {
                const on = c.id === cropId;
                const v = verdictFor(station.id, c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      setSpeaking(false);
                      setCropId(c.id);
                    }}
                    aria-pressed={on}
                    className="flex h-12 flex-none items-center gap-2 whitespace-nowrap border px-4 text-[15px] font-medium transition-colors"
                    style={{
                      borderColor: on ? "var(--ap-text)" : "var(--ap-divider)",
                      background: on ? "var(--ap-text)" : "var(--ap-surface)",
                      color: on ? "var(--ap-bg)" : "var(--ap-text)",
                    }}
                  >
                    <span className="size-2.5" style={{ background: v.color }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The verdict — the whole point of the screen. */}
          <motion.div
            key={cropId + lang}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:row-span-2"
          >
            <Panel
              className="flex h-full flex-col gap-4 px-5 py-5.5"
              style={{ background: verdict.bg, borderColor: verdict.border }}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className="grid size-15 flex-none place-items-center text-white"
                  style={{ background: verdict.color }}
                >
                  <Icon name={verdict.icon} size={30} strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className="truncate text-[13px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: verdict.ink }}
                  >
                    {crop.name}
                  </span>
                  <span className="font-heading text-[clamp(26px,5vw,32px)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance">
                    {verdict.headline}
                  </span>
                </div>
              </div>

              <p className="m-0 text-[17px] leading-[1.5] text-pretty">{verdict.detail}</p>

              {verdict.best && (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-divider bg-surface px-4 py-3.5">
                  <div className="flex flex-col gap-0.75">
                    <span className="whitespace-nowrap text-[13px] text-muted">{t.bestTime}</span>
                    <span className="font-heading text-[26px] font-semibold leading-none">
                      {decadeLabel(verdict.best.decade)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.75">
                    <span className="font-heading text-[30px] font-semibold leading-none" style={{ color: verdict.ink }}>
                      {(verdict.best.establishmentProb * 100).toFixed(0)}%
                    </span>
                    <span className="whitespace-nowrap text-[13px] text-muted">
                      {lang === "fr" ? "des années" : "of years"}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={speak}
                className="flex h-13 items-center justify-center gap-2.5 border border-divider-strong bg-surface text-base font-medium transition-colors hover:border-ink"
              >
                <Icon name="volume" size={20} />
                {speaking ? t.stop : t.listen}
              </button>
            </Panel>
          </motion.div>

          {/* Dryness, from the measured index */}
          <Panel className="flex flex-col gap-3.5 bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-semibold">{t.dryness}</span>
              <span className="text-[13px] text-muted">{station.name}</span>
            </div>
            {cond.spei3 ? (
              <>
                <div className="grid grid-cols-4 gap-1">
                  {t.lv.map((l, i) => {
                    const band = speiBand(cond.spei3!.value);
                    const here = i === band;
                    return (
                      <div key={l} className="flex flex-col items-center gap-1.5">
                        <div
                          className="self-stretch"
                          style={{
                            height: here ? 28 : 14,
                            background: ["#38A88A", "#E7A83B", "#EE8434", "#D96565"][i],
                            opacity: here ? 1 : 0.35,
                            outline: here ? "2px solid var(--ap-text)" : "none",
                            outlineOffset: 2,
                          }}
                        />
                        <span
                          className="text-center text-[13px]"
                          style={{
                            fontWeight: here ? 700 : 400,
                            color: here ? "var(--ap-text)" : "var(--ap-muted)",
                          }}
                        >
                          {l}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="m-0 text-[15px] leading-[1.5] text-muted">
                  {lang === "fr"
                    ? `Il est tombé ${cond.rain30} mm de pluie en 30 jours${
                        cond.rain30Normal ? `, contre ${cond.rain30Normal} mm d'habitude` : ""
                      }.`
                    : `${cond.rain30} mm of rain fell in the last 30 days${
                        cond.rain30Normal ? `, against ${cond.rain30Normal} mm in a normal year` : ""
                      }.`}
                </p>
              </>
            ) : (
              <p className="m-0 text-[15px] text-muted">
                {lang === "fr" ? "Pas de mesure pour ce mois." : "No measurement for this month."}
              </p>
            )}
          </Panel>

          {/* Real forecast */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-muted">{t.weather}</span>
              <span className="text-[13px] text-muted">
                {next7.length
                  ? `${next7.reduce((a, d) => a + (d.precip ?? 0), 0).toFixed(0)} mm`
                  : lang === "fr"
                    ? "chargement…"
                    : "loading…"}
              </span>
            </div>
            {next7.length ? (
              <div className="grid grid-cols-7 border border-divider bg-surface">
                {next7.map((d, i) => {
                  const day = new Date(d.date);
                  const rain = d.precip ?? 0;
                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center gap-1.5 border-r border-divider px-0.5 py-3 last:border-r-0"
                      style={{ background: i === 0 ? "var(--ap-neutral-100)" : "transparent" }}
                    >
                      <span className="text-[13px]" style={{ fontWeight: i === 0 ? 700 : 500 }}>
                        {day.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
                          weekday: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                      <span style={{ color: rain >= 1 ? "var(--ap-teal)" : "#D9A20B" }}>
                        <Icon name={rain >= 1 ? "rain" : "sun"} size={22} />
                      </span>
                      <span className="text-[15px] font-semibold">
                        {d.tmax == null ? "—" : `${d.tmax.toFixed(0)}°`}
                      </span>
                      <span
                        className="font-mono text-[11px]"
                        style={{ color: rain < 1 ? "var(--ap-faint)" : "var(--ap-teal)" }}
                      >
                        {rain.toFixed(rain >= 1 ? 0 : 0)} mm
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-divider p-6 text-center text-[13px] text-muted">
                {lang === "fr" ? "Prévisions indisponibles" : "Forecast unavailable"}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "fields" && (
        <div className="lg:col-span-2">
          <FarmLands lang={lang} />
        </div>
      )}

      {tab === "alerts" && (
        <div className="lg:col-span-2">
          <NoData
            icon="bell"
            title={lang === "fr" ? "Aucun message" : "No messages"}
            what={
              lang === "fr"
                ? "Les messages proviennent des règles d’alerte, qui ne sont pas encore en place. Les indices de sécheresse eux-mêmes sont bien calculés et visibles sur l’onglet Aujourd’hui."
                : "Messages come from alert rules, which are not in place yet. The drought indices themselves are computed and visible on the Today tab."
            }
            needs={lang === "fr" ? "moteur d’alertes" : "rules engine"}
          />
        </div>
      )}

      {tab === "help" && (
        <>
          <h1 className="font-heading text-[30px] font-semibold leading-none lg:col-span-2">{t.help}</h1>
          <Panel className="flex flex-col gap-3.5 bg-surface p-4.5">
            <span className="text-base font-semibold">
              {lang === "fr" ? "D’où viennent ces chiffres ?" : "Where these numbers come from"}
            </span>
            <div className="flex flex-col gap-2.5 text-[15px] leading-[1.5] text-muted">
              <p className="m-0">
                {lang === "fr"
                  ? `Une station météo à ${station.name} enregistre la pluie et la température chaque jour depuis ${station.coverage.from.slice(0, 4)}.`
                  : `A weather station at ${station.name} has recorded rain and temperature every day since ${station.coverage.from.slice(0, 4)}.`}
              </p>
              <p className="m-0">
                {lang === "fr"
                  ? "Pour chaque période de semis, ces 30 années sont rejouées pour compter combien de fois la pluie a suffi."
                  : "For each sowing period, those 30 years are replayed to count how often the rain was enough."}
              </p>
            </div>
            <Provenance>
              {station.coverage.days.toLocaleString("en-GB")} {lang === "fr" ? "jours mesurés" : "days measured"}
            </Provenance>
          </Panel>
          <NoData
            icon="phone"
            title={lang === "fr" ? "Aucun conseiller assigné" : "No advisor assigned"}
            what={
              lang === "fr"
                ? "Mettre un conseiller en relation demande un annuaire et un compte. Aucun des deux n’existe dans cette version."
                : "Putting you in touch with an advisor needs a directory and an account. Neither exists in this build."
            }
            needs={lang === "fr" ? "annuaire + comptes" : "directory + accounts"}
          />
        </>
      )}
    </div>
  );
}

/* ── Verdict ─────────────────────────────────────────────────────────── */

const STYLES = {
  go: { color: "#38A88A", ink: "#237A63", bg: "rgb(56 168 138 / 0.10)", border: "rgb(56 168 138 / 0.45)", icon: "check" as const },
  soon: { color: "#B7860B", ink: "#8A6508", bg: "rgb(231 168 59 / 0.14)", border: "rgb(201 138 0 / 0.5)", icon: "calendar" as const },
  wait: { color: "#D9621A", ink: "#B24E12", bg: "rgb(238 132 52 / 0.10)", border: "rgb(217 98 26 / 0.45)", icon: "hand" as const },
  none: { color: "#56727D", ink: "#34505B", bg: "rgb(20 43 53 / 0.04)", border: "rgb(20 43 53 / 0.2)", icon: "info" as const },
};

function verdictFor(stationId: string, cropId: string) {
  const decades = suitability(stationId, cropId);
  const now = new Date();
  const doy = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86_400_000);
  const current = Math.floor(doy / 10);

  const here = decades.find((d) => d.decade === current);
  const reliable = decades.filter((d) => d.water === "reliable");

  if (!reliable.length) {
    return {
      ...STYLES.none,
      headline: "No reliable rain window",
      detail: "In 30 years of records, rain alone has never reliably carried this crop here. It needs irrigation.",
      best: null as DecadeSuitability | null,
    };
  }

  const soonest = reliable
    .map((d) => ({ d, wait: (d.decade - current + 36) % 36 }))
    .sort((a, b) => a.wait - b.wait)[0];

  if (here?.water === "reliable") {
    return {
      ...STYLES.go,
      headline: "Good time to sow",
      detail: `In ${(here.establishmentProb * 100).toFixed(0)}% of the last 30 years, sowing now brought enough rain in the first three weeks.`,
      best: here,
    };
  }

  const weeks = Math.round((soonest.wait * 10) / 7);
  return {
    ...(soonest.wait <= 3 ? STYLES.soon : STYLES.wait),
    headline: soonest.wait <= 3 ? "Almost time" : "Wait",
    detail:
      soonest.wait <= 3
        ? `The most reliable period starts around ${decadeLabel(soonest.d.decade)}, about ${weeks} week${weeks === 1 ? "" : "s"} away.`
        : `Rain is not reliable enough yet. The best period starts around ${decadeLabel(soonest.d.decade)}.`,
    best: soonest.d,
  };
}

function speiBand(v: number) {
  if (v <= -2) return 3;
  if (v <= -1.5) return 2;
  if (v <= -1) return 1;
  return 0;
}
