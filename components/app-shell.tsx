"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { CommandPalette } from "@/components/command-palette";
import { useConsole } from "@/components/app-context";
import { useMounted, useTheme } from "@/components/theme-provider";
import { Menu, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Panel, PanelRow } from "@/components/ui/dropdown";
import { COUNTRIES, FARM_NAV, IDENTITY, NAV, SEASONS } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * The console frame: a collapsing sidebar, a header of scoped controls
 * (site, season, search, language, theme, account) and the routed page.
 * Navigation is real routing, so every page is linkable and the back button
 * works — the prototype switched a state variable instead.
 *
 * One shell serves both roles (App.dc.html's `role` prop). The farmer gets a
 * single "MY FARM" group and loses the controls that only make sense to an
 * analyst: the season selector and the ⌘K palette.
 */
export function AppShell({
  children,
  role = "expert",
}: {
  children: React.ReactNode;
  role?: "expert" | "farmer";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { site, setSite, season, setSeason, lang, setLang, sidebarCollapsed, toggleSidebar } = useConsole();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [browse, setBrowse] = React.useState(site.cc);

  const isFarmer = role === "farmer";
  const groups = isFarmer ? [FARM_NAV] : NAV;
  const base = isFarmer ? "/farm" : "/app";
  const user = IDENTITY[role];
  const current = pathname.split("/")[2] ?? (isFarmer ? "today" : "overview");
  const fr = lang === "fr";

  React.useEffect(() => {
    if (isFarmer) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFarmer]);

  let crumbGroup = "";
  let crumbPage = "";
  for (const g of groups) {
    for (const it of g.items) {
      if (it.id === current) {
        crumbGroup = fr ? g.fr : g.key;
        crumbPage = fr ? it.fr : it.en;
      }
    }
  }

  const browseCountry = COUNTRIES.find((c) => c.cc === browse) ?? COUNTRIES[0];
  const expanded = !sidebarCollapsed;

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-2.5 pb-4">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-px">
          {expanded ? (
            <div className="px-2 py-1.5 font-mono text-[10px] tracking-[0.12em] text-faint">
              {fr ? g.fr : g.key}
            </div>
          ) : (
            <div className="mx-1.5 mb-2 mt-1.5 h-px bg-divider" />
          )}
          {g.items.map((it) => {
            const active = current === it.id;
            return (
              <Link
                key={it.id}
                href={`${base}/${it.id}`}
                title={fr ? it.fr : it.en}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-8 items-center gap-2.5 border px-2.5 transition-colors duration-150",
                  active
                    ? "border-[color-mix(in_srgb,var(--ap-accent)_30%,transparent)] bg-accent-100 text-ink"
                    : "border-transparent text-muted hover:border-divider hover:text-ink",
                )}
              >
                {active && <span className="absolute -inset-y-px -left-px w-0.5 bg-accent" />}
                <span className={active ? "text-accent" : undefined}>
                  <Icon name={it.icon} size={16} />
                </span>
                {expanded && (
                  <span className="flex-1 whitespace-nowrap text-[13.5px] font-medium">
                    {fr ? it.fr : it.en}
                  </span>
                )}
                {it.id === "alerts" && expanded && (
                  <span className="bg-[#D96565] px-1.5 py-px font-mono text-[10px] text-white">
                    {isFarmer ? 2 : 7}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside
        className="hidden flex-none flex-col border-r border-divider bg-surface transition-[width] duration-200 ease-out lg:flex"
        style={{ width: expanded ? 248 : 64 }}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-divider px-4">
          <Brand />
          {expanded && (
            <div className="flex flex-col leading-none">
              <span className="font-heading text-xl font-semibold tracking-[0.02em]">APWRS</span>
              <span className="mt-[3px] font-mono text-[9px] tracking-[0.1em] text-muted">
                {isFarmer ? "MY FARM" : "PLANTING · DROUGHT"}
              </span>
            </div>
          )}
        </div>

        {sidebar}

        <div className="flex flex-col gap-2 border-t border-divider p-2.5">
          {expanded && (
            <div className="flex flex-col gap-1 border border-divider px-2.5 py-2 font-mono text-[10.5px] text-muted">
              <div className="flex items-center gap-1.5 text-ink">
                <span className="size-1.5 bg-accent" />
                MODEL v2.4.1 &middot; ONLINE
              </div>
              <div>Last run 23 Sep 06:00 UTC</div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="flex h-8 items-center gap-2.5 px-2.5 text-muted transition-colors hover:text-ink"
          >
            <Icon name="panel" size={16} />
            {expanded && <span className="text-[13px]">{fr ? "Réduire le menu" : "Collapse sidebar"}</span>}
          </button>
        </div>
      </aside>

      {/* ── Sidebar (mobile drawer) ───────────────────────────────────── */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-[var(--ap-scrim)] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-divider bg-surface lg:hidden"
            >
              <div className="flex h-14 items-center gap-2.5 border-b border-divider px-4">
                <Brand />
                <span className="font-heading text-xl font-semibold tracking-[0.02em]">APWRS</span>
                <button
                  onClick={() => setMobileNav(false)}
                  aria-label="Close navigation"
                  className="ml-auto text-muted hover:text-ink"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="contents" onClick={() => setMobileNav(false)}>
                {sidebar}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex h-14 flex-none items-center gap-2.5 border-b border-divider bg-bg px-3 sm:px-5">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            className="text-muted hover:text-ink lg:hidden"
          >
            <Icon name="menu" size={18} />
          </button>

          <div className="hidden min-w-0 items-center gap-2 whitespace-nowrap font-mono text-[11.5px] tracking-[0.04em] text-muted xl:flex">
            <span>{crumbGroup}</span>
            <span className="text-faint">/</span>
            <span className="text-ink">{crumbPage}</span>
          </div>
          <div className="mx-2 hidden h-[22px] w-px bg-divider xl:block" />

          {/* Site picker — two panes, country then site. */}
          <Panel
            align="start"
            className="w-[min(460px,calc(100vw-24px))]"
            trigger={
              <MenuTrigger onClick={() => setBrowse(site.cc)}>
                <Icon name="pin" size={14} />
                <span className="font-mono text-[11px] text-muted">{site.cc}</span>
                <span className="text-faint">/</span>
                <span className="font-medium">{site.name}</span>
                <Icon name="down" size={14} />
              </MenuTrigger>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
              <div className="border-b border-divider p-2 sm:border-b-0 sm:border-r">
                <div className="px-2 py-1.5 font-mono text-[10px] tracking-[0.1em] text-faint">COUNTRY</div>
                {COUNTRIES.map((c) => (
                  <PanelRow key={c.cc} selected={c.cc === browse} onClick={() => setBrowse(c.cc)} className="h-8">
                    <span className="flex items-center gap-2">
                      <span className="w-[18px] font-mono text-[10.5px] text-muted">{c.cc}</span>
                      {c.name}
                    </span>
                    <span className="ml-auto">
                      <Icon name="right" size={13} />
                    </span>
                  </PanelRow>
                ))}
              </div>
              <div className="p-2">
                <div className="px-2 py-1.5 font-mono text-[10px] tracking-[0.1em] text-faint">
                  SITE &middot; {browseCountry.name.toUpperCase()}
                </div>
                {browseCountry.sites.map((s) => {
                  const on = site.cc === browseCountry.cc && site.name === s.name;
                  return (
                    <PanelRow
                      key={s.name}
                      onClick={() => setSite(browseCountry.cc, s.name)}
                      className="min-h-10 py-1"
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        <span className="font-mono text-[10px] text-muted">{s.coord}</span>
                      </span>
                      {on && (
                        <span className="ml-auto text-accent">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </PanelRow>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Season — analyst control, hidden for the farmer. */}
          {!isFarmer && (
          <Menu
            className="w-[240px]"
            trigger={
              <MenuTrigger className="hidden md:flex">
                <Icon name="calendar" size={14} />
                <span className="font-mono text-xs">{season}</span>
                <Icon name="down" size={14} />
              </MenuTrigger>
            }
          >
            <MenuLabel>SEASON</MenuLabel>
            {SEASONS.map((y) => (
              <MenuItem key={y.label} hint={y.note} onSelect={() => setSeason(y.label)}>
                <span className="font-mono text-xs">{y.label}</span>
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon="history" hint="2016–2026" onSelect={() => setSeason("2016 – 2026")}>
              Custom period&hellip;
            </MenuItem>
          </Menu>
          )}

          <div className="flex-1" />

          {!isFarmer && (
            <>
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden h-8 w-[260px] items-center gap-2.5 border border-divider px-2.5 text-[13px] text-muted transition-colors hover:border-divider-strong hover:text-ink xl:flex"
              >
                <Icon name="search" size={14} />
                <span className="flex-1 text-left">{fr ? "Rechercher…" : "Search…"}</span>
                <span className="border border-divider px-1.5 font-mono text-[10.5px]">&#8984;K</span>
              </button>
              <button
                onClick={() => setCmdOpen(true)}
                aria-label="Search"
                className="grid size-8 place-items-center border border-divider text-muted hover:text-ink xl:hidden"
              >
                <Icon name="search" size={15} />
              </button>
            </>
          )}

          <div className="hidden h-8 border border-divider sm:flex">
            {(["en", "fr"] as const).map((l, i) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  "flex items-center px-2.5 font-mono text-[11px] transition-colors",
                  i > 0 && "border-l border-divider",
                  lang === l ? "bg-s3 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="grid size-8 flex-none place-items-center border border-divider transition-colors hover:border-divider-strong"
          >
            <Icon name={mounted && theme === "dark" ? "sun" : "moon"} size={15} />
          </button>

          <button
            onClick={() => router.push(`${base}/alerts`)}
            aria-label="Notifications"
            className="relative grid size-8 flex-none place-items-center border border-divider transition-colors hover:border-divider-strong"
          >
            <Icon name="bell" size={15} />
            <span className="absolute right-1.5 top-1.5 size-1.5 bg-[#D96565]" />
          </button>

          <Menu
            align="end"
            className="w-[220px]"
            trigger={
              <button className="flex h-8 items-center gap-2 px-1 transition-opacity hover:opacity-85">
                <span className="grid size-7 place-items-center border border-divider bg-s3 font-mono text-[11px]">
                  {user.initials}
                </span>
                <span className="hidden flex-col text-left leading-[1.15] sm:flex">
                  <span className="text-[12.5px] font-medium">{user.name}</span>
                  <span className="font-mono text-[10px] text-muted">{fr ? user.role.fr : user.role.en}</span>
                </span>
              </button>
            }
          >
            <div className="mb-1 border-b border-divider px-2.5 py-2">
              <div className="text-[13px]">{user.mail}</div>
              <div className="font-mono text-[10px] text-muted">{user.org}</div>
            </div>
            {!isFarmer && (
              <MenuItem icon="settings" onSelect={() => router.push("/app/settings")}>
                Settings
              </MenuItem>
            )}
            <MenuItem icon="logout" onSelect={() => router.push("/login")}>
              Sign out
            </MenuItem>
          </Menu>
        </header>

        <main className={cn("dot-grid relative min-h-0 flex-1", !isFarmer && current === "map" ? "overflow-hidden" : "overflow-auto")}>
          {children}
        </main>
      </div>

      {!isFarmer && <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />}
    </div>
  );
}
