import type { IconName } from "@/components/icon";

/**
 * Every figure, name and string in the APWRS mockups, in one place.
 * The designs are a static prototype, so this stands in for the API; swap
 * these exports for fetches and the components do not change.
 */

/* ── Navigation ──────────────────────────────────────────────────────── */

export type PageId =
  | "overview"
  | "map"
  | "sensors"
  | "alerts"
  | "risk"
  | "forecasts"
  | "drivers"
  | "planting"
  | "history"
  | "archive"
  | "upload"
  | "manual"
  | "datasets"
  | "activity"
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
      { id: "map", en: "Live Map", fr: "Carte en direct", icon: "map" },
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
      { id: "drivers", en: "Risk Drivers", fr: "Facteurs de risque", icon: "bars" },
      { id: "planting", en: "Planting Windows", fr: "Fenêtres de semis", icon: "sprout" },
    ],
  },
  {
    key: "HISTORY",
    fr: "HISTORIQUE",
    items: [
      { id: "history", en: "Historical Comparison", fr: "Comparaison historique", icon: "history" },
      { id: "archive", en: "Seasonal Archive", fr: "Archive saisonnière", icon: "archive" },
    ],
  },
  {
    key: "DATA",
    fr: "DONNÉES",
    items: [
      { id: "upload", en: "Upload", fr: "Importer", icon: "upload" },
      { id: "manual", en: "Manual Entry", fr: "Saisie manuelle", icon: "pencil" },
      { id: "datasets", en: "Datasets", fr: "Jeux de données", icon: "database" },
      { id: "activity", en: "Activity Log", fr: "Journal d’activité", icon: "activity" },
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

/** Who is signed in, per role (App.dc.html renderVals). */
export const IDENTITY = {
  expert: {
    name: "Sana Ben Amor",
    role: { en: "Agronomist", fr: "Agronome" },
    initials: "SB",
    mail: "sana.benamor@inrat.tn",
    org: "INRAT · Tunisia",
  },
  farmer: {
    name: "Hédi Jlassi",
    role: { en: "Farmer", fr: "Agriculteur" },
    initials: "HJ",
    mail: "hedi.jlassi@gmail.com",
    org: "Ichkeul · 3 fields",
  },
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
      { name: "Ichkeul", coord: "37.163°N 9.674°E" },
      { name: "Bizerte", coord: "37.274°N 9.873°E" },
      { name: "Kairouan", coord: "35.678°N 10.096°E" },
      { name: "Skhira", coord: "34.300°N 10.070°E" },
    ],
  },
  {
    cc: "MA",
    name: "Morocco",
    sites: [
      { name: "Meknès", coord: "33.895°N 5.555°W" },
      { name: "Saïss Plain", coord: "33.970°N 5.210°W" },
      { name: "Tadla", coord: "32.340°N 6.360°W" },
    ],
  },
  {
    cc: "DZ",
    name: "Algeria",
    sites: [
      { name: "Sétif High Plains", coord: "36.190°N 5.410°E" },
      { name: "Annaba", coord: "36.900°N 7.760°E" },
      { name: "Tlemcen", coord: "34.880°N 1.320°W" },
    ],
  },
];

export const SEASONS = [
  { label: "2026/27", note: "current" },
  { label: "2025/26", note: "" },
  { label: "2024/25", note: "" },
  { label: "2023/24", note: "" },
  { label: "2022/23", note: "drought" },
];

/* ── Overview ────────────────────────────────────────────────────────── */

export const OVERVIEW_ALERTS = [
  {
    lv: "extreme" as const,
    t: "SPEI-3 crossed −2.0 in southern Mateur plain",
    d: "Zone M-07 · 14.2 km² now in Extreme",
    r: "Mateur",
    time: "08:12",
  },
  {
    lv: "severe" as const,
    t: "Soil moisture below 15% VWC at ICH-S02",
    d: "Lowest September value since 2017",
    r: "Ichkeul S",
    time: "06:40",
  },
  {
    lv: "watch" as const,
    t: "Lac Ichkeul level down 11 cm in 14 days",
    d: "Salinity rising at north shore gauge",
    r: "Ichkeul N",
    time: "Yest.",
  },
  {
    lv: "severe" as const,
    t: "LST anomaly +4.3 °C (MODIS 8-day)",
    d: "Heat stress on late olive harvest",
    r: "Bizerte W",
    time: "Yest.",
  },
];

export const SENSOR_ISSUES = [
  { id: "BIZ-S03", msg: "No data for 26 h", v: "offline", c: "#D96565" },
  { id: "ICH-S04", msg: "Battery low", v: "11%", c: "#E7A83B" },
  { id: "MAT-W02", msg: "Weak GSM signal", v: "−104 dBm", c: "#E7A83B" },
];

/* ── Risk ────────────────────────────────────────────────────────────── */

export const HORIZONS = [
  { label: "TODAY", date: "23 Sep", s: 58, c: 82, pm: 6, pe: 11 },
  { label: "+7 DAYS", date: "30 Sep", s: 63, c: 76, pm: 8, pe: 17 },
  { label: "+14 DAYS", date: "07 Oct", s: 67, c: 68, pm: 11, pe: 24 },
  { label: "+30 DAYS", date: "23 Oct", s: 71, c: 57, pm: 15, pe: 33 },
];

