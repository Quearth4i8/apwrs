import type { IconName } from "@/components/icon";

/**
 * Navigation, identities and the marketing copy.
 *
 * This file used to hold the whole prototype's invented dataset — alerts,
 * sensors, forecasts, users, datasets. All of it is gone. Measured figures
 * come from lib/climate.ts (the 30-year station record) and lib/metrics.ts;
 * live figures come from the API routes.
 */

/* ── Navigation ──────────────────────────────────────────────────────── */

export type PageId =
  | "overview"
  | "sensors"
  | "alerts"
  | "risk"
  | "forecasts"
  | "planting"
  | "profile"
  | "irrigation"
  | "history"
  | "users"
  | "regions"
  | "settings";

export interface NavItem {
  id: PageId;
  en: string;
  fr: string;
  icon: IconName;
}

export interface NavGroup {
  key: string;
  fr: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    key: "MONITOR",
    fr: "SURVEILLER",
    items: [
      { id: "overview", en: "Overview", fr: "Vue d’ensemble", icon: "dashboard" },
      { id: "sensors", en: "Sensors", fr: "Capteurs", icon: "radio" },
      { id: "alerts", en: "Alerts", fr: "Alertes", icon: "bell" },
    ],
  },
  {
    key: "ANALYSIS",
    fr: "ANALYSE",
    items: [
      { id: "risk", en: "Drought Risk", fr: "Risque de sécheresse", icon: "gauge" },
      { id: "forecasts", en: "Forecasts", fr: "Prévisions", icon: "trend" },
      { id: "planting", en: "Calendar", fr: "Calendrier", icon: "sprout" },
      { id: "irrigation", en: "Irrigation", fr: "Irrigation", icon: "droplet" },
      { id: "profile", en: "Field Profile", fr: "Profil de parcelle", icon: "leaf" },
    ],
  },
  {
    key: "HISTORY",
    fr: "HISTORIQUE",
    items: [
      { id: "history", en: "Historical", fr: "Données historiques", icon: "history" },
    ],
  },
  {
    key: "ADMIN",
    fr: "ADMIN",
    items: [
      { id: "users", en: "Users & Roles", fr: "Utilisateurs et rôles", icon: "users" },
      { id: "regions", en: "Regions & Sites", fr: "Régions et sites", icon: "pin" },
      { id: "settings", en: "Settings", fr: "Paramètres", icon: "settings" },
    ],
  },
];

export const FARMER_TABS = [
  { id: "today", icon: "home" as IconName },
  { id: "fields", icon: "map" as IconName },
  { id: "alerts", icon: "bell" as IconName },
  { id: "help", icon: "help" as IconName },
] as const;

export type FarmerTab = (typeof FARMER_TABS)[number]["id"];

/**
 * The farmer console runs the same shell as the expert one with a single
 * reduced nav group (App.dc.html NAV_F). Ids match FarmerTab so one route
 * segment drives both the sidebar and the content.
 */
export const FARM_NAV: { key: string; fr: string; items: { id: FarmerTab; en: string; fr: string; icon: IconName }[] } = {
  key: "MY FARM",
  fr: "MA FERME",
  items: [
    { id: "today", en: "Today", fr: "Aujourd’hui", icon: "home" },
    { id: "fields", en: "My fields", fr: "Mes parcelles", icon: "map" },
    { id: "alerts", en: "Messages", fr: "Messages", icon: "bell" },
    { id: "help", en: "Help", fr: "Aide", icon: "help" },
  ],
};

/**
 * There is no authentication in this build, so nobody is signed in and no
 * account can be named. The header shows which view is active instead.
 */
export const IDENTITY = {
  expert: { view: "Expert view", initials: "EX", note: "No account connected" },
  farmer: { view: "Farmer view", initials: "FM", note: "No account connected" },
} as const;

/* ── Geography ───────────────────────────────────────────────────────── */

export interface Country {
  cc: string;
  name: string;
  sites: { name: string; coord: string }[];
}

