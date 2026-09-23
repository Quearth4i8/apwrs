"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, PageHeader, Segmented } from "@/components/ui/primitives";
import { CROPS, PLANTING_MONTHS, SEASON_DAYS, SEG_STYLE, type SegKind } from "@/lib/data";

type Irrigation = "rainfed" | "drip" | "sprinkler";

interface Warning {
  lv: "x" | "s";
  t: string;
  d: string;
  src: string;
}

/**
 * Agronomy rules that make a crop incompatible with the chosen irrigation
 * mode. These are the reason the page exists: a window is not just a date
 * range, it is a date range *given* how the plot is watered.
 */
function warningsFor(crop: string, irr: Irrigation): Warning[] {
  const out: Warning[] = [];
  if (crop === "durum" && irr === "drip")
    out.push({
      lv: "x",
      t: "Soil salinity incompatible with durum wheat under drip irrigation",
      d: "Ichkeul west plots measure ECe 4.8 dS/m. Drip concentrates salts at the wetting-front edge where durum roots develop; tolerance threshold is 4.0 dS/m. Switch to sprinkler, rainfed, or barley.",
      src: "SOIL · ICH-S04 · lab 12 Sep 2026",
    });
  if (crop === "durum")
    out.push({
      lv: "s",
      t: "Late sowing penalty after 18 Dec",
      d: "Each week of delay reduces yield potential by ~12% at this latitude.",
      src: "MODEL · yield response curve",
    });
  if (crop === "alfalfa")
    out.push({
      lv: "s",
      t: "Autumn window downgraded by drought trend",
      d: "Risk forecast 71 at +30 d. Autumn sowing only with guaranteed irrigation.",
      src: "FORECAST · run 23 Sep 06:00",
    });
  if (crop === "palm" && irr === "rainfed")
    out.push({
      lv: "x",
      t: "Date palm cannot establish rainfed at this site",
      d: "Annual rainfall 540 mm is far below offshoot water need; select drip.",
      src: "AGRONOMY RULE · DP-02",
    });
  if (irr === "sprinkler" && crop === "tomato")
    out.push({
      lv: "s",
      t: "Sprinkler raises foliar disease risk",
      d: "Late blight pressure increases with leaf wetness; prefer drip for tomato.",
      src: "AGRONOMY RULE · TM-05",
    });
  return out;
}

const WARN_STYLE = {
  x: { c: "#E07B7B", bd: "rgb(217 101 101 / 0.45)", bg: "rgb(217 101 101 / 0.07)" },
  s: { c: "#EE8434", bd: "rgb(238 132 52 / 0.4)", bg: "rgb(238 132 52 / 0.06)" },
} as const;

const TODAY_PCT = (22 / SEASON_DAYS) * 100;