export const RISK_ZONES = [
  { id: "M-07", n: "Mateur plain south", a: 14.2, s: 81, d: "+9" },
  { id: "M-04", n: "Mateur plain north", a: 31.6, s: 69, d: "+6" },
  { id: "I-03", n: "Ichkeul west (Joumine)", a: 22.8, s: 64, d: "+4" },
  { id: "B-02", n: "Bizerte plateau west", a: 41.3, s: 57, d: "+3" },
  { id: "I-01", n: "Ichkeul north shore", a: 18.9, s: 44, d: "+2" },
  { id: "T-01", n: "Tinja wetland edge", a: 9.7, s: 22, d: "−1" },
];

/* ── Risk drivers (SHAP) ─────────────────────────────────────────────── */

export interface Driver {
  n: string;
  short: string;
  icon: IconName;
  m: string;
  base: [number, number, number];
  c: string;
  sc: string;
  facts: [string, string][];
  why: string;
}

export const DRIVERS: Driver[] = [
  {
    n: "Rainfall deficit",
    short: "Rain",
    icon: "rain",
    m: "SPI-3 −1.42 · 30d 18.4 mm",
    base: [38, 40, 43],
    c: "#EE8434",
    sc: "#E7A83B",
    facts: [
      ["SPI-3", "−1.42"],
      ["30D RAIN", "18.4 mm"],
      ["NORMAL", "49.6 mm"],
      ["DRY DAYS", "41"],
    ],
    why: "Longest dry spell at Ichkeul since 2017. CHIRPS and station gauges agree within 2 mm.",
  },
  {
    n: "High temperature",
    short: "Heat",
    icon: "thermo",
    m: "Tmax +2.8 °C vs normal",
    base: [24, 23, 20],
    c: "#EE8434",
    sc: "#EE8434",
    facts: [
      ["TMAX 7D", "32.4 °C"],
      ["ANOMALY", "+2.8 °C"],
      ["LST", "34.1 °C"],
      ["HEAT DAYS", "9"],
    ],
    why: "Nine days above 32 °C in September amplify evaporative demand on bare and stubble fields.",
  },
  {
    n: "Soil moisture decline",
    short: "Soil",
    icon: "droplet",
    m: "14.2 % VWC · −3.1 pts / 7d",
    base: [19, 20, 21],
    c: "#E7A83B",
    sc: "#9EDFF1",
    facts: [
      ["VWC 0–30", "14.2 %"],
      ["Δ 7D", "−3.1 pts"],
      ["SMAP L4", "0.12 m³/m³"],
      ["PERCENTILE", "P9"],
    ],
    why: "SMAP and in-situ probes both place root-zone moisture in the lowest decile for late September.",
  },
  {
    n: "Vegetation stress",
    short: "NDVI",
    icon: "leaf",
    m: "NDVI 0.31 · VCI 28",
    base: [11, 10, 10],
    c: "#E7A83B",
    sc: "#2BA6B8",
    facts: [
      ["NDVI", "0.31"],
      ["VCI", "28"],
      ["NDWI", "−0.08"],
      ["TILE", "32SNF"],
    ],
    why: "Stress is moderate: perennial olive canopies buffer the signal, cereal stubble dominates bare pixels.",
  },
  {
    n: "Evapotranspiration",
    short: "ET",
    icon: "sun",
    m: "ET₀ 5.1 mm/d · +0.9",
    base: [8, 7, 6],
    c: "#E7A83B",
    sc: "#8FAAB4",
    facts: [
      ["ET₀", "5.1 mm/d"],
      ["ANOMALY", "+0.9"],
      ["ETc OLIVE", "3.3 mm/d"],
      ["WIND", "18 km/h"],
    ],
    why: "Above-normal demand, largely a consequence of heat and wind rather than an independent driver.",
  },
];

/* ── Forecasts ───────────────────────────────────────────────────────── */

export const FORECAST_ROWS = [
  {
    f: "Next 3 days",
    d: "24–26 Sep",
    s: 59,
    p: "Rain 0 mm · Tmax 31 °C · ET₀ 5.2",
    a: "Irrigate alfalfa and young olive; no field operations on bare soil.",
    c: 88,
  },
  {
    f: "Days 4–7",
    d: "27–30 Sep",
    s: 64,
    p: "Rain 2 mm · Tmax 33 °C · wind NW 25 km/h",
    a: "Mulch or delay tillage to limit topsoil moisture loss.",
    c: 79,
  },
  {
    f: "Week 2",
    d: "01–07 Oct",
    s: 67,
    p: "Rain 6 mm (p=0.34) · Tmax 29 °C",
    a: "Hold seed purchase decisions; monitor SPEI-3 trend.",
    c: 68,
  },
  {
    f: "Weeks 3–4",
    d: "08–21 Oct",
    s: 71,
    p: "Rain 14 mm · 35% below normal",
    a: "Prepare pre-sowing irrigation plan for tomato transplants.",
    c: 59,
  },
  {
    f: "November",
    d: "Month 2",
    s: 54,
    p: "Rain 48 mm · near normal (tercile 44%)",
    a: "Target durum wheat sowing 12 Nov – 04 Dec after first 20 mm event.",
    c: 52,
  },
  {
    f: "December",
    d: "Month 3",
    s: 38,
    p: "Rain 71 mm · above normal (tercile 41%)",
    a: "Barley sowing viable until 20 Dec; plan N top-dress for January.",
    c: 44,
  },
];

/* ── Planting windows ────────────────────────────────────────────────── */

export type SegKind = "o" | "m" | "r";

export interface Crop {
  id: string;
  n: string;
  v: string;
  icon: IconName;
  state: string;
  segs: [number, number, SegKind][];
  wins: { k: string; cls: SegKind; d: string; m: string; why: string[] }[];
}

