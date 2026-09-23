"use client";

import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, PageHeader, RiskBadge } from "@/components/ui/primitives";
import { FORECAST_ROWS } from "@/lib/data";
import { linePath } from "@/lib/utils";

/* ── Soil water balance: weekly precipitation and crop ET against storage ── */
const Y = (v: number) => 220 - v * (200 / 120);
const bx = (i: number) => 44 + i * 32.5;

const WATER_BALANCE = (() => {
  const P = [4, 0, 2, 0, 0, 6, 0, 1, 0, 3, 14, 22, 9, 26, 18, 30];
  let sw = 58;
  const out: { i: number; p: number; e: number; sw: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const e = i < 10 ? 26 - i * 0.9 : 14 - i * 0.3;
    sw = Math.max(34, Math.min(98, sw + P[i] * 0.9 - e * 0.35));
    out.push({ i, p: P[i], e, sw });
  }
  return out;
})();

/* ── Evapotranspiration: reference ET0 and crop ETc over 60 days ────────── */
const EY = (v: number) => 220 - v * 25;
const ex = (i: number) => 36 + i * (516 / 59);

const { et0, etc } = (() => {
  const et0: [number, number][] = [];
  const etc: [number, number][] = [];
  for (let i = 0; i < 60; i++) {
    const v = 6.2 - 2.6 * (i / 59) + 0.5 * Math.sin(i / 2.1) + (i > 40 ? -0.3 : 0);
    et0.push([ex(i), EY(v)]);
    etc.push([ex(i), EY(v * 0.65)]);
  }
  return { et0, etc };
})();

