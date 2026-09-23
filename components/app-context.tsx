"use client";

import * as React from "react";
import { COUNTRIES } from "@/lib/data";

export interface SiteRef {
  cc: string;
  name: string;
  country: string;
  coord: string;
}

interface ConsoleState {
  site: SiteRef;
  setSite: (cc: string, name: string) => void;
  season: string;
  setSeason: (s: string) => void;
  lang: "en" | "fr";
  setLang: (l: "en" | "fr") => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const Ctx = React.createContext<ConsoleState | null>(null);

function resolve(cc: string, name: string): SiteRef {
  const country = COUNTRIES.find((c) => c.cc === cc) ?? COUNTRIES[0];
  const site = country.sites.find((s) => s.name === name) ?? country.sites[0];
  return { cc: country.cc, name: site.name, country: country.name, coord: site.coord };
}

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [sel, setSel] = React.useState({ cc: "TN", name: "Ichkeul" });
  const [season, setSeason] = React.useState("2026/27");
  const [lang, setLang] = React.useState<"en" | "fr">("en");
  const [sidebarCollapsed, setCollapsed] = React.useState(false);

  const value = React.useMemo<ConsoleState>(
    () => ({
      site: resolve(sel.cc, sel.name),
      setSite: (cc, name) => setSel({ cc, name }),
      season,
      setSeason,
      lang,
      setLang,
      sidebarCollapsed,
      toggleSidebar: () => setCollapsed((v) => !v),
    }),
    [sel, season, lang, sidebarCollapsed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useConsole must be used inside <ConsoleProvider>");
  return ctx;
}