export const COUNTRIES: Country[] = [
  {
    cc: "TN",
    name: "Tunisia",
    sites: [
      { name: "Ichkeul", coord: "37.010°N 9.731°E" },
      { name: "Mateur", coord: "37.117°N 9.318°E" },
    ],
  },
];

/** Hydrological years covered by the station record. */
/* ── Overview ────────────────────────────────────────────────────────── */

export const LANDING_INPUTS: { t: string; d: string; icon: IconName }[] = [
  { t: "Station record", d: "30 years, daily, no gaps", icon: "database" },
  { t: "Reference ET", d: "FAO-56 Penman–Monteith", icon: "sun" },
  { t: "Crop coefficients", d: "Kᴄ curves and stage lengths", icon: "sprout" },
  { t: "Live forecast", d: "Gridded, refreshed twice daily", icon: "cloud" },
];

export const LANDING_FEATURES: { icon: IconName; t: string; d: string }[] = [
  { icon: "sprout", t: "Sowing windows", d: "Thirty years of daily weather replayed through each crop’s FAO-56 Kc curve to score rainfall adequacy by sowing date." },
  { icon: "gauge", t: "SPEI and SPI", d: "Standardised indices fitted per calendar month across 30 years, so a value means the same thing in any season." },
  { icon: "map", t: "Live risk surface", d: "A continuous drought field over the region, weighted by information entropy rather than by hand." },
  { icon: "history", t: "Historical comparison", d: "Today against the full 30-year record: annual totals, monthly normals and every fitted SPEI month." },
  { icon: "table", t: "Open method", d: "Every index is computed from the published record and the arithmetic is shown, not asserted." },
];

/** Only what the build actually reads from. */
export const LANDING_SOURCES = [
  { n: "Station record", w: "Rain, temperature, humidity, radiation, wind, ET₀", r: "2 stations · 1996–2025 daily" },
  { n: "Open-Meteo", w: "Forecast and recent past, gridded", r: "~9 km · refreshed 2× daily" },
  { n: "FAO-56", w: "Crop coefficients and stage lengths", r: "9 crops" },
];

/** The two stations that exist, at their real coordinates. */
export const LANDING_SITES: [string, string, number, number, string, "l" | "r"][] = [
  ["TN", "Ichkeul", 9.731, 37.01, "37.010°N 9.731°E", "l"],
  ["TN", "Mateur", 9.318, 37.117, "37.117°N 9.318°E", "r"],
];

export const MAGHREB_COAST: [number, number][] = [
  [-9.9, 30.2], [-9.6, 31.5], [-9.2, 32.4], [-7.6, 33.6], [-6.8, 34.1], [-6.2, 35.1],
  [-5.9, 35.8], [-5.3, 35.9], [-4.4, 35.2], [-3.0, 35.3], [-1.9, 35.1], [-0.6, 35.8],
  [1.2, 36.5], [3.0, 36.8], [4.4, 36.9], [5.1, 36.8], [6.9, 37.0], [7.8, 36.95],
  [8.8, 36.95], [9.9, 37.3], [10.4, 37.0], [11.0, 37.1], [10.6, 36.4], [10.6, 35.8],
  [11.1, 35.5], [10.8, 34.7], [10.1, 34.3], [10.1, 33.9], [10.9, 33.7], [11.2, 33.4],
  [12, 33.0],
];

export const LANDING_FAQ: [string, string][] = [
  ["Who can use APWRS?", "Agronomists, researchers, extension services and protected-area authorities working in Tunisia, Morocco and Algeria. Access is role-based and scoped to sites."],
  ["How accurate are the forecasts?", "Every score carries a confidence value and an 80% interval. Skill is highest at +7 days and decreases toward +30 days; both are shown on every chart."],
  ["Can I add my own sensor data?", "Yes — register stations, stream readings over LoRaWAN or GSM, or upload CSV/XLSX files using the six metric templates."],
  ["Is the interface available in French?", "Yes. The whole product is available in English and French; Arabic is planned."],
  ["What does a planting window mean?", "A date range where, given forecast rain, soil moisture and temperature, sowing a crop is expected to establish well. Each window lists the reasons and any warnings."],
];
