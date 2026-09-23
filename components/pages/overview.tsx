"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { useIntro } from "@/lib/hooks";
import { Blueprint, Button, ButtonLink, Kicker, RiskBadge } from "@/components/ui/primitives";
import { OVERVIEW_ALERTS, SENSOR_ISSUES } from "@/lib/data";

const CARD_IN = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

export function PageOverview() {
  const { site } = useConsole();
  const t = useIntro();

  return (
    <div className="relative flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      {/* Accent bloom behind the masthead. */}
      <div
        className="pointer-events-none absolute -top-[120px] left-0 h-[360px] w-[720px]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Kicker className="text-[11px]">
            OVERVIEW &middot; {site.cc} / {site.name} &middot; WED 23 SEP 2026 &middot; 08:40 CET
          </Kicker>
          <h1 className="text-[clamp(28px,4.4vw,40px)] leading-none tracking-[-0.02em]">
            {site.name} &mdash; conditions today
          </h1>
          <div className="text-sm text-muted">
            Dry spell day 41. Drought risk is <span className="text-severe">severe</span> and rising; next durum
            wheat window opens in 50 days.
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button>
            <Icon name="download" size={15} />
            Export brief
          </Button>
          <ButtonLink href="/app/planting" variant="primary">
            <Icon name="sprout" size={15} />
            Planting windows
          </ButtonLink>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <Blueprint
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
        style={{ background: "color-mix(in srgb, var(--ap-surface) 70%, transparent)" }}
      >
        <Kpi
          label={<>RISK &middot; TODAY</>}
          badge={<RiskBadge level="severe" />}
          value={Math.round(58 * t)}
          unit="/100"
          foot={<>conf. 82% &middot; SPI-3 &minus;1.42</>}
        >
          <div className="relative h-1 bg-s3">
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${58 * t}%`, background: "linear-gradient(90deg,#38A88A,#E7A83B 45%,#EE8434)" }}
            />
            {[25, 50, 75].map((p) => (
              <div key={p} className="absolute -inset-y-[3px] w-px bg-bg" style={{ left: `${p}%` }} />
            ))}
          </div>
        </Kpi>

        <Kpi
          label={<>RISK &middot; +7 DAYS</>}
          badge={<RiskBadge level="severe" />}
          value={Math.round(63 * t)}
          unit={<span className="text-severe">&#9650; 5</span>}
          foot="peak 66 on Tue 29 Sep"
        >
          <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="block h-7 w-full">
            <path
              d="M0 20 L17 19 L34 17 L51 18 L68 14 L85 12 L102 10 L120 8"
              fill="none"
              stroke="#EE8434"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 20 L17 19 L34 17 L51 18 L68 14 L85 12 L102 10 L120 8 L120 28 L0 28Z"
              fill="#EE8434"
              fillOpacity={0.1}
            />
          </svg>
        </Kpi>

        <Kpi
          label={<>RAINFALL &middot; 30D</>}
          badge={
            <span className="text-teal">
              <Icon name="rain" size={15} />
            </span>
          }
          value={(18.4 * t).toFixed(1)}
          unit="mm"
          foot={
            <>
              <span className="text-severe">&minus;62%</span> vs 1991&ndash;2020 normal
            </>
          }
        >
          <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="block h-7 w-full">
            <g fill="var(--ap-teal)">
              {[
                [2, 18, 10],
                [10, 26, 2],
                [18, 22, 6],
                [42, 12, 16],
                [50, 24, 4],
                [82, 26, 2],
                [106, 20, 8],
              ].map(([x, y, h]) => (
                <rect key={x} x={x} y={y} width={4} height={h} />
              ))}
            </g>
            <path
              d="M0 6H120"
              stroke="var(--ap-muted)"
              strokeDasharray="2 3"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Kpi>

        <Kpi
          label={<>SOIL MOISTURE</>}
          badge={
            <span className="text-teal">
              <Icon name="droplet" size={15} />
            </span>
          }
          value={(14.2 * t).toFixed(1)}
          unit="% VWC"
          foot={
            <>
              <span className="text-severe">&minus;3.1 pts</span> in 7 days &middot; 0&ndash;30 cm
            </>
          }
        >
          <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="block h-7 w-full">
            <path
              d="M0 6 L20 8 L40 11 L60 13 L80 17 L100 19 L120 21"
              fill="none"
              stroke="var(--ap-teal)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Kpi>

        <Kpi
          label={<>NDVI &middot; SENTINEL-2</>}
          badge={
            <span className="text-accent">
              <Icon name="leaf" size={15} />
            </span>
          }
          value={(0.31 * t).toFixed(2)}
          unit="index"
          foot={
            <>
              <span className="text-watch">&minus;0.06</span> vs 5-yr median &middot; 21 Sep
            </>
          }
          last
        >
          <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="block h-7 w-full">
            <path
              d="M0 8 L20 7 L40 9 L60 12 L80 14 L100 17 L120 18"
              fill="none"
              stroke="var(--ap-accent)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 10 L120 10"
              stroke="var(--ap-muted)"
              strokeDasharray="2 3"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Kpi>
      </Blueprint>

      {/* ── Map + next window ─────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <motion.div {...CARD_IN}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-heading text-lg font-semibold">Risk map</span>
                <span className="font-mono text-[10.5px] text-muted">1 km grid &middot; model run 06:00 UTC</span>
              </div>
              <Link
                href="/app/map"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-accent no-underline hover:underline"
              >
                Open live map
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="relative h-[360px]">
              <MapView layer="risk" sensors legend className="absolute inset-0" />
            </div>
          </Blueprint>
        </motion.div>

        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.06 }}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <span className="font-heading text-lg font-semibold">Next planting window</span>
              <span className="font-mono text-[10.5px] text-muted">DURUM WHEAT &middot; RAINFED</span>
            </div>
            <div className="flex flex-1 flex-col gap-4.5 px-4 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">OPTIMAL SOWING</span>
                  <span className="font-heading text-[clamp(26px,3vw,34px)] font-semibold leading-none tracking-[-0.02em]">
                    12 Nov &rarr; 04 Dec
                  </span>
                  <span className="font-mono text-[11.5px] text-muted">23 days &middot; opens in 50 days</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[10.5px] text-muted">CONFIDENCE</span>
                  <span className="font-heading text-[26px] font-semibold leading-none">78%</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-4 font-mono text-[10px] text-muted">
                  <span>OCT</span>
                  <span>NOV</span>
                  <span>DEC</span>
                  <span>JAN</span>
                </div>
                <div className="flex h-[22px] gap-0.5">
                  <div
                    className="flex-[30]"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, rgb(217 101 101 / 0.35) 0 4px, transparent 4px 8px)",
                      border: "1px solid rgb(217 101 101 / 0.5)",
                    }}
                  />
                  <div
                    className="flex-[11]"
                    style={{ background: "rgb(231 168 59 / 0.25)", border: "1px solid rgb(231 168 59 / 0.55)" }}
                  />
                  <div
                    className="relative flex-[23]"
                    style={{ background: "rgb(43 166 184 / 0.3)", border: "1px solid var(--ap-accent)" }}
                  >
                    <span className="absolute -inset-y-[5px] left-1/4 w-0.5 bg-ink" />
                  </div>
                  <div
                    className="flex-[14]"
                    style={{ background: "rgb(231 168 59 / 0.25)", border: "1px solid rgb(231 168 59 / 0.55)" }}
                  />
                  <div
                    className="flex-[45]"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, rgb(217 101 101 / 0.35) 0 4px, transparent 4px 8px)",
                      border: "1px solid rgb(217 101 101 / 0.5)",
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-3.5 font-mono text-[10px] text-muted">
                  <LegendDot color="var(--ap-accent)">Optimal</LegendDot>
                  <LegendDot color="#E7A83B">Marginal</LegendDot>
                  <LegendDot color="#D96565">Risky</LegendDot>
                  <span className="ml-auto">&#9646; best day 17 Nov</span>
                </div>
              </div>

              <div className="flex flex-col border-t border-divider">
                <Reason icon="rain" note="p=0.71">
                  First effective rain (&gt;20 mm/5d) expected 8&ndash;14 Nov
                </Reason>
                <Reason icon="thermo" note="~10 Nov">
                  Soil temperature falls below 20 &deg;C at 5 cm
                </Reason>
              </div>

              <ButtonLink href="/app/planting" className="mt-auto">
                See all crops &amp; reasons
                <Icon name="arrow" size={14} />
              </ButtonLink>
            </div>
          </Blueprint>
        </motion.div>
      </div>

      {/* ── Alerts + sensor health ────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.1 }}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-heading text-lg font-semibold">Latest alerts</span>
                <span className="font-mono text-[10.5px] text-muted">4 unread</span>
              </div>
              <Link
                href="/app/alerts"
                className="flex items-center gap-1.5 text-[13px] text-accent no-underline hover:underline"
              >
                Inbox
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            {OVERVIEW_ALERTS.map((a) => (
              <Link
                key={a.t}
                href="/app/alerts"
                className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 border-b border-divider px-4 py-3 text-ink no-underline transition-colors hover:bg-neutral-100 sm:grid-cols-[96px_minmax(0,1fr)_120px_74px]"
              >
                <RiskBadge level={a.lv} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13.5px] font-medium">{a.t}</span>
                  <span className="truncate text-xs text-muted">{a.d}</span>
                </div>
                <span className="hidden font-mono text-[11px] text-muted sm:block">{a.r}</span>
                <span className="hidden text-right font-mono text-[11px] text-muted sm:block">{a.time}</span>
              </Link>
            ))}
          </Blueprint>
        </motion.div>

        <motion.div {...CARD_IN} transition={{ ...CARD_IN.transition, delay: 0.14 }}>
          <Blueprint hoverable className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
              <span className="font-heading text-lg font-semibold">Sensor health</span>
              <Link
                href="/app/sensors"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-accent no-underline hover:underline"
              >
                All stations
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-3 border border-divider">
                {(
                  [
                    ["ONLINE", 19, "var(--ap-teal)"],
                    ["DEGRADED", 3, "#E7A83B"],
                    ["OFFLINE", 2, "#E07B7B"],
                  ] as const
                ).map(([l, n, c], i) => (
                  <div key={l} className={i < 2 ? "border-r border-divider px-3.5 py-3" : "px-3.5 py-3"}>
                    <div className="font-mono text-[10px] tracking-[0.1em] text-muted">{l}</div>
                    <div className="font-heading text-[30px] font-semibold" style={{ color: c }}>
                      {n}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex h-1.5 gap-0.5">
                <div className="flex-[19] bg-teal" />
                <div className="flex-[3]" style={{ background: "#E7A83B" }} />
                <div className="flex-[2]" style={{ background: "#D96565" }} />
              </div>
              <div className="flex flex-col">
                {SENSOR_ISSUES.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-2.5 border-b border-divider py-2.5 text-[13px]"
                  >
                    <span className="size-1.5 flex-none" style={{ background: i.c }} />
                    <span className="w-[70px] font-mono text-[11.5px]">{i.id}</span>
                    <span className="flex-1 text-muted">{i.msg}</span>
                    <span className="font-mono text-[11px] text-muted">{i.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Blueprint>
        </motion.div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  badge,
  value,
  unit,
  foot,
  children,
  last,
}: {
  label: React.ReactNode;
  badge: React.ReactNode;
  value: React.ReactNode;
  unit: React.ReactNode;
  foot: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 border-b border-divider px-5 py-4.5 xl:border-b-0 ${
        last ? "" : "xl:border-r"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{label}</span>
        {badge}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-[48px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {value}
        </span>
        <span className="font-mono text-xs text-muted">{unit}</span>
      </div>
      {children}
      <div className="font-mono text-[11px] text-muted">{foot}</div>
    </div>
  );
}

function LegendDot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2" style={{ background: color }} />
      {children}
    </span>
  );
}

function Reason({
  icon,
  note,
  children,
}: {
  icon: "rain" | "thermo";
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 border-b border-divider py-2.5 text-[13px]">
      <span className="mt-0.5 text-teal">
        <Icon name={icon} size={14} />
      </span>
      <span className="flex-1">{children}</span>
      <span className="whitespace-nowrap font-mono text-[11px] text-muted">{note}</span>
    </div>
  );
}
