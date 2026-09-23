"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { ThemeScope } from "@/components/theme-provider";
import { Blueprint, ButtonLink, Corners, Input, RiskBadge } from "@/components/ui/primitives";
import { useIntro } from "@/lib/hooks";
import {
  LANDING_FAQ,
  LANDING_FEATURES,
  LANDING_INPUTS,
  LANDING_SITES,
  LANDING_SOURCES,
  MAGHREB_COAST,
} from "@/lib/data";

/* Equirectangular projection for the Maghreb overview map. */
const px = (lon: number) => (lon + 10) * 40;
const py = (lat: number) => (38 - lat) * 50;
const COAST_PATH = "M" + MAGHREB_COAST.map(([a, b]) => `${px(a).toFixed(1)} ${py(b).toFixed(1)}`).join("L");

const SECTIONS = [
  ["problem", "Problem"],
  ["how", "How it works"],
  ["features", "Features"],
  ["data", "Data"],
  ["regions", "Regions"],
  ["faq", "FAQ"],
] as const;

export function Landing() {
  const t = useIntro(1200);
  const [faq, setFaq] = React.useState(0);

  return (
    <ThemeScope theme="dark" className="min-h-dvh overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto max-w-[1280px] border-x border-divider">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-7 border-b border-divider bg-[color-mix(in_srgb,var(--ap-bg)_85%,transparent)] px-5 backdrop-blur-lg sm:px-8">
          <Link href="#top" className="flex items-center gap-2.5 text-ink no-underline">
            <Brand />
            <span className="font-heading text-[21px] font-semibold tracking-[0.02em]">APWRS</span>
          </Link>
          <nav className="hidden gap-6 text-sm lg:flex">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-muted no-underline transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex-1" />
          <span className="hidden font-mono text-[11px] text-muted sm:inline">
            <span className="text-ink">EN</span> / FR
          </span>
          <ButtonLink href="/login">Sign in</ButtonLink>
          <ButtonLink href="#access" variant="primary" className="hidden sm:inline-flex">
            Request access
          </ButtonLink>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section id="top" className="rule-grid relative border-b border-divider px-5 pb-18 pt-22 sm:px-8">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 70% 55%, var(--ap-glow), transparent 70%), linear-gradient(180deg, transparent 60%, var(--ap-bg))",
            }}
          />
          <div className="relative grid items-center gap-14 xl:grid-cols-2">
            <div className="flex flex-col gap-6.5">
              <span className="flex w-fit items-center gap-2.5 border border-divider bg-bg px-2.5 py-1.25 font-mono text-[11px] tracking-[0.08em] text-muted">
                <span className="size-1.5 bg-accent" />
                SEASON 2026/27 FORECASTS LIVE &middot; TN &middot; MA &middot; DZ
              </span>
              <h1 className="text-[clamp(44px,7vw,76px)] leading-[0.95] tracking-[-0.035em] text-balance">
                Plant on the right day, even in a drought year.
              </h1>
              <p className="max-w-[520px] text-[18px] leading-[1.55] text-muted text-pretty">
                APWRS turns climate, soil, satellite and drought-index data into one risk score and a sowing window
                for every crop and site across North Africa.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="#access" variant="primary" size="lg">
                  Request access
                  <Icon name="arrow" size={16} />
                </ButtonLink>
                <ButtonLink href="/login" size="lg">
                  Sign in
                </ButtonLink>
              </div>
              <div className="flex flex-wrap gap-7 pt-2 font-mono text-[11.5px] text-muted">
                <span>~9 km model grid</span>
                <span>9 crops</span>
                <span>30-year station record</span>
                <span>EN &middot; FR</span>
              </div>
            </div>

            <Blueprint className="bg-bg shadow-lift">
              <div className="flex h-9.5 items-center gap-2.5 border-b border-divider px-3.5 font-mono text-[11px] text-muted">
                <span className="flex gap-1.25">
                  <span className="size-2 border border-divider-strong" />
                  <span className="size-2 border border-divider-strong" />
                  <span className="size-2 border border-divider-strong" />
                </span>
                <span className="ml-2">TN / Ichkeul &middot; Live map</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="size-1.5 bg-accent" />
                  06:00 UTC run
                </span>
              </div>
              <div className="relative h-[clamp(320px,42vw,440px)]">
                <MapView layer="risk" sensors interactive={false} opacity={0.48} className="absolute inset-0" />

                <Blueprint className="absolute bottom-4.5 left-4.5 flex w-[250px] flex-col gap-2.5 bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] p-4 backdrop-blur-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.1em] text-muted">DROUGHT RISK &middot; TODAY</span>
                    <RiskBadge level="severe" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading text-[52px] font-semibold leading-none tabular-nums">
                      {Math.round(58 * t)}
                    </span>
                    <span className="font-mono text-xs text-muted">/100</span>
                    <span className="ml-auto font-mono text-[11px] text-severe">&#9650; 63 in 7 d</span>
                  </div>
                  <div className="flex h-1 gap-0.5">
                    <div className="flex-1" style={{ background: "#38A88A" }} />
                    <div className="flex-1" style={{ background: "#E7A83B" }} />
                    <div className="relative flex-1" style={{ background: "#EE8434" }}>
                      <span className="absolute -inset-y-1 left-[32%] w-0.5 bg-ink" />
                    </div>
                    <div className="flex-1" style={{ background: "#D96565" }} />
                  </div>
                </Blueprint>

                <div className="absolute right-4.5 top-4.5 hidden flex-col gap-1 border bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3.5 py-3 sm:flex"
                  style={{ borderColor: "color-mix(in srgb, var(--ap-accent) 45%, transparent)" }}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-accent">
                    <Icon name="sprout" size={13} />
                    DURUM WHEAT &middot; OPTIMAL
                  </span>
                  <span className="font-heading text-[22px] font-semibold">12 Nov &rarr; 04 Dec</span>
                </div>
              </div>
            </Blueprint>
          </div>
        </section>

        {/* ── Problem ──────────────────────────────────────────────────── */}
        <section id="problem" className="grid gap-12 border-b border-divider px-5 py-22 sm:px-8 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent">01 &middot; THE PROBLEM</span>
            <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em] text-balance">
              Rain has become a guess. Sowing dates shouldn&rsquo;t be.
            </h2>
          </div>
          <div className="border-t border-divider">
            {(
              [
                [
                  "A",
                  "The first autumn rain keeps shifting",
                  "Across the Maghreb, the date of the first useful rain now varies by weeks from one year to the next, and multi-year droughts have become more frequent.",
                ],
                [
                  "B",
                  "One wrong week can cost the season",
                  "Sow too early and seedlings die in dry soil; too late and grain fill runs into spring heat. Traditional calendars no longer hold.",
                ],
                [
                  "C",
                  "The evidence is scattered",
                  "Satellite indices, reanalysis, station records and field probes live in different agencies and formats — rarely in front of the person deciding.",
                ],
              ] as const
            ).map(([k, t, d]) => (
              <div key={k} className="grid grid-cols-[48px_1fr] gap-4 border-b border-divider py-5.5">
                <span className="font-mono text-xs text-muted">{k}</span>
                <div>
                  <div className="mb-1.5 font-heading text-[22px] font-semibold">{t}</div>
                  <div className="text-[15px] leading-[1.55] text-muted">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section id="how" className="dot-grid flex flex-col gap-12 border-b border-divider px-5 py-22 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex max-w-[640px] flex-col gap-4">
              <span className="font-mono text-[11px] tracking-[0.12em] text-accent">02 &middot; HOW IT WORKS</span>
              <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em]">
                Data &rarr; model &rarr; a date you can act on.
              </h2>
            </div>
            <p className="max-w-[400px] text-[15px] leading-[1.55] text-muted">
              Every run ingests fresh observations, scores drought risk on a shared 0&ndash;100 scale and recomputes
              the sowing windows for each crop.
            </p>
          </div>

          <div className="relative grid items-center gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,2.6fr)]">
            {/* Flow lines, desktop only. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible xl:block"
            >
              <g fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={1.25} vectorEffect="non-scaling-stroke">
                {["M30 11 C 36 11, 34 50, 40 50", "M30 37 C 36 37, 34 50, 40 50", "M30 63 C 36 63, 34 50, 40 50", "M30 89 C 36 89, 34 50, 40 50", "M64 50 L 74 50"].map(
                  (d) => (
                    <path
                      key={d}
                      d={d}
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                      className="motion-safe:animate-[dash_1.2s_linear_infinite]"
                    />
                  ),
                )}
              </g>
            </svg>

            <div className="relative flex flex-col gap-3.5">
              {LANDING_INPUTS.map((n) => (
                <Blueprint key={n.t} className="flex items-center gap-3 bg-surface px-3.5 py-3">
                  <span className="grid size-8.5 flex-none place-items-center border border-divider text-teal">
                    <Icon name={n.icon} size={17} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{n.t}</span>
                    <span className="font-mono text-[10.5px] text-muted">{n.d}</span>
                  </span>
                  <span className="absolute -right-[5px] top-1/2 -mt-1 hidden size-2 border-[1.5px] border-accent bg-bg xl:block" />
                </Blueprint>
              ))}
            </div>

            <div className="hidden xl:block" />

            <Blueprint
              className="flex flex-col gap-3.5 bg-surface p-5.5"
              style={{
                borderColor: "color-mix(in srgb, var(--ap-accent) 45%, transparent)",
                boxShadow: "0 0 60px -10px var(--ap-glow)",
              }}
            >
              <span className="absolute -left-[5px] top-1/2 -mt-1 hidden size-2 border-[1.5px] border-accent bg-bg xl:block" />
              <span className="absolute -right-[5px] top-1/2 -mt-1 hidden size-2 border-[1.5px] border-accent bg-bg xl:block" />
              <span className="grid size-11 place-items-center bg-accent text-bg">
                <Icon name="cpu" size={22} />
              </span>
              <span className="font-heading text-[26px] font-semibold leading-none">AI forecasting model</span>
              <span className="text-[13.5px] leading-[1.5] text-muted">
                An LSTM ensemble scores drought risk at +0, +7, +14 and +30 days, with a confidence band and a
                plain-language explanation of each driver.
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px]">
                {["SPI", "SPEI", "PDSI", "SHAP"].map((x) => (
                  <span key={x} className="border border-divider px-1.75 py-0.75">
                    {x}
                  </span>
                ))}
              </div>
            </Blueprint>

            <div className="hidden xl:block" />

            <Blueprint className="flex flex-col gap-3.5 bg-surface p-5.5">
              <span className="absolute -left-[5px] top-1/2 -mt-1 hidden size-2 border-[1.5px] border-accent bg-bg xl:block" />
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">PLANTING RECOMMENDATION</span>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["Durum wheat", [3, 1, 2, 3]],
                    ["Barley", [2.6, 1, 3.6, 1.8]],
                    ["Olive", [0, 3, 4, 2]],
                  ] as const
                ).map(([crop, flex]) => (
                  <div key={crop} className="grid grid-cols-[90px_1fr] items-center gap-2.5 text-[13px]">
                    <span>{crop}</span>
                    <div className="flex h-3.5 gap-0.5">
                      {flex[0] > 0 && <div style={{ flex: flex[0], background: "rgb(217 101 101 / 0.35)" }} />}
                      <div style={{ flex: flex[1], background: "rgb(231 168 59 / 0.4)" }} />
                      <div style={{ flex: flex[2], background: "var(--ap-accent)" }} />
                      <div style={{ flex: flex[3], background: "rgb(217 101 101 / 0.35)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-[13.5px] leading-[1.5] text-muted">
                Optimal, marginal and risky sowing periods &mdash; each with the reasons and warnings behind it.
              </span>
            </Blueprint>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section id="features" className="border-b border-divider">
          <div className="flex flex-col gap-4 px-5 pb-10 pt-22 sm:px-8">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent">03 &middot; FEATURES</span>
            <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em]">One scale. Every decision.</h2>
          </div>
          <div className="grid border-t border-divider sm:grid-cols-2 xl:grid-cols-3">
            {LANDING_FEATURES.map((f, i) => (
              <div
                key={f.t}
                className="flex flex-col gap-3.5 border-b border-r border-divider p-8 transition-colors duration-200 hover:bg-neutral-100"
              >
                <span className="flex justify-between text-accent">
                  <Icon name={f.icon} size={20} />
                  <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
                </span>
                <span className="font-heading text-2xl font-semibold">{f.t}</span>
                <span className="text-[14.5px] leading-[1.55] text-muted">{f.d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Data sources ─────────────────────────────────────────────── */}
        <section id="data" className="flex flex-col gap-10 border-b border-divider px-5 py-22 sm:px-8">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent">04 &middot; DATA SOURCES</span>
            <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em]">
              Open science, fused with your field data.
            </h2>
          </div>
          <Blueprint className="grid sm:grid-cols-2 xl:grid-cols-6">
            {LANDING_SOURCES.map((s) => (
              <div key={s.n} className="flex flex-col gap-2.5 border-b border-r border-divider px-5 py-5.5">
                <span className="font-heading text-2xl font-semibold">{s.n}</span>
                <span className="text-[13px] text-muted">{s.w}</span>
                <span className="mt-auto font-mono text-[11px] text-teal">{s.r}</span>
              </div>
            ))}
          </Blueprint>
        </section>

        {/* ── Regions ──────────────────────────────────────────────────── */}
        <section id="regions" className="grid items-center gap-12 border-b border-divider px-5 py-22 sm:px-8 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent">05 &middot; COVERED REGIONS</span>
            <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em]">
              From the Ichkeul wetlands to the Sa&iuml;ss plain.
            </h2>
            <div className="mt-3 flex flex-col border-t border-divider">
              {LANDING_SITES.map(([cc, n, , , coord]) => (
                <div key={n} className="grid grid-cols-[34px_1fr_auto] gap-3 border-b border-divider py-2.75 text-sm">
                  <span className="font-mono text-[11px] text-muted">{cc}</span>
                  <span>{n}</span>
                  <span className="font-mono text-[11px] text-muted">{coord}</span>
                </div>
              ))}
            </div>
          </div>
          <Blueprint style={{ background: "var(--ap-map-sea)" }}>
            <svg viewBox="0 0 880 400" className="block w-full">
              <defs>
                <pattern id="apdots" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#E6F1F5" fillOpacity={0.14} />
                </pattern>
              </defs>
              <path d={`${COAST_PATH}L880 400L0 400Z`} fill="url(#apdots)" />
              <path d={COAST_PATH} fill="none" style={{ stroke: "var(--ap-teal)" }} strokeOpacity={0.6} strokeWidth={1.2} />
              <g style={{ stroke: "#E6F1F5", strokeOpacity: 0.07 }} strokeDasharray="2 4">
                <path d="M0 50H880M0 150H880M0 250H880M0 350H880M200 0V400M400 0V400M600 0V400M800 0V400" />
              </g>
              <g style={{ fontFamily: "var(--font-mono)", fill: "#E6F1F5" }} fontSize={10} fillOpacity={0.35}>
                <text x={204} y={394}>5&deg;W</text>
                <text x={404} y={394}>0&deg;</text>
                <text x={604} y={394}>5&deg;E</text>
                <text x={804} y={394}>10&deg;E</text>
                <text x={6} y={146}>36&deg;N</text>
                <text x={6} y={246}>34&deg;N</text>
                <text x={6} y={346}>32&deg;N</text>
              </g>
              <g style={{ fontFamily: "var(--font-mono)", fill: "#E6F1F5" }} fontSize={12} letterSpacing={4} fillOpacity={0.3}>
                <text x={170} y={300}>MOROCCO</text>
                <text x={470} y={300}>ALGERIA</text>
                <text x={760} y={200}>TUNISIA</text>
              </g>
              {LANDING_SITES.filter((s) => s[1] !== "Saïss Plain").map(([, n, lon, lat, , side]) => {
                const x = px(lon);
                const y = py(lat);
                const right = side === "r";
                return (
                  <g key={n}>
                    <rect
                      x={x - 4.5}
                      y={y - 4.5}
                      width={9}
                      height={9}
                      style={{ fill: "var(--ap-accent)", stroke: "var(--ap-bg)" }}
                      strokeWidth={1.5}
                    />
                    <circle cx={x} cy={y} r={13} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeOpacity={0.35} />
                    <text
                      x={right ? x + 18 : x - 18}
                      y={y + 4}
                      textAnchor={right ? "start" : "end"}
                      style={{ fontFamily: "var(--font-mono)", fill: "#E6F1F5" }}
                      fontSize={11}
                    >
                      {n}
                    </text>
                  </g>
                );
              })}
              <text x={560} y={40} style={{ fontFamily: "var(--font-mono)", fill: "#E6F1F5" }} fontSize={10} letterSpacing={3} fillOpacity={0.3}>
                MEDITERRANEAN SEA
              </text>
            </svg>
          </Blueprint>
        </section>

        {/* ── Partners ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-5 border-b border-divider px-5 py-10 sm:px-8">
          <span className="font-mono text-[11px] tracking-[0.12em] text-muted">
            DEVELOPED WITH RESEARCH, EXTENSION AND PARK PARTNERS
          </span>
          <div className="grid grid-cols-2 border border-divider sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="grid h-21 place-items-center border-b border-r border-divider font-mono text-[11px] tracking-[0.08em] text-faint"
              >
                PARTNER LOGO
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="grid gap-12 border-b border-divider px-5 py-22 sm:px-8 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent">06 &middot; FAQ</span>
            <h2 className="text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.025em]">Questions</h2>
          </div>
          <div className="flex flex-col border-t border-divider">
            {LANDING_FAQ.map(([q, a], i) => {
              const open = faq === i;
              return (
                <div key={q} className="border-b border-divider">
                  <button
                    onClick={() => setFaq(open ? -1 : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left font-heading text-[21px] font-semibold transition-colors hover:text-accent"
                  >
                    <span>{q}</span>
                    <span className="w-5 text-center font-mono text-base text-muted">{open ? "−" : "+"}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5.5 pr-10 text-[15px] leading-[1.6] text-muted">{a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Request access ───────────────────────────────────────────── */}
        <section
          id="access"
          className="relative flex flex-col items-center gap-6 overflow-hidden border-b border-divider px-5 py-24 text-center sm:px-8"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 50% 70% at 50% 100%, var(--ap-glow), transparent 70%)" }}
          />
          <h2 className="relative max-w-[800px] text-[clamp(38px,6vw,60px)] leading-none tracking-[-0.03em] text-balance">
            Bring APWRS to your region.
          </h2>
          <p className="relative max-w-[520px] text-base text-muted">
            Access is granted to agronomists, researchers and protected-area authorities. We reply within two working
            days.
          </p>
          <form
            className="relative flex w-full max-w-[520px] flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input type="email" placeholder="you@institution.org" aria-label="Work email" className="h-11 flex-1 text-[15px]" />
            <button
              type="submit"
              className="relative flex h-11 items-center justify-center border border-accent bg-accent px-5 font-heading text-[15px] font-semibold text-bg transition-colors hover:bg-accent-600 active:bg-accent-700"
            >
              <Corners />
              Request access
            </button>
          </form>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="grid gap-8 px-5 pb-8 pt-12 text-sm sm:px-8 xl:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="font-heading text-[22px] font-semibold">APWRS</span>
            <span className="leading-[1.5] text-muted">Adaptive Planting Window Recommendation System</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint">CONTACT</span>
            <a href="mailto:contact@apwrs.org" className="text-ink no-underline hover:underline">
              contact@apwrs.org
            </a>
            <span className="text-muted">Tunis &middot; Rabat &middot; Algiers</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint">PRODUCT</span>
            <a href="#how" className="text-muted no-underline hover:text-ink">How it works</a>
            <a href="#data" className="text-muted no-underline hover:text-ink">Data sources</a>
            <Link href="/login" className="text-muted no-underline hover:text-ink">Sign in</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint">LEGAL</span>
            <span className="text-muted">Privacy</span>
            <span className="text-muted">Terms</span>
            <span className="text-muted">Data licences</span>
          </div>
          <div className="col-span-full flex flex-wrap justify-between gap-3 border-t border-divider pt-6 font-mono text-[11px] text-faint">
            <span>&copy; 2026 APWRS</span>
            <span>v2.4.1 &middot; status: all systems normal</span>
          </div>
        </footer>
      </div>
    </ThemeScope>
  );
}
