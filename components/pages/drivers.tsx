"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, PageHeader, Segmented } from "@/components/ui/primitives";
import { DRIVERS } from "@/lib/data";

const MAX_SHARE = 45;

export function PageDrivers() {
  const { site } = useConsole();
  const [h, setH] = React.useState<"0" | "1" | "2">("0");
  const [sel, setSel] = React.useState(0);

  const hi = Number(h) as 0 | 1 | 2;
  const chosen = DRIVERS[sel];

  /* Stacked weekly contributions over the last 12 weeks. */
  const stacks = React.useMemo(() => {
    const out: { x: number; y: number; h: number; c: string; o: number }[] = [];
    for (let w = 0; w < 12; w++) {
      let y = 160;
      const tot = 20 + w * 3.2;
      DRIVERS.forEach((d, i) => {
        const share = [0.24 + w * 0.012, 0.26 - w * 0.002, 0.2, 0.16 - w * 0.004, 0.14 - w * 0.006][i];
        const bh = tot * share * 1.3;
        y -= bh;
        out.push({ x: 10 + w * 34, y, h: bh - 1, c: d.sc, o: sel === i ? 1 : 0.45 });
      });
    }
    return out;
  }, [sel]);

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; RISK DRIVERS &middot; {site.cc} / {site.name}
          </>
        }
        title="What is driving risk"
        lede={
          <>
            SHAP contribution of each factor to today&rsquo;s composite score of{" "}
            <span className="font-mono text-severe">58</span>. Contributions sum to 100%.
          </>
        }
        actions={
          <Segmented
            value={h}
            onChange={setH}
            options={[
              { value: "0", label: "Today" },
              { value: "1", label: "+7 d" },
              { value: "2", label: "+30 d" },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Blueprint className="flex flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_60px] gap-4 border-b border-divider px-5 py-3 font-mono text-[10px] tracking-[0.1em] text-muted sm:grid-cols-[230px_minmax(0,1fr)_60px]">
            <span>DRIVER</span>
            <span className="hidden sm:block">CONTRIBUTION</span>
            <span className="text-right">SHARE</span>
          </div>

          {DRIVERS.map((d, i) => {
            const on = sel === i;
            const v = d.base[hi];
            return (
              <button
                key={d.n}
                onClick={() => setSel(i)}
                aria-pressed={on}
                className="grid grid-cols-[minmax(0,1fr)_60px] items-center gap-4 border-b border-divider px-5 py-4.5 text-left transition-colors duration-150 hover:bg-neutral-100 sm:grid-cols-[230px_minmax(0,1fr)_60px]"
                style={{
                  background: on ? "var(--ap-neutral-100)" : "transparent",
                  boxShadow: `inset 2px 0 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                }}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 flex" style={{ color: d.c }}>
                    <Icon name={d.icon} size={16} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{d.n}</span>
                    <span className="font-mono text-[11px] text-muted">{d.m}</span>
                  </span>
                </span>
                <span className="relative hidden h-3.5 bg-neutral-100 sm:block">
                  <motion.span
                    className="absolute inset-y-0 left-0"
                    animate={{ width: `${(v / MAX_SHARE) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ background: d.c }}
                  />
                </span>
                <span className="text-right font-heading text-2xl font-semibold tabular-nums">{v}%</span>
              </button>
            );
          })}

          <div className="flex items-center gap-2 px-5 py-3.5 text-[12.5px] text-muted">
            <Icon name="info" size={14} />
            Colour reflects each driver&rsquo;s own severity on the shared risk scale, not its share.
          </div>
        </Blueprint>

        <div className="flex flex-col gap-6">
          <Blueprint className="flex flex-col gap-3.5 p-5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
              SELECTED &middot; {chosen.n.toUpperCase()}
            </span>
            <div className="grid grid-cols-2 border-l border-t border-divider">
              {chosen.facts.map(([k, v]) => (
                <div key={k} className="border-b border-r border-divider px-3 py-2.5">
                  <div className="font-mono text-[10px] text-muted">{k}</div>
                  <div className="font-mono text-[15px]">{v}</div>
                </div>
              ))}
            </div>
            <div className="text-[13.5px] leading-[1.55]">{chosen.why}</div>
          </Blueprint>

          <Blueprint className="flex flex-col gap-2.5 px-5 py-4.5">
            <div className="flex justify-between">
              <span className="font-heading text-[17px] font-semibold">Drivers over time</span>
              <span className="font-mono text-[10.5px] text-muted">LAST 12 WEEKS</span>
            </div>
            <svg viewBox="0 0 420 180" className="block w-full">
              {stacks.map((s, i) => (
                <rect key={i} x={s.x} y={s.y} width={24} height={s.h} fill={s.c} fillOpacity={s.o} />
              ))}
              <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9}>
                <text x={10} y={176}>W28</text>
                <text x={190} y={176}>W33</text>
                <text x={380} y={176}>W39</text>
              </g>
            </svg>
            <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted">
              {DRIVERS.map((d) => (
                <span key={d.short} className="flex items-center gap-1.5">
                  <span className="size-2" style={{ background: d.sc }} />
                  {d.short}
                </span>
              ))}
            </div>
          </Blueprint>
        </div>
      </div>
    </div>
  );
}