export const CROPS: Crop[] = [
  {
    id: "durum",
    n: "Durum wheat",
    v: "cv. Karim",
    icon: "sprout",
    state: "IN 50 D",
    segs: [
      [0, 60, "r"],
      [61, 71, "m"],
      [72, 94, "o"],
      [95, 108, "m"],
      [109, 140, "r"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "12 Nov – 04 Dec",
        m: "23 days · score 82 · conf. 78%",
        why: [
          "First effective rain (>20 mm / 5 d) expected 8–14 Nov (p=0.71)",
          "Soil temp. at 5 cm drops below 20 °C ~10 Nov",
          "Frost risk at tillering < 5% for this sowing date",
        ],
      },
      {
        k: "MARGINAL",
        cls: "m",
        d: "01 – 11 Nov",
        m: "11 days · score 54",
        why: [
          "Germination possible only if rain arrives early",
          "Seedlings exposed to residual heat (Tmax > 27 °C)",
        ],
      },
      {
        k: "RISKY",
        cls: "r",
        d: "Before 31 Oct",
        m: "score 21 · drought risk 67–71",
        why: [
          "Soil moisture 14 % VWC, below 18 % germination threshold",
          "41-day dry spell; SPEI-3 −1.7 by mid-Oct",
        ],
      },
    ],
  },
  {
    id: "barley",
    n: "Barley",
    v: "cv. Rihane",
    icon: "sprout",
    state: "IN 45 D",
    segs: [
      [0, 55, "r"],
      [56, 66, "m"],
      [67, 110, "o"],
      [111, 125, "m"],
      [126, 150, "r"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "06 Nov – 19 Dec",
        m: "44 days · score 79 · conf. 74%",
        why: [
          "More drought-tolerant than durum; tolerates later first rain",
          "ECe 4.8 dS/m within barley tolerance (8.0)",
        ],
      },
      { k: "MARGINAL", cls: "m", d: "26 Oct – 05 Nov", m: "score 51", why: ["Viable with a 25 mm pre-sowing irrigation"] },
      { k: "RISKY", cls: "r", d: "Before 25 Oct", m: "score 24", why: ["Topsoil too dry for uniform emergence"] },
    ],
  },
  {
    id: "olive",
    n: "Olive",
    v: "cv. Chemlali · saplings",
    icon: "leaf",
    state: "IN 69 D",
    segs: [
      [60, 90, "m"],
      [91, 180, "o"],
      [181, 210, "m"],
      [211, 280, "r"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "01 Dec – 28 Feb",
        m: "90 days · score 85",
        why: ["Dormancy reduces transplant shock", "Winter rain establishes roots before summer"],
      },
      { k: "MARGINAL", cls: "m", d: "Nov · Mar", m: "score 58", why: ["Requires 2–3 establishment irrigations"] },
      { k: "RISKY", cls: "r", d: "After 31 Mar", m: "score 19", why: ["Heat and drought before root establishment"] },
    ],
  },
  {
    id: "palm",
    n: "Date palm",
    v: "cv. Deglet Nour · offshoots",
    icon: "sun",
    state: "IN 190 D",
    segs: [
      [20, 45, "m"],
      [46, 180, "r"],
      [212, 270, "o"],
      [271, 290, "m"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "01 Apr – 29 May",
        m: "59 days · score 77",
        why: ["Soil temperature > 20 °C promotes rooting", "Requires drip; coastal humidity acceptable"],
      },
      { k: "MARGINAL", cls: "m", d: "21 Sep – 15 Oct", m: "score 49", why: ["Possible now if irrigated daily for 6 weeks"] },
      { k: "RISKY", cls: "r", d: "Nov – Mar", m: "score 15", why: ["Cold nights below 7 °C stall offshoot rooting"] },
    ],
  },
  {
    id: "alfalfa",
    n: "Alfalfa",
    v: "cv. Gabès · irrigated",
    icon: "leaf",
    state: "NOW",
    segs: [
      [22, 50, "m"],
      [51, 120, "r"],
      [181, 230, "o"],
      [231, 250, "m"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "01 Mar – 19 Apr",
        m: "50 days · score 74",
        why: ["Spring sowing avoids current soil-moisture deficit", "Lower weed pressure after winter tillage"],
      },
      {
        k: "MARGINAL",
        cls: "m",
        d: "23 Sep – 20 Oct",
        m: "score 47 · open now",
        why: ["Normally optimal; downgraded by 58 → 71 risk trend", "Needs 40 mm establishment irrigation"],
      },
      { k: "RISKY", cls: "r", d: "21 Oct – Dec", m: "score 22", why: ["Seedlings cannot harden before frost"] },
    ],
  },
  {
    id: "tomato",
    n: "Tomato",
    v: "cv. Rio Grande · transplants",
    icon: "sprout",
    state: "IN 174 D",
    segs: [
      [196, 235, "o"],
      [236, 260, "m"],
      [261, 290, "r"],
    ],
    wins: [
      {
        k: "OPTIMAL",
        cls: "o",
        d: "15 Mar – 23 Apr",
        m: "40 days · score 80",
        why: ["Night temps > 10 °C, frost risk < 3%", "Fruit set before July heat peak"],
      },
      { k: "MARGINAL", cls: "m", d: "24 Apr – 18 May", m: "score 55", why: ["Higher irrigation demand at fruiting"] },
      { k: "RISKY", cls: "r", d: "After 19 May", m: "score 18", why: ["Flower drop above 35 °C; ET₀ > 7 mm/d"] },
    ],
  },
];

