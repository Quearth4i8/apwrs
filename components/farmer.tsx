"use client";

import * as React from "react";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { FarmerContent } from "@/components/farmer-content";
import { ThemeScope } from "@/components/theme-provider";
import { FARMER_TABS, type FarmerTab } from "@/lib/data";
import { FARMER_TEXT, type Lang } from "@/lib/farmer-data";

/**
 * The standalone phone/tablet build of the farmer app (Farmer.dc.html run on
 * its own): its own light palette, a compact header and a bottom tab bar.
 * The signed-in farmer experience lives in the console shell instead — see
 * app/farm — and embeds <FarmerContent /> directly.
 */
export function FarmerApp() {
  const [lang, setLang] = React.useState<Lang>("en");
  const [tab, setTab] = React.useState<FarmerTab>("today");
  const t = FARMER_TEXT[lang];

  return (
    <ThemeScope theme="light" surface="farmer" className="flex min-h-dvh justify-center bg-s3 text-ink">
      <div className="relative flex w-full max-w-[1120px] flex-col border-x border-divider bg-bg">
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-4 py-3 backdrop-blur-lg">
          <Brand size={30} />
          <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
            <span className="truncate text-base font-semibold">{t.hello}, H&eacute;di</span>
            <span className="flex items-center gap-1 truncate text-[13px] text-muted">
              <Icon name="pin" size={13} />
              Ichkeul &middot; {t.date}
            </span>
          </div>
          <div className="flex h-11 flex-none border border-divider">
            {(["en", "fr"] as const).map((l, i) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className="grid w-11 place-items-center font-mono text-xs transition-colors"
                style={{
                  borderLeft: i ? "1px solid var(--ap-divider)" : undefined,
                  background: lang === l ? "var(--ap-text)" : "transparent",
                  color: lang === l ? "var(--ap-bg)" : "var(--ap-muted)",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1">
          <FarmerContent
            tab={tab}
            lang={lang}
            className="grid content-start items-start gap-5 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-2 lg:gap-7 lg:px-10"
          />
        </main>

        <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-divider bg-surface pb-2.5">
          {FARMER_TABS.map((b, i) => {
            const on = tab === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setTab(b.id)}
                aria-current={on ? "page" : undefined}
                className="relative flex h-16 flex-col items-center justify-center gap-1.25 text-[13px] transition-colors"
                style={{
                  color: on ? "var(--ap-accent-700)" : "var(--ap-muted)",
                  fontWeight: on ? 700 : 500,
                  boxShadow: `inset 0 3px 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                }}
              >
                <Icon name={b.icon} size={22} />
                {t.tabs[i]}
                {b.id === "alerts" && (
                  <span className="absolute left-[calc(50%+8px)] top-2.5 grid h-4.5 min-w-4.5 place-items-center bg-[#D96565] px-1 font-mono text-[11px] text-white">
                    2
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </ThemeScope>
  );
}