export function PageForecasts() {
  const { site } = useConsole();

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; FORECASTS &middot; {site.cc} / {site.name}
          </>
        }
        title="Forecasts"
        lede="ECMWF SEAS5 + ERA5-Land downscaled to 1 km, blended with station data. Issued 23 Sep 2026 06:00 UTC."
        actions={
          <>
            <Button>
              <Icon name="refresh" size={15} />
              Re-run model
            </Button>
            <Button>
              <Icon name="download" size={15} />
              CSV
            </Button>
          </>
        }
      />

      <Blueprint className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
              <th className="w-[150px] border-b border-divider px-4.5 py-3 text-left font-normal uppercase">
                Time frame
              </th>
              <th className="w-[130px] border-b border-divider py-3 text-left font-normal uppercase">Risk level</th>
              <th className="border-b border-divider py-3 text-left font-normal uppercase">Prediction</th>
              <th className="border-b border-divider py-3 text-left font-normal uppercase">Recommended action</th>
              <th className="w-[150px] border-b border-divider py-3 pr-4.5 text-left font-normal uppercase">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {FORECAST_ROWS.map((r) => (
              <tr key={r.f} className="transition-colors hover:bg-neutral-100">
                <td className="border-b border-divider px-4.5 py-3.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{r.f}</span>
                    <span className="font-mono text-[11px] text-muted">{r.d}</span>
                  </div>
                </td>
                <td className="border-b border-divider">
                  <RiskBadge score={r.s} />
                </td>
                <td className="border-b border-divider font-mono text-xs text-muted">{r.p}</td>
                <td className="border-b border-divider pr-4 leading-[1.45]">{r.a}</td>
                <td className="border-b border-divider pr-4.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-neutral-100">
                      <div className="h-full bg-teal" style={{ width: `${r.c}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-[11.5px]">{r.c}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Blueprint>

      <div className="grid gap-6 xl:grid-cols-2">
        <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-heading text-lg font-semibold">Soil water balance</span>
            <span className="font-mono text-[10.5px] text-muted">ROOT ZONE 0&ndash;60 CM &middot; WEEKLY &middot; MM</span>
          </div>
          <svg viewBox="0 0 560 250" className="block w-full">
            <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
              <path d="M36 20H552M36 70H552M36 120H552M36 170H552M36 220H552" />
            </g>
            <line x1={36} y1={Y(96)} x2={552} y2={Y(96)} style={{ stroke: "var(--ap-teal)" }} strokeDasharray="4 3" />
            <text
              x={548}
              y={Y(96) - 5}
              textAnchor="end"
              style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-teal)" }}
              fontSize={9}
            >
              FIELD CAPACITY 96
            </text>
            <line x1={36} y1={Y(38)} x2={552} y2={Y(38)} stroke="#D96565" strokeDasharray="4 3" />
            <text
              x={548}
              y={Y(38) - 5}
              textAnchor="end"
              style={{ fontFamily: "var(--font-mono)" }}
              fill="#E07B7B"
              fontSize={9}
            >
              WILTING POINT 38
            </text>
            {WATER_BALANCE.map((b) => (
              <g key={b.i}>
                <rect
                  x={bx(b.i) - 12}
                  y={Y(b.p * 2.2)}
                  width={12}
                  height={(b.p * 2.2 * 200) / 120}
                  style={{ fill: "var(--ap-teal)" }}
                  fillOpacity={0.8}
                />
                <rect x={bx(b.i)} y={Y(b.e)} width={12} height={(b.e * 200) / 120} fill="#EE8434" fillOpacity={0.75} />
              </g>
            ))}
            <path
              d={linePath(WATER_BALANCE.map((w) => [bx(w.i), Y(w.sw)]))}
              fill="none"
              style={{ stroke: "var(--ap-text)" }}
              strokeWidth={1.75}
            />
            <line
              x1={bx(8)}
              y1={20}
              x2={bx(8)}
              y2={220}
              style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }}
              strokeDasharray="3 3"
            />
            <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
              <text x={30} y={24} textAnchor="end">120</text>
              <text x={30} y={124} textAnchor="end">60</text>
              <text x={30} y={224} textAnchor="end">0</text>
              <text x={40} y={240}>W31</text>
              <text x={205} y={240}>W35</text>
              <text x={bx(8)} y={240} textAnchor="middle" style={{ fill: "var(--ap-text)" }}>
                W39 now
              </text>
              <text x={520} y={240}>W46</text>
            </g>
          </svg>
          <div className="flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
            <Legend swatch="var(--ap-teal)">Precipitation</Legend>
            <Legend swatch="#EE8434">Crop ET (ETc)</Legend>
            <Legend line="var(--ap-text)">Soil water storage</Legend>
          </div>
        </Blueprint>

        <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-heading text-lg font-semibold">Evapotranspiration</span>
            <span className="font-mono text-[10.5px] text-muted">
              FAO-56 PENMAN&ndash;MONTEITH &middot; MM/DAY
            </span>
          </div>
          <svg viewBox="0 0 560 250" className="block w-full">
            <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
              <path d="M36 20H552M36 70H552M36 120H552M36 170H552M36 220H552" />
            </g>
            <path d={`${linePath(et0)}L${ex(59)} 220L36 220Z`} fill="#EE8434" fillOpacity={0.08} />
            <path d={linePath(et0)} fill="none" stroke="#EE8434" strokeWidth={1.75} />
            <path d={linePath(etc)} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={1.75} />
            <line
              x1={ex(30)}
              y1={20}
              x2={ex(30)}
              y2={220}
              style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }}
              strokeDasharray="3 3"
            />
            <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
              <text x={30} y={24} textAnchor="end">8</text>
              <text x={30} y={124} textAnchor="end">4</text>
              <text x={30} y={224} textAnchor="end">0</text>
              <text x={40} y={240}>24 Aug</text>
              <text x={ex(30)} y={240} textAnchor="middle" style={{ fill: "var(--ap-text)" }}>
                23 Sep
              </text>
              <text x={505} y={240}>23 Oct</text>
            </g>
          </svg>
          <div className="flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
            <Legend line="#EE8434">ET&#8320; reference &middot; 5.1 today</Legend>
            <Legend line="var(--ap-accent)">ETc olive (Kc 0.65) &middot; 3.3</Legend>
          </div>
        </Blueprint>
      </div>
    </div>
  );
}

function Legend({ swatch, line, children }: { swatch?: string; line?: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch && <span className="size-2" style={{ background: swatch }} />}
      {line && <span className="h-0.5 w-3.5" style={{ background: line }} />}
      {children}
    </span>
  );
}