export const SEG_STYLE: Record<SegKind, { bg: string; bd: string; ink: string }> = {
  o: { bg: "rgb(43 166 184 / 0.32)", bd: "var(--ap-accent)", ink: "var(--ap-accent)" },
  m: { bg: "rgb(231 168 59 / 0.22)", bd: "rgb(231 168 59 / 0.6)", ink: "#E7A83B" },
  r: {
    bg: "repeating-linear-gradient(135deg, rgb(217 101 101 / 0.4) 0 4px, transparent 4px 8px)",
    bd: "rgb(217 101 101 / 0.5)",
    ink: "#E07B7B",
  },
};

export const PLANTING_MONTHS = ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN"];
export const SEASON_DAYS = 304;

/* ── Sensors ─────────────────────────────────────────────────────────── */

export type SensorType = "weather" | "soil" | "water" | "custom";
export type SensorStatus = "ok" | "warn" | "off";

export interface SensorRow {
  id: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  last: string;
  val: string;
  bat: number;
  link: string;
  lat: string;
  lon: string;
  alt: number;
}

export const SENSOR_ROWS: SensorRow[] = [
  { id: "ICH-W01", name: "Ichkeul South Met", type: "weather", status: "ok", last: "08:30", val: "24.6 °C · 38% RH", bat: 86, link: "LoRa", lat: "37.118", lon: "9.670", alt: 41 },
  { id: "ICH-S02", name: "Djebel Ichkeul foot", type: "soil", status: "ok", last: "08:30", val: "13.9 % VWC", bat: 72, link: "LoRa", lat: "37.112", lon: "9.736", alt: 22 },
  { id: "ICH-L03", name: "North shore gauge", type: "water", status: "ok", last: "08:15", val: "1.84 m · 9.1 g/L", bat: 64, link: "GSM", lat: "37.211", lon: "9.700", alt: 3 },
  { id: "ICH-S04", name: "Oued Joumine field", type: "soil", status: "warn", last: "08:30", val: "15.1 % VWC", bat: 11, link: "LoRa", lat: "37.172", lon: "9.634", alt: 14 },
  { id: "BIZ-W01", name: "Bizerte Port Met", type: "weather", status: "ok", last: "08:30", val: "26.2 °C · 61% RH", bat: 91, link: "GSM", lat: "37.244", lon: "9.880", alt: 8 },
  { id: "BIZ-L02", name: "Menzel Bourguiba gauge", type: "water", status: "ok", last: "08:15", val: "0.42 m · 36.8 g/L", bat: 58, link: "GSM", lat: "37.178", lon: "9.810", alt: 1 },
  { id: "BIZ-S03", name: "Utique plots", type: "soil", status: "off", last: "22 Sep 06:10", val: "—", bat: 0, link: "LoRa", lat: "37.170", lon: "9.903", alt: 19 },
  { id: "MAT-S01", name: "Mateur cereal station", type: "soil", status: "ok", last: "08:30", val: "11.4 % VWC", bat: 77, link: "LoRa", lat: "37.086", lon: "9.765", alt: 35 },
  { id: "MAT-W02", name: "Mateur plain Met", type: "weather", status: "warn", last: "07:45", val: "25.9 °C · 34% RH", bat: 68, link: "GSM", lat: "37.049", lon: "9.662", alt: 46 },
  { id: "TIN-C01", name: "Tinja lysimeter", type: "custom", status: "ok", last: "08:00", val: "ET₀ 4.8 mm/d", bat: 83, link: "Sat", lat: "37.160", lon: "9.760", alt: 6 },
];

export const SENSOR_TYPE: Record<SensorType, { label: string; icon: IconName; count: number }> = {
  weather: { label: "Weather", icon: "sun", count: 7 },
  soil: { label: "Soil moisture", icon: "droplet", count: 11 },
  water: { label: "Water level", icon: "waves", count: 4 },
  custom: { label: "Custom", icon: "cpu", count: 2 },
};

export const SENSOR_STATUS: Record<SensorStatus, { label: string; color: string }> = {
  ok: { label: "Online", color: "var(--ap-teal)" },
  warn: { label: "Degraded", color: "#E7A83B" },
  off: { label: "Offline", color: "#E07B7B" },
};

/* ── Alerts ──────────────────────────────────────────────────────────── */

export interface AlertItem {
  lv: "safe" | "watch" | "severe" | "extreme";
  t: string;
  d: string;
  r: string;
  time: string;
  body: string;
  facts: [string, string][];
  act: string;
}

