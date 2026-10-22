"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Lang } from "@/lib/farmer-data";

/**
 * A carousel of farming practices for the farmer home screen: agroforestry,
 * hydroponics and permaculture, each with a short plain-language explanation.
 */

type Slide = {
  src: string;
  tag: Record<Lang, string>;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  points: Record<Lang, string[]>;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    src: "/dashboard-images/agroforesterie.jpg",
    accent: "#38A88A",
    tag: { fr: "Agroforesterie", en: "Agroforestry" },
    title: {
      fr: "Des arbres et des cultures sur la même parcelle",
      en: "Trees and crops on the same field",
    },
    body: {
      fr: "Planter des rangées d’arbres entre les cultures protège le sol du vent et du soleil, garde l’humidité plus longtemps et apporte un second revenu (bois, fruits, fourrage).",
      en: "Rows of trees between crops shield the soil from wind and sun, keep moisture in for longer and bring a second income from wood, fruit or fodder.",
    },
    points: {
      fr: ["Moins d’évaporation", "Sol plus fertile", "Revenus diversifiés"],
      en: ["Less evaporation", "Richer soil", "More than one income"],
    },
  },
  {
    src: "/dashboard-images/Gemini_Generated_Image_pd263gpd263gpd26.jpg",
    accent: "#2F8FB5",
    tag: { fr: "Hydroponie", en: "Hydroponics" },
    title: {
      fr: "Cultiver sans sol, avec très peu d’eau",
      en: "Growing without soil, on very little water",
    },
    body: {
      fr: "Les racines baignent dans une eau enrichie en nutriments qui circule en circuit fermé. On économise jusqu’à 90 % d’eau et on récolte toute l’année, même quand la pluie manque.",
      en: "Roots sit in nutrient-rich water that circulates in a closed loop. It uses up to 90% less water and harvests all year round, even when the rain fails.",
    },
    points: {
      fr: ["Jusqu’à 90 % d’eau en moins", "Récoltes toute l’année", "Pas de sol épuisé"],
      en: ["Up to 90% less water", "Year-round harvests", "No worn-out soil"],
    },
  },
  {
    src: "/dashboard-images/Gemini_Generated_Image_oux5zyoux5zyoux5.jpg",
    accent: "#B7860B",
    tag: { fr: "Permaculture", en: "Permaculture" },
    title: {
      fr: "Une ferme pensée comme un écosystème",
      en: "A farm designed like an ecosystem",
    },
    body: {
      fr: "Potagers, verger, mare, poules et compost travaillent ensemble : chaque élément nourrit l’autre. La mare stocke l’eau de pluie, le compost remplace les engrais.",
      en: "Vegetable beds, orchard, pond, hens and compost all work together, each feeding the next. The pond stores rainwater and compost replaces fertiliser.",
    },
    points: {
      fr: ["Eau de pluie récupérée", "Compost maison", "Biodiversité"],
      en: ["Rainwater harvested", "Home-made compost", "Biodiversity"],
    },
  },
  {
    src: "/dashboard-images/e4c57a54-2d0a-458e-90e9-c7ae8694af2f.jpg",
    accent: "#D9621A",
    tag: { fr: "Permaculture", en: "Permaculture" },
    title: {
      fr: "Paillage et cultures associées",
      en: "Mulch and companion planting",
    },
    body: {
      fr: "Couvrir le sol de paille garde la fraîcheur et limite les mauvaises herbes. Associer courges, choux, tomates et fleurs attire les pollinisateurs et éloigne les ravageurs.",
      en: "Covering the soil with straw keeps it cool and holds weeds back. Mixing squash, cabbage, tomatoes and flowers draws in pollinators and keeps pests away.",
    },
    points: {
      fr: ["Sol couvert, sol humide", "Moins de désherbage", "Moins de ravageurs"],
      en: ["Covered soil stays moist", "Less weeding", "Fewer pests"],
    },
  },
];

const INTERVAL = 7000;

export function PracticeCarousel({ lang }: { lang: Lang }) {
  const [[index, dir], setState] = React.useState<[number, number]>([0, 1]);
  const [playing, setPlaying] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const slide = SLIDES[index];
  const running = playing && !hovered;

  const go = React.useCallback((step: number) => {
    setState(([i]) => [(i + step + SLIDES.length) % SLIDES.length, step]);
  }, []);

  const jump = (to: number) => setState(([i]) => [to, to >= i ? 1 : -1]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => go(1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [running, index, go]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={lang === "fr" ? "Pratiques agricoles durables" : "Sustainable farming practices"}
      className="flex flex-col gap-3 lg:self-stretch"
      onKeyDown={onKey}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-muted">
          {lang === "fr" ? "Pratiques à découvrir" : "Practices to explore"}
        </span>
        <span className="font-mono text-[12px] text-muted">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>

      <div
        className="relative isolate h-[clamp(320px,44vh,400px)] overflow-hidden lg:h-auto lg:min-h-[400px] lg:flex-1 rounded-panel border border-panel-border bg-black shadow-panel"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        tabIndex={0}
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            className="absolute inset-0"
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 60 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -60 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${SLIDES.length}: ${slide.tag[lang]}`}
          >
            {/* Slow zoom gives the still photos a little life. */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: INTERVAL / 1000 + 1, ease: "linear" }}
            >
              <Image
                src={slide.src}
                alt={slide.title[lang]}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="pointer-events-none select-none object-cover"
                draggable={false}
              />
            </motion.div>
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.85)_0%,rgb(0_0_0/0.45)_40%,rgb(0_0_0/0)_70%)]" />

            <div className="absolute inset-x-0 bottom-0 flex max-w-2xl flex-col gap-2.5 p-5 pb-14 text-white sm:p-7 sm:pb-16">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ background: slide.accent }}
              >
                {slide.tag[lang]}
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="m-0 font-heading text-[clamp(22px,3vw,32px)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance"
              >
                {slide.title[lang]}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="m-0 line-clamp-3 max-w-xl text-[14px] leading-[1.5] text-white/85 text-pretty sm:text-[15px]"
              >
                {slide.body[lang]}
              </motion.p>
              <motion.ul
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="m-0 flex list-none flex-wrap gap-2 p-0"
              >
                {slide.points[lang].map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12px] backdrop-blur-md"
                  >
                    <span className="size-1.5 rounded-full" style={{ background: slide.accent }} />
                    {p}
                  </li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 px-5 pb-4 sm:px-7 sm:pb-5">
          <div className="flex flex-1 gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                onClick={() => jump(i)}
                aria-label={`${i + 1}: ${s.tag[lang]}`}
                aria-current={i === index}
                className="group relative h-6 flex-1"
              >
                <span className="absolute inset-x-0 top-1/2 h-0.75 -translate-y-1/2 overflow-hidden rounded-full bg-white/30 transition-colors group-hover:bg-white/50">
                  {i < index && <span className="absolute inset-0 bg-white" />}
                  {i === index && (
                    <motion.span
                      key={`${index}-${running}`}
                      className="absolute inset-y-0 left-0 bg-white"
                      initial={{ width: running ? "0%" : "100%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: running ? INTERVAL / 1000 : 0, ease: "linear" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? (lang === "fr" ? "Pause" : "Pause") : lang === "fr" ? "Lecture" : "Play"}
            className="grid size-9 place-items-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => go(-1)}
            aria-label={lang === "fr" ? "Précédent" : "Previous"}
            className="grid size-9 place-items-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label={lang === "fr" ? "Suivant" : "Next"}
            className="grid size-9 place-items-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
