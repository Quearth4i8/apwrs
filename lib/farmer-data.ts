import type { IconName } from "@/components/icon";

/**
 * The farmer app speaks plainly and is fully bilingual (EN/FR), so its copy
 * lives apart from the expert data. Verdict kinds ("wait", "maybe", "go")
 * drive colour, icon and wording together — one decision, one vocabulary.
 */

export type Lang = "en" | "fr";

export const FARMER_TEXT = {
  en: {
    hello: "Good morning",
    date: "Wed 23 Sep",
    myCrops: "My crops",
    bestTime: "Best time to plant",
    todo: "What to do this week",
    dryness: "How dry is it?",
    dryWhere: "Your area, today",
    weather: "Next 7 days",
    rainWeek: "Rain this week: 2 mm",
    fields: "My fields",
    alerts: "Messages",
    sms: "Also send me SMS",
    help: "Help",
    advisor: "Your farm advisor",
    call: "Call my advisor",
    msg: "Send a message",
    listen: "Listen",
    stop: "Stop",
    daysTo: "days to wait",
    now: "open now",
    dryText:
      "The land is very dry. It has barely rained for 6 weeks and it is hot. It will likely get worse before November rains.",
    lv: ["Normal", "A bit dry", "Very dry", "Drought"],
    days: ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"],
    tabs: ["Today", "My fields", "Messages", "Help"],
  },
  fr: {
    hello: "Bonjour",
    date: "mer. 23 sept.",
    myCrops: "Mes cultures",
    bestTime: "Meilleure période pour semer",
    todo: "À faire cette semaine",
    dryness: "La terre est-elle sèche ?",
    dryWhere: "Votre zone, aujourd’hui",
    weather: "7 prochains jours",
    rainWeek: "Pluie cette semaine : 2 mm",
    fields: "Mes parcelles",
    alerts: "Messages",
    sms: "M’envoyer aussi un SMS",
    help: "Aide",
    advisor: "Votre conseiller agricole",
    call: "Appeler mon conseiller",
    msg: "Envoyer un message",
    listen: "Écouter",
    stop: "Arrêter",
    daysTo: "jours à attendre",
    now: "ouvert",
    dryText:
      "La terre est très sèche. Il n’a presque pas plu depuis 6 semaines et il fait chaud. Cela risque d’empirer avant les pluies de novembre.",
    lv: ["Normal", "Un peu sec", "Très sec", "Sécheresse"],
    days: ["mer", "jeu", "ven", "sam", "dim", "lun", "mar"],
    tabs: ["Aujourd’hui", "Parcelles", "Messages", "Aide"],
  },
} as const;

export type VerdictKind = "wait" | "care" | "season" | "maybe" | "go";

export interface FarmerCrop {
  id: string;
  en: string;
  fr: string;
  k: VerdictKind;
  days: number;
  when: { en: string; fr: string };
  why: { en: string; fr: string };
  todo: [string, string, string, string, IconName][];
}

export const FARMER_CROPS: FarmerCrop[] = [
  {
    id: "wheat",
    en: "Wheat",
    fr: "Blé dur",
    k: "wait",
    days: 50,
    when: { en: "12 Nov – 4 Dec", fr: "12 nov – 4 déc" },
    why: {
      en: "The soil is too dry for seeds to sprout. Wait for the first good rain, expected around 8–14 November.",
      fr: "Le sol est trop sec pour que les graines germent. Attendez la première bonne pluie, prévue vers le 8–14 novembre.",
    },
    todo: [
      ["Keep your seed dry and ready", "Garder la semence au sec", "Store it off the ground, in the shade", "À l’abri, hors du sol", "sprout"],
      ["Don’t plough bare soil yet", "Ne pas labourer maintenant", "Ploughing now dries the soil more", "Labourer maintenant assèche le sol", "alert"],
    ],
  },
  {
    id: "olive",
    en: "Olive trees",
    fr: "Oliviers",
    k: "care",
    days: 69,
    when: { en: "1 Dec – 28 Feb", fr: "1 déc – 28 fév" },
    why: {
      en: "Wait until December to plant new trees. Your young trees need water now because of the heat.",
      fr: "Attendez décembre pour planter de nouveaux arbres. Vos jeunes arbres ont besoin d’eau maintenant à cause de la chaleur.",
    },
    todo: [
      ["Water young trees 2× this week", "Arroser les jeunes arbres 2× cette semaine", "About 40 litres per tree, early morning", "Environ 40 litres par arbre, tôt le matin", "droplet"],
      ["Pick fallen fruit", "Ramasser les fruits tombés", "Heat is making fruit drop early", "La chaleur fait tomber les fruits", "leaf"],
    ],
  },
  {
    id: "tomato",
    en: "Tomato",
    fr: "Tomate",
    k: "season",
    days: 173,
    when: { en: "15 Mar – 23 Apr", fr: "15 mars – 23 avr" },
    why: {
      en: "It is not tomato season. Plant seedlings in spring when nights stay warm.",
      fr: "Ce n’est pas la saison de la tomate. Plantez au printemps quand les nuits restent douces.",
    },
    todo: [
      ["Nothing to do for tomato now", "Rien à faire pour la tomate", "We will remind you in February", "Nous vous rappellerons en février", "calendar"],
    ],
  },
  {
    id: "alfalfa",
    en: "Alfalfa",
    fr: "Luzerne",
    k: "maybe",
    days: 0,
    when: { en: "Now – 20 Oct", fr: "Maintenant – 20 oct" },
    why: {
      en: "You can sow now only if you can water it. Without irrigation, wait until March.",
      fr: "Vous pouvez semer maintenant seulement si vous pouvez arroser. Sans irrigation, attendez mars.",
    },
    todo: [
      ["Water 40 mm before sowing", "Arroser 40 mm avant de semer", "About 2 hours of drip", "Environ 2 heures de goutte-à-goutte", "droplet"],
      ["Sow in the evening", "Semer le soir", "Less heat for the seeds", "Moins de chaleur pour les graines", "sun"],
    ],
  },
];