export const ALERTS: AlertItem[] = [
  {
    lv: "extreme",
    t: "SPEI-3 crossed −2.0 in southern Mateur plain",
    d: "Zone M-07 · 14.2 km² now classified Extreme",
    r: "MATEUR",
    time: "08:12",
    body: "The 3-month Standardized Precipitation-Evapotranspiration Index fell to −2.07 across zone M-07 after 41 consecutive days below 1 mm. Model confidence 84%.",
    facts: [["SPEI-3", "−2.07"], ["AREA", "14.2 km²"], ["RAIN 30D", "6.1 mm"], ["CONF.", "84%"]],
    act: "Postpone any early cereal sowing in M-07. Prioritise supplementary irrigation for olive plots under 5 years.",
  },
  {
    lv: "severe",
    t: "Soil moisture below 15% VWC at ICH-S02",
    d: "Lowest September value since 2017",
    r: "ICHKEUL S",
    time: "06:40",
    body: "Station ICH-S02 (0–30 cm) reports 13.9% volumetric water content, 3.1 points lower than 7 days ago and below the wilting threshold for young alfalfa.",
    facts: [["VWC", "13.9 %"], ["Δ 7D", "−3.1 pts"], ["THRESHOLD", "15.0 %"], ["DEPTH", "0–30 cm"]],
    act: "Schedule irrigation for alfalfa within 48 h; re-check after next reading.",
  },
  {
    lv: "watch",
    t: "Lac Ichkeul level down 11 cm in 14 days",
    d: "Salinity rising at north shore gauge",
    r: "ICHKEUL N",
    time: "Yest.",
    body: "Gauge ICH-L03 shows 1.84 m, with salinity climbing to 9.1 g/L. Wetland vegetation and wintering bird habitat may be affected if the trend continues.",
    facts: [["LEVEL", "1.84 m"], ["Δ 14D", "−11 cm"], ["SALINITY", "9.1 g/L"], ["NORMAL", "6.5 g/L"]],
    act: "Notify park authority (ANPE). Review Sejnane dam release schedule.",
  },
  {
    lv: "severe",
    t: "LST anomaly +4.3 °C (MODIS 8-day)",
    d: "Heat stress on late olive harvest",
    r: "BIZERTE W",
    time: "Yest.",
    body: "MODIS land surface temperature for 14–21 Sep is 4.3 °C above the 2003–2022 mean across the western Bizerte plateau.",
    facts: [["LST", "36.8 °C"], ["ANOMALY", "+4.3 °C"], ["PIXELS", "312"], ["SOURCE", "MOD11A2"]],
    act: "Advise growers to delay harvest-time pruning; monitor fruit drop.",
  },
  {
    lv: "watch",
    t: "NDVI 0.06 below 5-year median",
    d: "Sentinel-2 composite 21 Sep",
    r: "ICHKEUL",
    time: "21 Sep",
    body: "Median NDVI across rain-fed parcels is 0.31 vs 0.37 expected for this date.",
    facts: [["NDVI", "0.31"], ["MEDIAN", "0.37"], ["CLOUD", "4 %"], ["TILE", "32SNF"]],
    act: "No action required. Keep monitoring weekly composite.",
  },
  {
    lv: "safe",
    t: "BIZ-L02 back online",
    d: "Connectivity restored after 3 h",
    r: "BIZERTE",
    time: "20 Sep",
    body: "Station reconnected via GSM fallback.",
    facts: [["DOWNTIME", "3 h 12 m"], ["LINK", "GSM"]],
    act: "None.",
  },
  {
    lv: "severe",
    t: "7-day forecast: risk to peak at 66",
    d: "Driven by rainfall deficit and ET₀ 5.1 mm/d",
    r: "ICHKEUL",
    time: "19 Sep",
    body: "The ensemble forecast projects risk rising from 58 to 66 by 29 Sep.",
    facts: [["PEAK", "66"], ["DATE", "29 Sep"], ["ET₀", "5.1 mm/d"], ["CONF.", "76%"]],
    act: "Review planting plans on the Planting Windows page.",
  },
];

export const ALERT_RULES = [
  { n: "Extreme drought onset", c: "SPEI-3 < −2.0 for ≥ 2 runs", lv: "extreme" as const, s: "All TN sites", ch: "Email · SMS · App", on: true },
  { n: "Soil moisture floor", c: "VWC(0–30cm) < 15 %", lv: "severe" as const, s: "Ichkeul, Mateur", ch: "Email · App", on: true },
  { n: "Lake level drop", c: "Δ level(14d) < −10 cm", lv: "watch" as const, s: "Ichkeul", ch: "Email · App", on: true },
  { n: "Heat anomaly", c: "LST anomaly > +4 °C", lv: "severe" as const, s: "Bizerte", ch: "App", on: false },
  { n: "Forecast escalation", c: "risk(+7d) − risk(0) ≥ 10", lv: "severe" as const, s: "All sites", ch: "Email · App", on: true },
  { n: "Sensor offline", c: "no data > 6 h", lv: "watch" as const, s: "All stations", ch: "App", on: true },
];

/* ── History ─────────────────────────────────────────────────────────── */

export const YEAR_SCORES: [number, number][] = [
  [2016, 38], [2017, 52], [2018, 29], [2019, 35], [2020, 47], [2021, 44],
  [2022, 66], [2023, 61], [2024, 49], [2025, 40], [2026, 58],
];

export const ARCHIVE_SEASONS = [
  { y: "2025/26", peak: 47, rain: 512, yield: 2.9, sown: "18 Nov", note: "Near-normal season; late-March rains rescued grain fill." },
  { y: "2024/25", peak: 55, rain: 441, yield: 2.3, sown: "02 Dec", note: "Dry autumn delayed sowing by two weeks." },
  { y: "2023/24", peak: 71, rain: 338, yield: 1.4, sown: "14 Dec", note: "Second consecutive drought year; Sidi Salem reservoir at 18%." },
  { y: "2022/23", peak: 78, rain: 301, yield: 1.1, sown: "20 Dec", note: "Worst season in record; 60% of rainfed durum not harvested." },
  { y: "2021/22", peak: 52, rain: 468, yield: 2.6, sown: "22 Nov", note: "Hot spring (+2.1 °C) cut yields despite average rainfall." },
  { y: "2020/21", peak: 49, rain: 497, yield: 2.8, sown: "15 Nov", note: "Good establishment; localized hail in April." },
  { y: "2019/20", peak: 39, rain: 588, yield: 3.3, sown: "10 Nov", note: "Wet autumn; optimal window fully used." },
  { y: "2018/19", peak: 31, rain: 654, yield: 3.6, sown: "08 Nov", note: "Best season in reference period." },
];

