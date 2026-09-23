"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Blueprint, ButtonLink, PageHeader, RiskBadge, TabStrip } from "@/components/ui/primitives";
import { HORIZONS, RISK_ZONES } from "@/lib/data";
import { linePath } from "@/lib/utils";

/* Gauge geometry: a 180° arc, 0 at the left, 100 at the right. */
const polar = (v: number): [number, number] => {
  const t = Math.PI * (1 - v / 100);
  return [150 + 120 * Math.cos(t), 150 - 120 * Math.sin(t)];
};

/* Trend series: 90 observed days then a 30-day forecast with an 80% band. */
const X = (i: number) => 40 + i * (950 / 119);
const Y = (v: number) => 250 - v * 2.4;

const { obs, fc, band } = (() => {
  const obs: [number, number][] = [];
  const fc: [number, number][] = [];
  const hi: [number, number][] = [];
  const lo: [number, number][] = [];
  for (let i = 0; i < 90; i++) {
    const v = 24 + 34 * (i / 89) ** 1.4 + 4 * Math.sin(i / 6) + 2 * Math.cos(i / 2.3);
    obs.push([X(i), Y(i === 89 ? 58 : v)]);
  }
  for (let i = 89; i < 120; i++) {
    const k = i - 89;
    const v = 58 + 13 * (k / 30) ** 0.8 + 1.5 * Math.sin(k / 3);
    const w = 2 + 13 * (k / 30);
    fc.push([X(i), Y(v)]);
    hi.push([X(i), Y(v + w)]);
    lo.push([X(i), Y(v - w)]);
  }
  const band =
    linePath(hi) + "L" + [...lo].reverse().map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L") + "Z";
  return { obs: linePath(obs), fc: linePath(fc), band };
})();