export const VERDICT: Record<
  VerdictKind,
  { icon: IconName; c: string; ink: string; bg: string; bd: string; en: [string, string]; fr: [string, string] }
> = {
  wait: {
    icon: "hand",
    c: "#D9621A",
    ink: "#B24E12",
    bg: "rgb(238 132 52 / 0.1)",
    bd: "rgb(217 98 26 / 0.45)",
    en: ["Not yet", "Wait"],
    fr: ["Pas encore", "Attendez"],
  },
  care: {
    icon: "hand",
    c: "#D9621A",
    ink: "#B24E12",
    bg: "rgb(238 132 52 / 0.1)",
    bd: "rgb(217 98 26 / 0.45)",
    en: ["Not yet", "Wait"],
    fr: ["Pas encore", "Attendez"],
  },
  season: {
    icon: "calendar",
    c: "#56727D",
    ink: "#34505B",
    bg: "rgb(20 43 53 / 0.04)",
    bd: "rgb(20 43 53 / 0.2)",
    en: ["Not the season", "Not now"],
    fr: ["Hors saison", "Pas maintenant"],
  },
  maybe: {
    icon: "droplet",
    c: "#B7860B",
    ink: "#8A6508",
    bg: "rgb(231 168 59 / 0.14)",
    bd: "rgb(201 138 0 / 0.5)",
    en: ["Only with water", "Plant if you irrigate"],
    fr: ["Seulement avec eau", "Semez si vous irriguez"],
  },
  go: {
    icon: "check",
    c: "#38A88A",
    ink: "#237A63",
    bg: "rgb(43 166 184 / 0.1)",
    bd: "rgb(43 166 184 / 0.5)",
    en: ["Go ahead", "Plant now"],
    fr: ["Allez-y", "Semez maintenant"],
  },
};

export const CROP_DOT: Record<VerdictKind, string> = {
  wait: "#D9621A",
  care: "#D9621A",
  season: "#8AA3AC",
  maybe: "#C98A00",
  go: "#38A88A",
};

export const FARMER_WEEK: [number, IconName, number, string][] = [
  [0, "sun", 31, "0"],
  [1, "sun", 32, "0"],
  [2, "sun", 33, "0"],
  [3, "cloudsun", 30, "0"],
  [4, "cloudsun", 29, "1"],
  [5, "rain", 27, "1"],
  [6, "cloudsun", 28, "0"],
];

export const FARMER_FIELDS: [string, string, string, string, string, string, string][] = [
  ["North field", "Parcelle nord", "wheat", "4.5 ha", "Soil very dry", "Sol très sec", "Not sown yet"],
  ["River orchard", "Verger de l’oued", "olive", "120", "Soil dry", "Sol sec", "Trees stressed"],
  ["Garden plot", "Petit jardin", "alfalfa", "0.6 ha", "Irrigated · OK", "Irrigué · correct", "Ready to sow"],
];

export const FARMER_FIELDS_FR_PLANTS = ["Pas encore semé", "Arbres stressés", "Prêt à semer"];

export const FARMER_ALERTS = {
  en: [
    ["Today 08:12", "alert", "#D9621A", "rgb(238 132 52 / 0.08)", "rgb(217 98 26 / 0.4)", "Strong drought in your area", "Do not sow wheat now. Save water for young trees."],
    ["Yesterday", "thermo", "#B7860B", "rgb(231 168 59 / 0.1)", "rgb(201 138 0 / 0.4)", "Hot days until Sunday", "Up to 33 °C. Water early morning or evening."],
    ["20 Sep", "check", "#197A91", "rgb(43 166 184 / 0.06)", "rgb(43 166 184 / 0.3)", "Your sensor is working again", "Readings from the north field are back."],
  ],
  fr: [
    ["Aujourd’hui 08:12", "alert", "#D9621A", "rgb(238 132 52 / 0.08)", "rgb(217 98 26 / 0.4)", "Sécheresse forte dans votre zone", "Ne semez pas le blé maintenant. Gardez l’eau pour les jeunes arbres."],
    ["Hier", "thermo", "#B7860B", "rgb(231 168 59 / 0.1)", "rgb(201 138 0 / 0.4)", "Journées chaudes jusqu’à dimanche", "Jusqu’à 33 °C. Arrosez tôt le matin ou le soir."],
    ["20 sept.", "check", "#197A91", "rgb(43 166 184 / 0.06)", "rgb(43 166 184 / 0.3)", "Votre capteur fonctionne à nouveau", "Les mesures de la parcelle nord sont revenues."],
  ],
} as const;

export const FARMER_FAQ = {
  en: [
    ["What do the colours mean?", "Green: go ahead. Yellow: only with water. Orange: wait. Grey: not the season."],
    ["Where does this advice come from?", "Satellites, weather data and field sensors in your area, checked by your advisor."],
  ],
  fr: [
    ["Que veulent dire les couleurs ?", "Vert : allez-y. Jaune : seulement avec de l’eau. Orange : attendez. Gris : hors saison."],
    ["D’où viennent ces conseils ?", "Des satellites, de la météo et des capteurs dans les champs de votre zone, vérifiés par votre conseiller."],
  ],
} as const;