/* ── Data pages ──────────────────────────────────────────────────────── */

export const METRIC_GROUPS = [
  { id: "soil", n: "Soil", icon: "droplet" as IconName, cols: "station_id, timestamp, vwc_pct, soil_temp_c, ec_dsm, depth_cm" },
  { id: "climate", n: "Climate", icon: "sun" as IconName, cols: "timestamp, tmax_c, tmin_c, rh_pct, rain_mm, wind_ms" },
  { id: "drought", n: "Drought Indices", icon: "gauge" as IconName, cols: "date, spi_1, spi_3, spei_3, pdsi" },
  { id: "agri", n: "Agricultural", icon: "sprout" as IconName, cols: "parcel_id, crop, sowing_date, yield_tha, irrigation" },
  { id: "rs", n: "Remote Sensing", icon: "satellite" as IconName, cols: "date, tile, ndvi, ndwi, lst_c, cloud_pct" },
  { id: "hydro", n: "Hydrology", icon: "waves" as IconName, cols: "gauge_id, timestamp, level_m, salinity_gl, flow_m3s" },
];

export const COLUMN_MAP: [string, string, string, string, string][] = [
  ["station", "ICH-S02", "Station ID", "—", "AUTO"],
  ["datetime_utc", "2026-09-01 00:15", "Timestamp (UTC)", "ISO 8601", "AUTO"],
  ["vwc", "13.94", "Soil moisture (VWC)", "%", "AUTO"],
  ["t_soil", "21.3", "Soil temperature", "°C", "AUTO"],
  ["ec", "4.81", "Electrical conductivity", "dS/m", "AUTO"],
  ["depth", "30", "Probe depth", "cm", "AUTO"],
  ["batt_v", "3.71", "Battery voltage", "V", "AUTO"],
  ["flag", "OK", "— select field —", "", "REVIEW"],
];

export const VALIDATION_ROWS: [string, string, string, string, string, string, string, number][] = [
  ["12", "2026-09-01 03:00", "ICH-S02", "14.12", "20.8", "4.79", "", 0],
  ["418", "2026-09-05 08:30", "ICH-S02", "—", "22.1", "4.80", "Missing required VWC", 2],
  ["419", "2026-09-05 08:45", "ICH-S02", "13.88", "22.4", "4.80", "", 0],
  ["1204", "2026-09-13 11:00", "ICH-S04", "84.20", "27.9", "4.92", "VWC outside plausible range (0–60 %)", 2],
  ["2011", "2026-09-21 14:15", "ICH-S04", "15.02", "29.6", "5.31", "EC jump +0.4 in 15 min", 1],
  ["3877", "2026-09-22 23:45", "ICH-S02", "13.91", "19.4", "4.83", "", 0],
];

export const MANUAL_GROUPS = [
  {
    id: "soil",
    n: "Soil",
    icon: "droplet" as IconName,
    f: [
      ["Soil moisture (VWC)", "%", 1, "14.1"],
      ["Soil temperature", "°C", 1, "21.6"],
      ["Electrical conductivity", "dS/m", 0, "4.8"],
      ["pH", "—", 0, ""],
      ["Probe depth", "cm", 1, "30"],
      ["Organic matter", "%", 0, ""],
    ] as [string, string, number, string][],
  },
  {
    id: "climate",
    n: "Climate",
    icon: "sun" as IconName,
    f: [
      ["Rainfall (24 h)", "mm", 1, "0.0"],
      ["Max temperature", "°C", 1, "31.8"],
      ["Min temperature", "°C", 1, "19.2"],
      ["Relative humidity", "%", 0, "41"],
      ["Wind speed", "m/s", 0, ""],
      ["Solar radiation", "MJ/m²", 0, ""],
    ] as [string, string, number, string][],
  },
  {
    id: "drought",
    n: "Drought Indices",
    icon: "gauge" as IconName,
    f: [
      ["SPI-1", "σ", 0, ""],
      ["SPI-3", "σ", 1, ""],
      ["SPEI-3", "σ", 1, ""],
      ["PDSI", "—", 0, ""],
      ["Reference period", "years", 0, "1991–2020"],
      ["Source", "—", 0, ""],
    ] as [string, string, number, string][],
  },
  {
    id: "agri",
    n: "Agricultural",
    icon: "sprout" as IconName,
    f: [
      ["Parcel ID", "—", 1, ""],
      ["Crop", "—", 1, ""],
      ["Growth stage", "BBCH", 0, ""],
      ["Irrigation applied", "mm", 0, ""],
      ["Sowing date", "date", 0, ""],
      ["Expected yield", "t/ha", 0, ""],
    ] as [string, string, number, string][],
  },
  {
    id: "rs",
    n: "Remote Sensing",
    icon: "satellite" as IconName,
    f: [
      ["NDVI", "index", 0, ""],
      ["NDWI", "index", 0, ""],
      ["LST", "°C", 0, ""],
      ["Cloud cover", "%", 0, ""],
      ["Sentinel tile", "—", 0, ""],
      ["Acquisition date", "date", 0, ""],
    ] as [string, string, number, string][],
  },
  {
    id: "hydro",
    n: "Hydrology",
    icon: "waves" as IconName,
    f: [
      ["Water level", "m", 1, ""],
      ["Salinity", "g/L", 0, ""],
      ["Flow rate", "m³/s", 0, ""],
      ["Gauge ID", "—", 1, ""],
      ["Turbidity", "NTU", 0, ""],
      ["Water temperature", "°C", 0, ""],
    ] as [string, string, number, string][],
  },
];

