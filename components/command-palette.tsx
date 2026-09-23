"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "@/components/icon";
import { Corners } from "@/components/ui/primitives";
import { COUNTRIES, NAV, type PageId } from "@/lib/data";
import { useConsole } from "@/components/app-context";

interface Cmd {
  label: string;
  icon: IconName;
  hint: string;
  run: () => void;
}

/**
 * ⌘K palette. Radix Dialog handles focus trapping and restore; the list is
 * keyboard-driven with a highlighted row that Enter activates, so the mouse
 * is never required. The panel body is its own component that mounts on
 * open, which is what resets the query — no effect needed.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-[var(--ap-scrim)] backdrop-blur-[3px]"
              />
            </Dialog.Overlay>
            <PalettePanel onClose={() => onOpenChange(false)} />
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function PalettePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { setSite } = useConsole();
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  const go = React.useCallback(
    (p: PageId) => {
      router.push(`/app/${p}`);
      onClose();
    },
    [router, onClose],
  );

  const groups = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const m = (t: string) => !term || t.toLowerCase().includes(term);

    const pages: Cmd[] = [];
    for (const g of NAV) {
      for (const it of g.items) {
        if (m(it.en)) pages.push({ label: it.en, icon: it.icon, hint: g.key, run: () => go(it.id) });
      }
    }

    const sites: Cmd[] = [];
    for (const c of COUNTRIES) {
      for (const s of c.sites) {
        if (m(s.name) || m(c.name)) {
          sites.push({
            label: s.name,
            icon: "pin",
            hint: c.name,
            run: () => {
              setSite(c.cc, s.name);
              onClose();
            },
          });
        }
      }
    }

    const crops: Cmd[] = ["Durum wheat", "Barley", "Olive", "Date palm", "Alfalfa", "Tomato"]
      .filter(m)
      .map((c) => ({
        label: `Planting window — ${c}`,
        icon: "sprout" as IconName,
        hint: "CROP",
        run: () => go("planting"),
      }));

    const actions: Cmd[] = (
      [
        ["Upload CSV / XLSX", "upload", "DATA", "upload"],
        ["Register new sensor", "plus", "SENSORS", "sensors"],
        ["Export historical report", "download", "HISTORY", "history"],
      ] as const
    )
      .filter((a) => m(a[0]))
      .map(([label, icon, hint, page]) => ({
        label,
        icon: icon as IconName,
        hint,
        run: () => go(page as PageId),
      }));

    return [
      { label: "PAGES", items: pages.slice(0, term ? 8 : 5) },
      { label: "SITES", items: sites.slice(0, term ? 6 : 3) },
      { label: "CROPS", items: crops.slice(0, term ? 6 : 2) },
      { label: "ACTIONS", items: actions },
    ].filter((g) => g.items.length);
  }, [q, go, setSite, onClose]);

  const flat = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // Clamp during render rather than correcting in an effect: the list can
  // shrink under the cursor as the query narrows.
  const active = flat.length ? Math.min(cursor, flat.length - 1) : 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((active + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((active - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[active]?.run();
    }
  }

  let index = -1;

  return (
    <Dialog.Content asChild onKeyDown={onKeyDown}>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.99 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className="blueprint fixed left-1/2 top-[110px] z-50 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 border-divider-strong bg-s2 shadow-pop"
      >
        <Corners />
        <VisuallyHidden>
          <Dialog.Title>Command palette</Dialog.Title>
        </VisuallyHidden>

        <div className="flex h-[52px] items-center gap-2.5 border-b border-divider px-4">
          <span className="text-muted">
            <Icon name="search" size={16} />
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            placeholder="Search pages, sites, crops, sensors&hellip;"
            aria-label="Search"
            className="flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <span className="border border-divider px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</span>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-2.5 pb-1 pt-2 font-mono text-[10px] tracking-[0.1em] text-faint">{g.label}</div>
              {g.items.map((it) => {
                index += 1;
                const i = index;
                return (
                  <button
                    key={`${g.label}-${it.label}`}
                    onClick={it.run}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex h-9 w-full items-center gap-2.5 px-2.5 text-left text-[13.5px] transition-colors duration-100 ${
                      active === i ? "bg-s3" : ""
                    }`}
                  >
                    <span className="text-muted">
                      <Icon name={it.icon} size={15} />
                    </span>
                    <span className="flex-1 truncate">{it.label}</span>
                    <span className="font-mono text-[10.5px] text-muted">{it.hint}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {!flat.length && (
            <div className="p-7 text-center text-[13px] text-muted">No results for &ldquo;{q}&rdquo;</div>
          )}
        </div>

        <div className="flex gap-4 border-t border-divider px-4 py-2.5 font-mono text-[10.5px] text-muted">
          <span>&crarr; open</span>
          <span>&uarr;&darr; navigate</span>
          <span className="ml-auto">APWRS command</span>
        </div>
      </motion.div>
    </Dialog.Content>
  );
}
