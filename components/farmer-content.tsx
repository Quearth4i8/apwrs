"use client";

import * as React from "react";
import { Panel } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { STATIONS, type Station } from "@/lib/climate";
import { FARMER_TEXT, type Lang } from "@/lib/farmer-data";
import { FarmLands } from "@/components/farm-lands";
import { PracticeCarousel } from "@/components/practice-carousel";
import { WeekForecast } from "@/components/week-forecast";
import { NextSteps } from "@/components/next-steps";
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

  return (
    <div
      className={
        className ??
        "grid content-start items-start gap-5 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-2 lg:gap-7 lg:px-8"
      }
    >
      {tab === "today" && (
        <>
          <PracticeCarousel lang={lang} />
          <NextSteps stationId={station.id} lang={lang} />
          <WeekForecast stationId={station.id} lang={lang} />
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
                ? "Les messages proviennent des règles d’alerte, qui ne sont pas encore en place. Les indices de sécheresse eux-mêmes sont bien calculés et visibles sur l’onglet Accueil."
                : "Messages come from alert rules, which are not in place yet. The drought indices themselves are computed and visible on the Home tab."
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