export const DATASETS: [string, string, string, string, string, string, string, string, string][] = [
  ["DS-2026-0419", "Ichkeul soil probes · Sep 2026", "Upload", "Soil", "4,310", "01–22 Sep 2026", "PROCESSED", "S. Ben Amor", "08:44"],
  ["DS-2026-0418", "CHIRPS daily precipitation", "CHIRPS", "Climate", "91,250", "1981–2026", "PROCESSED", "system", "06:02"],
  ["DS-2026-0417", "ERA5-Land hourly · Bizerte box", "ERA5-Land", "Climate", "1.2 M", "2016–2026", "PROCESSING", "system", "06:00"],
  ["DS-2026-0416", "Sentinel-2 L2A NDVI/NDWI · 32SNF", "Sentinel", "Remote Sensing", "18,904", "Jan–Sep 2026", "PROCESSED", "system", "22 Sep"],
  ["DS-2026-0415", "MODIS MOD11A2 LST 8-day", "MODIS", "Remote Sensing", "6,212", "2003–2026", "PROCESSED", "system", "21 Sep"],
  ["DS-2026-0414", "SMAP L4 root-zone soil moisture", "SMAP", "Soil", "44,830", "2015–2026", "PROCESSED", "system", "21 Sep"],
  ["DS-2026-0413", "SPI / SPEI / PDSI computed", "Model", "Drought Indices", "2,760", "1981–2026", "PROCESSED", "system", "21 Sep"],
  ["DS-2026-0412", "Mateur yield survey 2025/26", "Upload", "Agricultural", "312", "2025/26", "FAILED", "K. Trabelsi", "19 Sep"],
  ["DS-2026-0411", "Lac Ichkeul gauge + salinity", "Field sensors", "Hydrology", "26,114", "2019–2026", "PROCESSED", "ANPE feed", "18 Sep"],
  ["DS-2026-0410", "Manual observations · Bizerte W", "Manual", "Soil", "48", "Sep 2026", "QUEUED", "Y. Haddad", "17 Sep"],
];

export const DATASET_STATUS: Record<string, string> = {
  PROCESSED: "var(--ap-accent)",
  PROCESSING: "var(--ap-teal)",
  FAILED: "#E07B7B",
  QUEUED: "#E7A83B",
};

export const ACTIVITY_LOG: [string, IconName, string, string, string, string, string][] = [
  ["23 Sep 08:44", "upload", "var(--ap-accent)", "Sana Ben Amor", "Agronomist", "Imported 4,310 rows · 8 skipped", "DS-2026-0419"],
  ["23 Sep 08:12", "bell", "#EE8434", "system", "", "Alert raised: SPEI-3 < −2.0 in zone M-07", "ALR-5521"],
  ["23 Sep 06:00", "cpu", "var(--ap-teal)", "system", "", "Model run v2.4.1 completed in 3 m 41 s", "RUN-26-266"],
  ["22 Sep 17:30", "pencil", "var(--ap-muted)", "Youssef Haddad", "Field tech", "Edited station BIZ-S03 coordinates", "BIZ-S03"],
  ["22 Sep 11:02", "users", "var(--ap-muted)", "Leïla Mansouri", "Admin", "Granted Viewer role to ANPE Ichkeul", "USR-0088"],
  ["21 Sep 15:40", "settings", "var(--ap-muted)", "Leïla Mansouri", "Admin", "Changed Extreme risk threshold 80 → 75", "CFG-THR"],
  ["19 Sep 09:15", "alert", "#E07B7B", "Karim Trabelsi", "Researcher", "Upload failed: 12 rows missing parcel_id", "DS-2026-0412"],
  ["18 Sep 10:20", "radio", "var(--ap-teal)", "Youssef Haddad", "Field tech", "Registered sensor TIN-C01", "TIN-C01"],
  ["17 Sep 16:05", "download", "var(--ap-muted)", "Karim Trabelsi", "Researcher", "Exported historical comparison (PDF)", "EXP-0934"],
];

/* ── Admin ───────────────────────────────────────────────────────────── */

export const ROLES: [string, number, string][] = [
  ["ADMIN", 3, "Full access, users, thresholds"],
  ["AGRONOMIST", 11, "All analysis, data entry"],
  ["RESEARCHER", 9, "Analysis, exports, uploads"],
  ["PARK AUTHORITY", 6, "Monitor & alerts, own sites"],
  ["FIELD TECH", 5, "Sensors & manual entry"],
  ["VIEWER", 4, "Read-only dashboards"],
];

export const USERS: [string, string, string, string, string, string, string, string][] = [
  ["LM", "Leïla Mansouri", "l.mansouri@inrat.tn", "INRAT", "Admin", "All sites", "Now", "ACTIVE"],
  ["SB", "Sana Ben Amor", "sana.benamor@inrat.tn", "INRAT", "Agronomist", "TN · 4 sites", "Now", "ACTIVE"],
  ["KT", "Karim Trabelsi", "k.trabelsi@inat.u-carthage.tn", "INAT", "Researcher", "TN, DZ", "2 h ago", "ACTIVE"],
  ["YH", "Youssef Haddad", "y.haddad@crda-bizerte.tn", "CRDA Bizerte", "Field tech", "Bizerte, Ichkeul", "1 d ago", "ACTIVE"],
  ["AE", "Amina El Idrissi", "a.elidrissi@inra.ma", "INRA Maroc", "Agronomist", "MA · 2 sites", "3 d ago", "ACTIVE"],
  ["AN", "ANPE Ichkeul", "parc.ichkeul@anpe.nat.tn", "ANPE", "Park authority", "Ichkeul", "5 d ago", "ACTIVE"],
  ["RB", "Rachid Boukhari", "r.boukhari@inraa.dz", "INRAA", "Researcher", "DZ · 1 site", "—", "INVITED"],
  ["MC", "Mehdi Chaabane", "m.chaabane@example.org", "—", "Viewer", "Kairouan", "62 d ago", "SUSPENDED"],
];

