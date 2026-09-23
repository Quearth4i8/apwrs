"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon, type IconName } from "@/components/icon";
import { Blueprint, ButtonLink, Corners } from "@/components/ui/primitives";
import {
  CROP_DOT,
  FARMER_ALERTS,
  FARMER_CROPS,
  FARMER_FAQ,
  FARMER_FIELDS,
  FARMER_FIELDS_FR_PLANTS,
  FARMER_TEXT,
  FARMER_WEEK,
  VERDICT,
  type Lang,
} from "@/lib/farmer-data";
import type { FarmerTab } from "@/lib/data";

/**
 * The farmer screens themselves, with no chrome of their own — the console
 * shell supplies the sidebar and header, and the standalone phone build
 * supplies its own header and bottom tab bar. Colour comes from whatever
 * theme the host sets, so this renders correctly dark or light.
 *
 * Everything is still sized for a phone held outdoors: 44px+ targets, high
 * contrast, no jargon, and a read-aloud button because not every user reads
 * comfortably.
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
  const [cropId, setCropId] = React.useState("wheat");
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  const [sms, setSms] = React.useState(true);
  const [speaking, setSpeaking] = React.useState(false);

  const t = FARMER_TEXT[lang];
  const crop = FARMER_CROPS.find((c) => c.id === cropId) ?? FARMER_CROPS[0];
  const v = VERDICT[crop.k];

  React.useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak() {
    if (!window.speechSynthesis) return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(
      `${crop[lang]}. ${v[lang][1]}. ${crop.why[lang]} ${t.bestTime}: ${crop.when[lang]}.`,
    );
    u.lang = lang === "fr" ? "fr-FR" : "en-GB";
    u.onend = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setSpeaking(true);
  }

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
              {FARMER_CROPS.map((c) => {
                const on = c.id === cropId;
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
                    <span className="size-2.5" style={{ background: CROP_DOT[c.k] }} />
                    {c[lang]}
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
            <Blueprint className="flex h-full flex-col gap-4 px-5 py-5.5" style={{ background: v.bg, borderColor: v.bd }}>
              <div className="flex items-center gap-3.5">
                <span className="grid size-15 flex-none place-items-center text-white" style={{ background: v.c }}>
                  <Icon name={v.icon} size={30} strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: v.ink }}>
                    {v[lang][0]}
                  </span>
                  <span className="font-heading text-[clamp(26px,5vw,32px)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance">
                    {v[lang][1]}
                  </span>
                </div>
              </div>

              <p className="m-0 text-[17px] leading-[1.5] text-pretty">{crop.why[lang]}</p>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-divider bg-surface px-4 py-3.5">
                <div className="flex flex-col gap-0.75">
                  <span className="whitespace-nowrap text-[13px] text-muted">{t.bestTime}</span>
                  <span className="font-heading text-[26px] font-semibold leading-none">{crop.when[lang]}</span>
                </div>
                <div className="flex flex-col items-end gap-0.75">
                  <span className="font-heading text-[30px] font-semibold leading-none" style={{ color: v.ink }}>
                    {crop.days ? crop.days : "✓"}
                  </span>
                  <span className="whitespace-nowrap text-[13px] text-muted">{crop.days ? t.daysTo : t.now}</span>
                </div>
              </div>

              <button
                onClick={speak}
                className="flex h-13 items-center justify-center gap-2.5 border border-divider-strong bg-surface text-base font-medium transition-colors hover:border-ink"
              >
                <Icon name="volume" size={20} />
                {speaking ? t.stop : t.listen}
              </button>
            </Blueprint>
          </motion.div>

          {/* To-do */}
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-semibold text-muted">{t.todo}</span>
            {crop.todo.map((d, i) => {
              const k = crop.id + i;
              const isDone = !!done[k];
              return (
                <button
                  key={k}
                  onClick={() => setDone((s) => ({ ...s, [k]: !isDone }))}
                  aria-pressed={isDone}
                  className="flex min-h-15 items-center gap-3.5 border border-divider bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-divider-strong"
                >
                  <span
                    className="grid size-6.5 flex-none place-items-center border-[1.5px] text-white"
                    style={{
                      borderColor: isDone ? "var(--ap-accent)" : "var(--ap-divider-strong)",
                      background: isDone ? "var(--ap-accent)" : "transparent",
                    }}
                  >
                    {isDone && <Icon name="check" size={16} strokeWidth={2.5} />}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span
                      className="text-base font-medium"
                      style={{
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--ap-muted)" : "var(--ap-text)",
                      }}
                    >
                      {lang === "fr" ? d[1] : d[0]}
                    </span>
                    <span className="text-[13.5px] text-muted">{lang === "fr" ? d[3] : d[2]}</span>
                  </span>
                  <span className="text-teal">
                    <Icon name={d[4]} size={20} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dryness */}
          <Blueprint className="flex flex-col gap-3.5 bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-semibold">{t.dryness}</span>
              <span className="text-[13px] text-muted">{t.dryWhere}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {t.lv.map((l, i) => {
                const here = i === 2;
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
                      style={{ fontWeight: here ? 700 : 400, color: here ? "var(--ap-text)" : "var(--ap-muted)" }}
                    >
                      {l}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="m-0 text-[15px] leading-[1.5] text-muted">{t.dryText}</p>
          </Blueprint>

          {/* Week */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-muted">{t.weather}</span>
              <span className="text-[13px] text-muted">{t.rainWeek}</span>
            </div>
            <div className="grid grid-cols-7 border border-divider bg-surface">
              {FARMER_WEEK.map(([i, icon, temp, rain]) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 border-r border-divider px-0.5 py-3 last:border-r-0"
                  style={{ background: i === 0 ? "var(--ap-neutral-100)" : "transparent" }}
                >
                  <span className="text-[13px]" style={{ fontWeight: i === 0 ? 700 : 500 }}>
                    {t.days[i]}
                  </span>
                  <span style={{ color: icon === "rain" ? "var(--ap-teal)" : "#D9A20B" }}>
                    <Icon name={icon} size={22} />
                  </span>
                  <span className="text-[15px] font-semibold">{temp}&deg;</span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: rain === "0" ? "var(--ap-faint)" : "var(--ap-teal)" }}
                  >
                    {rain} mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "fields" && (
        <>
          <h1 className="font-heading text-[30px] font-semibold leading-none lg:col-span-2">{t.fields}</h1>
          {FARMER_FIELDS.map(([en, fr, cid, size, soilEn, soilFr], i) => {
            const c = FARMER_CROPS.find((x) => x.id === cid) ?? FARMER_CROPS[0];
            const kk = VERDICT[c.k];
            return (
              <Blueprint key={en} className="flex flex-col gap-3 bg-surface p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-lg font-semibold">{lang === "fr" ? fr : en}</span>
                    <span className="text-sm text-muted">
                      {c[lang]} &middot; {size}
                      {cid === "olive" ? (lang === "fr" ? " arbres" : " trees") : ""}
                    </span>
                  </div>
                  <span
                    className="flex h-7.5 items-center gap-1.5 px-2.5 text-[13.5px] font-semibold"
                    style={{ background: kk.bg, color: kk.ink }}
                  >
                    <span className="size-2" style={{ background: kk.c }} />
                    {kk[lang][0]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-divider pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-teal">
                      <Icon name="droplet" size={18} />
                    </span>
                    {lang === "fr" ? soilFr : soilEn}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-accent">
                      <Icon name="leaf" size={18} />
                    </span>
                    {lang === "fr" ? FARMER_FIELDS_FR_PLANTS[i] : FARMER_FIELDS[i][6]}
                  </div>
                </div>
              </Blueprint>
            );
          })}
        </>
      )}

      {tab === "alerts" && (
        <>
          <h1 className="font-heading text-[30px] font-semibold leading-none lg:col-span-2">{t.alerts}</h1>
          {FARMER_ALERTS[lang].map((a) => (
            <div key={a[5]} className="flex gap-3.5 p-4" style={{ border: `1px solid ${a[4]}`, background: a[3] }}>
              <span className="grid size-10 flex-none place-items-center text-white" style={{ background: a[2] }}>
                <Icon name={a[1] as IconName} size={20} strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-muted">{a[0]}</span>
                <span className="text-[17px] font-semibold leading-[1.3]">{a[5]}</span>
                <span className="text-[15px] leading-[1.5] text-muted">{a[6]}</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => setSms((x) => !x)}
            role="switch"
            aria-checked={sms}
            className="flex min-h-16 items-center gap-3.5 border border-divider bg-surface px-4 py-3 text-left"
          >
            <span className="text-accent">
              <Icon name="message" size={22} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-base font-medium">{t.sms}</span>
              <span className="text-[13.5px] text-muted">+216 &bull;&bull; &bull;&bull;&bull; 482</span>
            </span>
            <span
              className="relative h-7 w-12 flex-none border transition-colors"
              style={{
                borderColor: sms ? "var(--ap-accent)" : "var(--ap-divider-strong)",
                background: sms ? "var(--ap-accent)" : "transparent",
              }}
            >
              <span
                className="absolute top-0.75 size-5 transition-[left] duration-150"
                style={{ left: sms ? 24 : 3, background: sms ? "#fff" : "var(--ap-muted)" }}
              />
            </span>
          </button>
        </>
      )}

      {tab === "help" && (
        <>
          <h1 className="font-heading text-[30px] font-semibold leading-none lg:col-span-2">{t.help}</h1>
          <Blueprint className="flex flex-col gap-3.5 bg-surface p-4.5">
            <div className="flex items-center gap-3.5">
              <span className="grid size-13 place-items-center border border-divider bg-s3 font-mono text-sm">SB</span>
              <div className="flex flex-col">
                <span className="text-[17px] font-semibold">Sana Ben Amor</span>
                <span className="text-sm text-muted">{t.advisor} &middot; CRDA Bizerte</span>
              </div>
            </div>
            <a
              href="tel:+21672000000"
              className="relative flex h-13 items-center justify-center gap-2 border border-accent bg-accent font-heading text-base font-semibold text-bg no-underline transition-colors hover:bg-accent-600"
            >
              <Corners />
              <Icon name="phone" size={18} />
              {t.call}
            </a>
            <ButtonLink href="#" size="lg" className="h-13 text-base">
              <Icon name="message" size={18} />
              {t.msg}
            </ButtonLink>
          </Blueprint>
          <div className="flex flex-col border-t border-divider">
            {FARMER_FAQ[lang].map(([q, a]) => (
              <div key={q} className="flex flex-col gap-1.5 border-b border-divider py-4">
                <span className="text-base font-semibold">{q}</span>
                <span className="text-[15px] leading-[1.5] text-muted">{a}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
