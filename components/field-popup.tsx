"use client";

import { LAYER } from "@/lib/map-layers";
import type { Land } from "@/lib/lands";
import type { S2Index } from "@/lib/s2";
import type { useFieldIndices } from "@/lib/s2-tiles";
import { RISK_COLOR, RISK_LABEL, riskLevel } from "@/lib/utils";

type Lang = "en" | "fr";
const tr = (lang: Lang, en: string, fr: string) => (lang === "fr" ? fr : en);

/**
 * A field's own NDVI and NDWI, from the Sentinel-2 pixels inside it, and —
 * when given — the drought risk of the grid cell it sits in.
 */
export function FieldPopup({
  land,
  field,
  risk,
  lang = "en",
}: {
  land: Land;
  field: ReturnType<typeof useFieldIndices>;
  risk?: number | null;
  lang?: Lang;
}) {
  const row = (k: S2Index) => {
    const st = field.data?.[k];
    return (
      <span key={k} className="flex items-baseline justify-between gap-3">
        <span>{LAYER[k].label}</span>
        <span className="tabular-nums">
          <strong>{st ? LAYER[k].format(st.mean) : "—"}</strong>
          {st && (
            <span className="text-muted">
              {" "}
              ({LAYER[k].format(st.p10)} {tr(lang, "to", "à")} {LAYER[k].format(st.p90)})
            </span>
          )}
        </span>
      </span>
    );
  };
  const px = field.data?.ndvi?.pixels ?? field.data?.ndwi?.pixels;
  return (
    <div className="flex flex-col gap-1 text-[12.5px]">
      <span className="font-semibold">
        {land.name} <span className="font-normal text-muted">· {land.areaHa.toFixed(2)} ha</span>
      </span>
      {risk != null && (
        <span className="flex items-baseline justify-between gap-3">
          <span>{tr(lang, "Drought risk", "Risque de sécheresse")}</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: RISK_COLOR[riskLevel(risk)] }} />
            <strong className="tabular-nums">{LAYER.risk.format(risk)}</strong>
            <span className="text-muted">{RISK_LABEL[riskLevel(risk)]}</span>
          </span>
        </span>
      )}
      {field.loading ? (
        <span className="text-muted">{tr(lang, "Reading the field’s Sentinel-2 pixels…", "Lecture des pixels Sentinel-2 de la parcelle…")}</span>
      ) : field.error ? (
        <span className="text-muted">{tr(lang, "Sentinel-2 is unavailable for this field right now", "Sentinel-2 est indisponible pour cette parcelle pour le moment")}</span>
      ) : (
        <>
          {row("ndvi")}
          {row("ndwi")}
          <span className="text-muted">
            {tr(
              lang,
              `Mean (10th to 90th percentile) of ${px ?? 0} clear 10 m pixels inside the field · 30-day least-cloud mosaic`,
              `Moyenne (10e à 90e centile) de ${px ?? 0} pixels de 10 m dégagés dans la parcelle · mosaïque 30 jours, la moins nuageuse`,
            )}
            {risk != null && tr(lang, " · risk from the ~9 km weather grid", " · risque issu de la grille météo ~9 km")}
          </span>
        </>
      )}
    </div>
  );
}