export interface SiteNode {
  n: string;
  centroid: string;
  area: string;
  sensors: number;
  crops: string;
}

export const REGION_TREE: { cc: string; n: string; regions: { n: string; sites: SiteNode[] }[] }[] = [
  {
    cc: "TN",
    n: "Tunisia",
    regions: [
      {
        n: "Bizerte Governorate",
        sites: [
          { n: "Ichkeul", centroid: "37.163°N 9.674°E", area: "126 km²", sensors: 8, crops: "Durum, barley, olive" },
          { n: "Bizerte", centroid: "37.274°N 9.873°E", area: "152 km²", sensors: 6, crops: "Olive, tomato" },
        ],
      },
      {
        n: "Kairouan Governorate",
        sites: [{ n: "Kairouan", centroid: "35.678°N 10.096°E", area: "210 km²", sensors: 4, crops: "Olive, barley" }],
      },
      {
        n: "Sfax Governorate",
        sites: [{ n: "Skhira", centroid: "34.300°N 10.070°E", area: "88 km²", sensors: 2, crops: "Date palm, olive" }],
      },
    ],
  },
  {
    cc: "MA",
    n: "Morocco",
    regions: [
      {
        n: "Fès-Meknès",
        sites: [
          { n: "Meknès", centroid: "33.895°N 5.555°W", area: "174 km²", sensors: 3, crops: "Durum, olive" },
          { n: "Saïss Plain", centroid: "33.970°N 5.210°W", area: "240 km²", sensors: 1, crops: "Wheat, alfalfa" },
        ],
      },
    ],
  },
  {
    cc: "DZ",
    n: "Algeria",
    regions: [
      {
        n: "Sétif Province",
        sites: [{ n: "Sétif High Plains", centroid: "36.190°N 5.410°E", area: "310 km²", sensors: 0, crops: "Durum, barley" }],
      },
    ],
  },
];

/* ── Landing ─────────────────────────────────────────────────────────── */

export const LANDING_INPUTS: { t: string; d: string; icon: IconName }[] = [
  { t: "Climate", d: "CHIRPS · ERA5-Land", icon: "rain" },
  { t: "Soil sensors", d: "VWC · EC · temperature", icon: "droplet" },
  { t: "Satellite indices", d: "NDVI · NDWI · LST", icon: "satellite" },
  { t: "Drought indices", d: "SPI · SPEI · PDSI", icon: "gauge" },
];

export const LANDING_FEATURES: { icon: IconName; t: string; d: string }[] = [
  { icon: "sprout", t: "Planting windows", d: "Optimal, marginal and risky sowing periods for durum wheat, barley, olive, date palm, alfalfa and tomato." },
  { icon: "gauge", t: "Drought risk 0–100", d: "One scale for every site — Safe, Watch, Severe, Extreme — today and at +7, +14 and +30 days." },
  { icon: "map", t: "Live map", d: "Risk and NDVI on a 1 km grid, water bodies, sensor stations and draw-to-measure areas." },
  { icon: "bell", t: "Alerts", d: "Rules on any index or sensor, delivered by email, SMS or in-app, with a recommended action." },
  { icon: "history", t: "Historical comparison", d: "Today against 45 years of record: percentiles, return periods and year-vs-year overlays." },
  { icon: "upload", t: "Data ingestion", d: "CSV/XLSX upload with column mapping and validation, manual entry and sensor feeds." },
];

export const LANDING_SOURCES = [
  { n: "CHIRPS", w: "Daily precipitation", r: "0.05° · 1981–" },
  { n: "ERA5-Land", w: "Reanalysis climate", r: "9 km · hourly" },
  { n: "Sentinel", w: "NDVI · NDWI", r: "10 m · 5-day" },
  { n: "MODIS", w: "Land surface temp.", r: "1 km · 8-day" },
  { n: "SMAP", w: "Soil moisture L4", r: "9 km · 3-hourly" },
  { n: "Field sensors", w: "Soil, weather, water", r: "point · 15 min" },
];

export const LANDING_SITES: [string, string, number, number, string, "l" | "r"][] = [
  ["TN", "Ichkeul", 9.67, 37.16, "37.16°N 9.67°E", "l"],
  ["TN", "Bizerte", 9.87, 37.27, "37.27°N 9.87°E", "r"],
  ["TN", "Kairouan", 10.1, 35.68, "35.68°N 10.10°E", "l"],
  ["TN", "Skhira", 10.07, 34.3, "34.30°N 10.07°E", "l"],
  ["MA", "Meknès", -5.55, 33.9, "33.90°N 5.55°W", "r"],
  ["MA", "Saïss Plain", -5.21, 33.97, "33.97°N 5.21°W", "r"],
  ["DZ", "Sétif High Plains", 5.41, 36.19, "36.19°N 5.41°E", "r"],
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