export function PagePlanting() {
  const { site } = useConsole();
  const [cropId, setCropId] = React.useState("durum");
  const [irr, setIrr] = React.useState<Irrigation>("drip");

  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const warns = warningsFor(cropId, irr);

  return (
    <div className="relative flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <div
        className="pointer-events-none absolute -top-20 right-0 h-[360px] w-[700px]"
        style={{ background: "radial-gradient(ellipse at 60% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; PLANTING WINDOWS &middot; {site.cc} / {site.name} &middot; SEASON 2026/27
          </>
        }
        title="Planting windows"
        actions={
          <>
            <span className="hidden font-mono text-[10.5px] tracking-[0.08em] text-muted sm:inline">IRRIGATION</span>
            <Segmented
              value={irr}
              onChange={setIrr}
              options={[
                { value: "rainfed", label: "Rainfed" },
                { value: "drip", label: "Drip" },
                { value: "sprinkler", label: "Sprinkler" },
              ]}
            />
            <Button size="sm" className="h-[34px]">
              <Icon name="download" size={14} />
              Advisory PDF
            </Button>
          </>
        }
      />

      {/* ── Crop selector ─────────────────────────────────────────────── */}
      <Blueprint className="relative grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {CROPS.map((c) => {
          const on = cropId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCropId(c.id)}
              aria-pressed={on}
              className="flex flex-col gap-1.5 border-b border-r border-divider px-4 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-100 xl:border-b-0 xl:last:border-r-0"
              style={{
                background: on ? "var(--ap-accent-100)" : "transparent",
                boxShadow: `inset 0 -2px 0 ${on ? "var(--ap-accent)" : "transparent"}`,
              }}
            >
              <span
                className="flex items-center justify-between"
                style={{ color: on ? "var(--ap-accent)" : "var(--ap-muted)" }}
              >
                <Icon name={c.icon} size={16} />
                <span className="font-mono text-[10px] text-muted">{c.state}</span>
              </span>
              <span className="font-heading text-lg font-semibold leading-tight">{c.n}</span>
              <span className="font-mono text-[10.5px] text-muted">{c.v}</span>
            </button>
          );
        })}
      </Blueprint>

      {/* ── Season calendar ───────────────────────────────────────────── */}
      <Blueprint className="flex flex-col overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
            <span className="font-heading text-lg font-semibold">Season calendar &middot; Sep 2026 &rarr; Jun 2027</span>
            <span className="flex gap-4 font-mono text-[10.5px] text-muted">
              <CalLegend kind="o">Optimal</CalLegend>
              <CalLegend kind="m">Marginal</CalLegend>
              <CalLegend kind="r">Risky</CalLegend>
            </span>
          </div>

          <div className="grid grid-cols-[170px_minmax(0,1fr)]">
            <div />
            <div className="grid grid-cols-10 border-b border-l border-divider">
              {PLANTING_MONTHS.map((m) => (
                <div
                  key={m}
                  className="border-r border-divider px-2.5 py-2 font-mono text-[10.5px] tracking-[0.08em] text-muted"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {CROPS.map((c) => {
            const on = cropId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCropId(c.id)}
                className="grid grid-cols-[170px_minmax(0,1fr)] border-b border-divider text-left transition-colors hover:bg-neutral-100"
                style={{ background: on ? "var(--ap-neutral-100)" : "transparent" }}
              >
                <div
                  className="flex h-[46px] items-center gap-2.5 px-5 text-[13.5px]"
                  style={{ fontWeight: on ? 600 : 400 }}
                >
                  <span style={{ color: on ? "var(--ap-accent)" : "var(--ap-muted)" }}>
                    <Icon name={c.icon} size={15} />
                  </span>
                  {c.n}
                </div>
                <div
                  className="relative h-[46px] border-l border-divider"
                  style={{
                    backgroundImage: "linear-gradient(90deg, var(--ap-divider) 1px, transparent 1px)",
                    backgroundSize: "10% 100%",
                  }}
                >
                  {c.segs.map(([a, b, k], i) => (
                    <motion.div
                      key={i}
                      title={k === "o" ? "Optimal" : k === "m" ? "Marginal" : "Risky"}
                      className="absolute inset-y-3 box-border"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      style={{
                        left: `${(a / SEASON_DAYS) * 100}%`,
                        width: `${((b - a + 1) / SEASON_DAYS) * 100}%`,
                        background: SEG_STYLE[k].bg,
                        border: `1px solid ${SEG_STYLE[k].bd}`,
                      }}
                    />
                  ))}
                  <div className="absolute inset-y-0 w-px bg-ink opacity-60" style={{ left: `${TODAY_PCT}%` }} />
                </div>
              </button>
            );
          })}

          <div className="grid grid-cols-[170px_minmax(0,1fr)]">
            <div />
            <div className="relative h-6.5">
              <span
                className="absolute top-1.5 -translate-x-1/2 bg-ink px-1.5 py-px font-mono text-[10px] text-bg"
                style={{ left: `${TODAY_PCT}%` }}
              >
                TODAY 23 SEP
              </span>
            </div>
          </div>
        </div>
      </Blueprint>

      {/* ── Windows + warnings ────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-heading text-[22px] font-semibold">{crop.n} &mdash; why these windows</span>
            <span className="font-mono text-[11px] text-muted">
              {crop.v} &middot; {irr.toUpperCase()}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {crop.wins.map((w) => (
              <Blueprint
                key={w.k}
                className="flex flex-col gap-3 px-4.5 py-4"
                style={{ borderTop: `2px solid ${SEG_STYLE[w.cls].ink}` }}
              >
                <span
                  className="font-mono text-[10.5px] tracking-[0.1em]"
                  style={{ color: SEG_STYLE[w.cls].ink }}
                >
                  {w.k}
                </span>
                <span className="font-heading text-2xl font-semibold leading-none">{w.d}</span>
                <span className="font-mono text-[11px] text-muted">{w.m}</span>
                <div className="flex flex-col gap-2 border-t border-divider pt-2.5">
                  {w.why.map((y) => (
                    <div key={y} className="flex gap-2 text-[12.5px] leading-[1.45]">
                      <span className="flex-none" style={{ color: SEG_STYLE[w.cls].ink }}>
                        &mdash;
                      </span>
                      <span>{y}</span>
                    </div>
                  ))}
                </div>
              </Blueprint>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-[22px] font-semibold">Warnings</span>
            <span className="font-mono text-[11px] text-muted">
              {warns.length ? `${warns.length} active` : "none"}
            </span>
          </div>
          {warns.map((w) => {
            const st = WARN_STYLE[w.lv];
            return (
              <motion.div
                key={w.t}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 px-4 py-3.5"
                style={{ border: `1px solid ${st.bd}`, background: st.bg }}
              >
                <span className="mt-px flex flex-none" style={{ color: st.c }}>
                  <Icon name="alert" size={16} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13.5px] font-semibold leading-[1.3]">{w.t}</span>
                  <span className="text-[12.5px] leading-[1.5] text-muted">{w.d}</span>
                  <span className="font-mono text-[10.5px]" style={{ color: st.c }}>
                    {w.src}
                  </span>
                </div>
              </motion.div>
            );
          })}
          {!warns.length && (
            <div className="border border-dashed border-divider p-6 text-center text-[13px] text-muted">
              No compatibility issues for this crop and irrigation mode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalLegend({ kind, children }: { kind: SegKind; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5"
        style={{ background: SEG_STYLE[kind].bg, border: `1px solid ${SEG_STYLE[kind].bd}` }}
      />
      {children}
    </span>
  );
}