export function PageRisk() {
  const { site } = useConsole();
  const [h, setH] = React.useState(0);
  const [tab, setTab] = React.useState<"trend" | "spatial">("trend");

  const cur = HORIZONS[h];
  const [nx, ny] = polar(cur.s).map((n) => 150 + (n - 150) * 0.78);
  const a = polar(cur.s - cur.pm);
  const b = polar(cur.s + cur.pm);

  return (
    <div className="relative flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <div
        className="pointer-events-none absolute left-0 top-10 h-[420px] w-[640px]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, var(--ap-glow), transparent 65%)" }}
      />

      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; DROUGHT RISK &middot; {site.cc} / {site.name}
          </>
        }
        title="Drought risk outlook"
        actions={
          <div className="hidden items-center gap-3.5 font-mono text-[10.5px] text-muted lg:flex">
            <span>SCALE 0&ndash;100</span>
            <span className="flex gap-0.5">
              {(
                [
                  ["SAFE <25", "rgb(56 168 138 / 0.45)", "#38A88A"],
                  ["WATCH 25–50", "rgb(231 168 59 / 0.45)", "#E7A83B"],
                  ["SEVERE 50–75", "rgb(238 132 52 / 0.45)", "#EE8434"],
                  ["EXTREME >75", "rgb(217 101 101 / 0.5)", "#E07B7B"],
                ] as const
              ).map(([l, bd, ink]) => (
                <span key={l} className="border px-2 py-0.5" style={{ borderColor: bd, color: ink }}>
                  {l}
                </span>
              ))}
            </span>
          </div>
        }
      />

      {/* ── Horizon selector ──────────────────────────────────────────── */}
      <Blueprint className="relative grid grid-cols-2 xl:grid-cols-4">
        {HORIZONS.map((item, i) => {
          const on = h === i;
          return (
            <button
              key={item.label}
              onClick={() => setH(i)}
              aria-pressed={on}
              className="flex flex-col gap-2 border-b border-r border-divider px-5 py-4 text-left transition-colors duration-150 hover:bg-neutral-100 xl:border-b-0 xl:last:border-r-0"
              style={{
                background: on ? "var(--ap-neutral-100)" : "transparent",
                boxShadow: `inset 0 -2px 0 ${on ? "var(--ap-accent)" : "transparent"}`,
              }}
            >
              <span className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.1em] text-muted">
                <span>{item.label}</span>
                <span>{item.date}</span>
              </span>
              <span className="flex items-baseline gap-2.5">
                <span className="font-heading text-[40px] font-semibold leading-none tabular-nums">{item.s}</span>
                <RiskBadge score={item.s} showScore={false} />
              </span>
              <span className="font-mono text-[11px] text-muted">
                confidence {item.c}% &middot; &plusmn;{item.pm}
              </span>
            </button>
          );
        })}
      </Blueprint>

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Composite gauge ─────────────────────────────────────────── */}
        <Blueprint className="flex flex-col items-center gap-1.5 px-6 py-5">
          <div className="flex w-full justify-between font-mono text-[10.5px] tracking-[0.1em] text-muted">
            <span>COMPOSITE RISK &middot; {cur.label}</span>
            <span>{cur.date}</span>
          </div>
          <svg viewBox="0 0 300 180" className="block w-full max-w-[420px]">
            <path d="M30 150 A120 120 0 0 1 64.2 66.1" fill="none" stroke="#38A88A" strokeWidth={16} />
            <path d="M66.2 64.2 A120 120 0 0 1 148.6 30" fill="none" stroke="#E7A83B" strokeWidth={16} />
            <path d="M151.4 30 A120 120 0 0 1 233.8 64.2" fill="none" stroke="#EE8434" strokeWidth={16} />
            <path d="M235.8 66.1 A120 120 0 0 1 270 150" fill="none" stroke="#D96565" strokeWidth={16} />
            {/* 80% interval band */}
            <path
              d={`M${a[0].toFixed(1)} ${a[1].toFixed(1)} A120 120 0 0 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`}
              fill="none"
              stroke="var(--ap-text)"
              strokeOpacity={0.25}
              strokeWidth={30}
            />
            <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9}>
              <text x={18} y={168}>0</text>
              <text x={46} y={52}>25</text>
              <text x={143} y={16}>50</text>
              <text x={240} y={52}>75</text>
              <text x={266} y={168}>100</text>
            </g>
            <motion.line
              x1={150}
              y1={150}
              animate={{ x2: nx, y2: ny }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ stroke: "var(--ap-text)" }}
              strokeWidth={2}
            />
            <rect
              x={144}
              y={144}
              width={12}
              height={12}
              style={{ fill: "var(--ap-bg)", stroke: "var(--ap-text)" }}
              strokeWidth={1.5}
            />
          </svg>
          <div className="-mt-[54px] flex items-baseline gap-2">
            <span className="font-heading text-[64px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {cur.s}
            </span>
            <span className="font-mono text-[13px] text-muted">/100</span>
          </div>
          <RiskBadge score={cur.s} showScore={false} />
          <div className="mt-3.5 grid w-full grid-cols-3 border border-divider">
            {(
              [
                ["CONFIDENCE", `${cur.c}%`],
                ["80% INTERVAL", `${cur.s - cur.pm}–${cur.s + cur.pm}`],
                ["P(EXTREME)", `${cur.pe}%`],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={i < 2 ? "border-r border-divider px-3 py-2.5" : "px-3 py-2.5"}>
                <div className="font-mono text-[10px] text-muted">{k}</div>
                <div className="font-mono text-[15px]">{v}</div>
              </div>
            ))}
          </div>
        </Blueprint>

        {/* ── Model explanation ───────────────────────────────────────── */}
        <Blueprint
          className="flex flex-col gap-4 px-6 py-5.5"
          style={{ background: "linear-gradient(180deg, var(--ap-accent-100), transparent 60%)" }}
        >
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] text-accent">
            <Icon name="sparkles" size={14} />
            AI EXPLANATION
            <span className="ml-auto text-muted">APWRS-LSTM v2.4 &middot; ensemble n=50</span>
          </div>
          <div className="font-heading text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.15] tracking-[-0.01em] text-pretty">
            Risk is severe because almost no rain has fallen since mid-August while heat keeps drying the topsoil.
          </div>
          <div className="text-sm leading-[1.65] text-muted text-pretty">
            Ichkeul received <Figure>18.4 mm</Figure> in the last 30 days, about a third of normal.
            Evapotranspiration is running at <Figure>5.1 mm/day</Figure>, so the soil is losing water faster than it
            is replenished. Unless the rain expected around 8&ndash;14 November arrives, risk will likely reach the
            Extreme band before the durum wheat window opens.
          </div>
          <div className="flex flex-col gap-2.5 border-t border-divider pt-3.5">
            {(
              [
                ["Rainfall deficit", 38, "#EE8434"],
                ["High temperature", 24, "#EE8434"],
                ["Soil moisture decline", 19, "#E7A83B"],
              ] as const
            ).map(([n, w, c]) => (
              <div key={n} className="grid grid-cols-[130px_minmax(0,1fr)_48px] items-center gap-3 text-[13px] sm:grid-cols-[170px_minmax(0,1fr)_48px]">
                <span>{n}</span>
                <div className="h-2 bg-neutral-100">
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ background: c }}
                  />
                </div>
                <span className="text-right font-mono text-xs">{w}%</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-2.5">
            <ButtonLink href="/app/drivers" size="sm">
              All risk drivers
              <Icon name="arrow" size={14} />
            </ButtonLink>
            <Link href="/app/planting" className="flex items-center px-1 text-[13px] text-accent no-underline hover:underline">
              Impact on planting windows
            </Link>
          </div>
        </Blueprint>
      </div>

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "trend", label: "Risk trend" },
          { value: "spatial", label: "Spatial risk" },
        ]}
      />

      {tab === "trend" ? (
        <Blueprint className="px-5 py-4.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-heading text-lg font-semibold">
              Risk trend &middot; 90 days observed + 30 days forecast
            </span>
            <span className="flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-ink" />
                Observed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 border-t-2 border-dashed border-accent" />
                Forecast
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3.5 bg-accent-100" />
                80% band
              </span>
            </span>
          </div>
          <svg viewBox="0 0 1000 280" className="block w-full">
            <rect x={40} y={10} width={950} height={60} fill="#D96565" fillOpacity={0.05} />
            <rect x={40} y={70} width={950} height={60} fill="#EE8434" fillOpacity={0.05} />
            <rect x={40} y={130} width={950} height={60} fill="#E7A83B" fillOpacity={0.04} />
            <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.1 }}>
              <path d="M40 10H990M40 70H990M40 130H990M40 190H990M40 250H990" />
            </g>
            <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={10}>
              <text x={30} y={14} textAnchor="end">100</text>
              <text x={30} y={74} textAnchor="end">75</text>
              <text x={30} y={134} textAnchor="end">50</text>
              <text x={30} y={194} textAnchor="end">25</text>
              <text x={30} y={254} textAnchor="end">0</text>
              <text x={40} y={272}>25 Jun</text>
              <text x={237} y={272}>25 Jul</text>
              <text x={435} y={272}>24 Aug</text>
              <text x={712} y={272} style={{ fill: "var(--ap-text)" }}>23 Sep &middot; today</text>
              <text x={930} y={272}>23 Oct</text>
            </g>
            <path d={band} style={{ fill: "var(--ap-accent)" }} fillOpacity={0.12} />
            <line
              x1={X(89)}
              y1={10}
              x2={X(89)}
              y2={250}
              style={{ stroke: "var(--ap-text)", strokeOpacity: 0.4 }}
              strokeDasharray="3 3"
            />
            <motion.path
              d={obs}
              fill="none"
              style={{ stroke: "var(--ap-text)" }}
              strokeWidth={1.75}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.path
              d={fc}
              fill="none"
              style={{ stroke: "var(--ap-accent)" }}
              strokeWidth={2}
              strokeDasharray="6 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            />
            <rect
              x={X(89) - 4}
              y={Y(58) - 4}
              width={8}
              height={8}
              style={{ fill: "var(--ap-bg)", stroke: "var(--ap-text)" }}
              strokeWidth={1.5}
            />
          </svg>
        </Blueprint>
      ) : (
        <Blueprint className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="relative h-[460px]">
            <MapView layer="risk" legend opacity={0.55} className="absolute inset-0" />
          </div>
          <div className="flex flex-col border-divider xl:border-l">
            <div className="flex flex-col gap-2.5 border-b border-divider px-4.5 py-3.5">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
                AREA BY CLASS &middot; 278.7 KM&sup2;
              </span>
              <div className="flex h-2.5 gap-0.5">
                <div className="flex-[18.4]" style={{ background: "#38A88A" }} />
                <div className="flex-[96.1]" style={{ background: "#E7A83B" }} />
                <div className="flex-[142.7]" style={{ background: "#EE8434" }} />
                <div className="flex-[21.5]" style={{ background: "#D96565" }} />
              </div>
              <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                <span><span style={{ color: "#38A88A" }}>&#9632;</span> 18.4</span>
                <span><span style={{ color: "#E7A83B" }}>&#9632;</span> 96.1</span>
                <span><span style={{ color: "#EE8434" }}>&#9632;</span> 142.7</span>
                <span><span style={{ color: "#D96565" }}>&#9632;</span> 21.5</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                    <th className="border-b border-divider px-4.5 py-2.5 text-left font-normal uppercase">Zone</th>
                    <th className="border-b border-divider py-2.5 text-right font-normal uppercase">km&sup2;</th>
                    <th className="border-b border-divider py-2.5 text-left font-normal uppercase">Risk</th>
                    <th className="border-b border-divider py-2.5 pr-4.5 text-right font-normal uppercase">&Delta;7d</th>
                  </tr>
                </thead>
                <tbody>
                  {RISK_ZONES.map((z) => (
                    <tr key={z.id} className="transition-colors hover:bg-neutral-100">
                      <td className="border-b border-divider px-4.5 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11.5px]">{z.id}</span>
                          <span className="text-xs text-muted">{z.n}</span>
                        </div>
                      </td>
                      <td className="border-b border-divider text-right font-mono">{z.a.toFixed(1)}</td>
                      <td className="border-b border-divider">
                        <RiskBadge score={z.s} />
                      </td>
                      <td
                        className="border-b border-divider pr-4.5 text-right font-mono"
                        style={{ color: z.d.startsWith("+") ? "#EE8434" : "var(--ap-teal)" }}
                      >
                        {z.d}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Blueprint>
      )}
    </div>
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[13px] text-ink">{children}</span>;
}
