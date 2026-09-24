/**
 * FAO Penman-Monteith reference evapotranspiration (ET₀).
 *
 * A direct implementation of Chapter 3, "Calculation procedures", of the
 * ETo Calculator Reference Manual V3.2 (FAO, September 2012) — the PDF in
 * `formlas and data/`. The methods are those of FAO Irrigation and Drainage
 * Paper 56 (Allen et al., 1998).
 *
 * Every function below is one numbered equation from that chapter, named for
 * the quantity it returns and annotated with its equation number, so the code
 * can be read side by side with the manual. Nothing here is fitted, tuned or
 * approximated: the chain runs
 *
 *   §3.1 atmospheric pressure, psychrometric constant
 *   §3.2 air temperature
 *   §3.3 air humidity      (saturation / actual vapour pressure, slope)
 *   §3.4 radiation         (extraterrestrial → clear-sky → net)
 *   §3.5 wind speed        (adjustment to 2 m)
 *   §3.6 ET₀               (Eq. 3.28)
 *
 * All units are the manual's standard metric units: temperature °C, pressure
 * kPa, radiation MJ m⁻² day⁻¹, wind m s⁻¹, ET₀ mm day⁻¹.
 */

/* ── Constants (§3.1, §3.4) ──────────────────────────────────────────── */

/** Solar constant, MJ m⁻² min⁻¹ (§3.4, Eq. 3.14). */
export const SOLAR_CONSTANT = 0.082;

/** Stefan-Boltzmann constant, MJ K⁻⁴ m⁻² day⁻¹ (§3.4, Eq. 3.24). */
export const STEFAN_BOLTZMANN = 4.903e-9;

/** Albedo of the hypothetical grass reference crop (§3.4, Eq. 3.23). */
export const ALBEDO = 0.23;

/**
 * Latent heat of vaporization, MJ kg⁻¹. The manual fixes this at 2.45 (the
 * value for about 20 °C) rather than varying it with temperature, "to
 * correspond with the calculation procedure for the FAO Penman-Monteith
 * equation" (§3.1).
 */
export const LATENT_HEAT = 2.45;

/** Specific heat at constant pressure, MJ kg⁻¹ °C⁻¹ (§3.1). */
export const SPECIFIC_HEAT = 1.013e-3;

/** Ratio of the molecular weight of water vapour to dry air (§3.1). */
export const EPSILON = 0.622;

/** Default Ångström coefficients (§3.4, Eq. 3.20). */
export const ANGSTROM_AS = 0.25;
export const ANGSTROM_BS = 0.5;

/* ── §3.1 Atmospheric parameters ─────────────────────────────────────── */

/**
 * Atmospheric pressure — Eq. 3.1.
 *
 * @param elevationM elevation above sea level, m
 * @returns kPa
 */
export function atmosphericPressure(elevationM: number): number {
  return 101.3 * ((293 - 0.0065 * elevationM) / 293) ** 5.26;
}

/**
 * Psychrometric constant — Eq. 3.2.
 *
 * γ = (cp · P) / (ε · λ), which with the manual's fixed constants reduces to
 * 0.664742·10⁻³ · P.
 *
 * @param pressureKpa atmospheric pressure, kPa
 * @returns kPa °C⁻¹
 */
export function psychrometricConstant(pressureKpa: number): number {
  return ((SPECIFIC_HEAT * pressureKpa) / (EPSILON * LATENT_HEAT));
}

/* ── §3.2 Air temperature ────────────────────────────────────────────── */

/** Mean air temperature — Eq. 3.3. */
export function meanAirTemperature(tminC: number, tmaxC: number): number {
  return (tmaxC + tminC) / 2;
}

/* ── §3.3 Air humidity ───────────────────────────────────────────────── */

/**
 * Saturation vapour pressure at a given air temperature — Eq. 3.4.
 *
 * @param tC air temperature, °C
 * @returns kPa
 */
export function saturationVapourPressure(tC: number): number {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/**
 * Mean saturation vapour pressure over a day — Eq. 3.5.
 *
 * Taken as the mean of e°(Tmax) and e°(Tmin) rather than e°(Tmean), because
 * Eq. 3.4 is non-linear and using the mean temperature would understate it.
 */
export function meanSaturationVapourPressure(tminC: number, tmaxC: number): number {
  return (saturationVapourPressure(tmaxC) + saturationVapourPressure(tminC)) / 2;
}

/**
 * Slope of the saturation vapour pressure curve — Eq. 3.6.
 *
 * @returns kPa °C⁻¹
 */
export function slopeSaturationVapourPressure(tC: number): number {
  return (4098 * saturationVapourPressure(tC)) / (tC + 237.3) ** 2;
}

/** Actual vapour pressure from dewpoint temperature — Eq. 3.7. */
export function vapourPressureFromDewpoint(tdewC: number): number {
  return saturationVapourPressure(tdewC);
}

/** Actual vapour pressure from RHmax and RHmin — Eq. 3.10. */
export function vapourPressureFromRhMaxMin(
  tminC: number,
  tmaxC: number,
  rhMax: number,
  rhMin: number,
): number {
  return (
    (saturationVapourPressure(tminC) * (rhMax / 100) +
      saturationVapourPressure(tmaxC) * (rhMin / 100)) /
    2
  );
}

/** Actual vapour pressure from RHmax alone — Eq. 3.11. */
export function vapourPressureFromRhMax(tminC: number, rhMax: number): number {
  return saturationVapourPressure(tminC) * (rhMax / 100);
}

/**
 * Actual vapour pressure from mean relative humidity — Eq. 3.12 (Smith, 1992).
 *
 * The manual notes this deliberately differs from the equation in I&D Paper
 * 56: analysis across several climatic data sets showed Eq. 3.12 gives more
 * accurate estimates of ea when only mean RH is available. That is the case
 * for the station workbooks here, which carry a single `relative_humidity`
 * column, so this is the route the pipeline uses.
 */
export function vapourPressureFromRhMean(tmeanC: number, rhMean: number): number {
  return saturationVapourPressure(tmeanC) * (rhMean / 100);
}

/* ── §3.4 Radiation ──────────────────────────────────────────────────── */

/** Degrees to radians — Eq. 3.15. */
export function toRadians(decimalDegrees: number): number {
  return (Math.PI / 180) * decimalDegrees;
}

/** Inverse relative distance Earth-Sun — Eq. 3.16. */
export function inverseRelativeDistance(dayOfYear: number): number {
  return 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
}

/** Solar declination, rad — Eq. 3.17. */
export function solarDeclination(dayOfYear: number): number {
  return 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
}

/**
 * Sunset hour angle, rad — Eq. 3.18.
 *
 * The argument is clamped to [-1, 1]: at high latitudes around the solstices
 * -tan(φ)tan(δ) leaves the domain of arccos, which is polar day or night.
 */
export function sunsetHourAngle(latitudeRad: number, declinationRad: number): number {
  const x = -Math.tan(latitudeRad) * Math.tan(declinationRad);
  return Math.acos(Math.max(-1, Math.min(1, x)));
}

/** Daylight hours — Eq. 3.19. */
export function daylightHours(sunsetAngleRad: number): number {
  return (24 / Math.PI) * sunsetAngleRad;
}

/**
 * Extraterrestrial radiation — Eq. 3.14.
 *
 * @param latitudeDeg latitude, decimal degrees (positive north)
 * @param dayOfYear   1–366
 * @returns MJ m⁻² day⁻¹
 */
export function extraterrestrialRadiation(latitudeDeg: number, dayOfYear: number): number {
  const phi = toRadians(latitudeDeg);
  const dr = inverseRelativeDistance(dayOfYear);
  const decl = solarDeclination(dayOfYear);
  const ws = sunsetHourAngle(phi, decl);
  return (
    ((24 * 60) / Math.PI) *
    SOLAR_CONSTANT *
    dr *
    (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws))
  );
}

/**
 * Solar radiation from relative sunshine duration — Eq. 3.20 (Ångström).
 *
 * @param relativeSunshine n/N, the fraction of daylight hours with sunshine
 */
export function solarRadiationFromSunshine(
  relativeSunshine: number,
  ra: number,
  as = ANGSTROM_AS,
  bs = ANGSTROM_BS,
): number {
  return (as + bs * relativeSunshine) * ra;
}

/**
 * Solar radiation from the temperature range — Eq. 3.26 (adjusted Hargreaves).
 *
 * The fallback when neither measured radiation nor sunshine hours exist.
 *
 * @param kRs 0.16 inland, 0.19 coastal
 */
export function solarRadiationFromTemperature(
  tminC: number,
  tmaxC: number,
  ra: number,
  kRs = 0.16,
): number {
  return kRs * Math.sqrt(Math.max(0, tmaxC - tminC)) * ra;
}

/**
 * Clear-sky solar radiation, adjusted for station elevation — Eq. 3.21.
 */
export function clearSkyRadiation(ra: number, elevationM: number): number {
  return (0.75 + 2e-5 * elevationM) * ra;
}

/**
 * Clear-sky solar radiation from calibrated Ångström coefficients — Eq. 3.22.
 */
export function clearSkyRadiationFromAngstrom(
  ra: number,
  as = ANGSTROM_AS,
  bs = ANGSTROM_BS,
): number {
  return (as + bs) * ra;
}

/** Net shortwave radiation — Eq. 3.23. */
export function netShortwaveRadiation(rs: number, albedo = ALBEDO): number {
  return (1 - albedo) * rs;
}

/**
 * Net longwave radiation — Eq. 3.24.
 *
 * Rs/Rso is the relative shortwave radiation and the manual limits it to 1.0;
 * measured radiation slightly above the clear-sky estimate would otherwise
 * drive the cloudiness term above unity.
 *
 * @param tminC minimum air temperature, °C
 * @param tmaxC maximum air temperature, °C
 * @param ea    actual vapour pressure, kPa
 * @param rs    measured or calculated solar radiation
 * @param rso   clear-sky radiation
 */
export function netLongwaveRadiation(
  tminC: number,
  tmaxC: number,
  ea: number,
  rs: number,
  rso: number,
): number {
  const tmaxK4 = (tmaxC + 273.16) ** 4;
  const tminK4 = (tminC + 273.16) ** 4;
  const relative = rso > 0 ? Math.min(1, rs / rso) : 1;
  return (
    STEFAN_BOLTZMANN *
    ((tmaxK4 + tminK4) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) *
    (1.35 * relative - 0.35)
  );
}

/** Net radiation — Eq. 3.25. */
export function netRadiation(rns: number, rnl: number): number {
  return rns - rnl;
}

/* ── §3.5 Wind speed ─────────────────────────────────────────────────── */

/**
 * Wind speed adjusted to the standard height of 2 m — Eq. 3.27.
 *
 * @param uz            measured wind speed, m s⁻¹
 * @param measurementM  height of the instrument above ground, m
 */
export function windSpeedAt2m(uz: number, measurementM: number): number {
  if (measurementM === 2) return uz;
  return uz * (4.87 / Math.log(67.8 * measurementM - 5.42));
}

/* ── §3.6 Reference evapotranspiration ───────────────────────────────── */

/**
 * FAO Penman-Monteith reference evapotranspiration — Eq. 3.28.
 *
 *            0.408 Δ (Rn - G) + γ (900 / (T + 273)) u₂ (es - ea)
 *   ET₀  =  ───────────────────────────────────────────────────────
 *                        Δ + γ (1 + 0.34 u₂)
 *
 * The 0.408 converts net radiation in MJ m⁻² day⁻¹ to equivalent evaporation
 * in mm day⁻¹. Soil heat flux G is zero: the manual ignores it for daily and
 * ten-daily steps, because beneath the grass reference surface it is small
 * against Rn over periods of 24 hours or longer (Allen et al., 1989).
 *
 * @returns mm day⁻¹
 */
export function referenceEvapotranspiration(input: {
  /** Slope of the saturation vapour pressure curve, kPa °C⁻¹ */
  delta: number;
  /** Net radiation, MJ m⁻² day⁻¹ */
  rn: number;
  /** Soil heat flux density, MJ m⁻² day⁻¹ — zero for daily steps */
  g?: number;
  /** Psychrometric constant, kPa °C⁻¹ */
  gamma: number;
  /** Mean daily air temperature at 2 m, °C */
  tmeanC: number;
  /** Wind speed at 2 m, m s⁻¹ */
  u2: number;
  /** Saturation vapour pressure, kPa */
  es: number;
  /** Actual vapour pressure, kPa */
  ea: number;
}): number {
  const { delta, rn, g = 0, gamma, tmeanC, u2, es, ea } = input;
  const numerator =
    0.408 * delta * (rn - g) + gamma * (900 / (tmeanC + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);
  return numerator / denominator;
}

/* ── The whole chain, for a day of station observations ──────────────── */

export interface DailyObservation {
  /** Day of year, 1–366 */
  dayOfYear: number;
  tminC: number;
  tmaxC: number;
  /** Mean relative humidity, % */
  rhMean: number;
  /** Measured solar radiation, MJ m⁻² day⁻¹ */
  solarRadiation: number;
  /** Wind speed, m s⁻¹ */
  wind: number;
  /** Height of the wind instrument, m — the workbooks measure at 2 m */
  windHeightM?: number;
}

export interface Site {
  /** Latitude, decimal degrees, positive north */
  latitudeDeg: number;
  /** Elevation above sea level, m */
  elevationM: number;
}

/** Every intermediate the chapter defines, kept so the result can be audited. */
export interface EtoBreakdown {
  pressure: number;
  gamma: number;
  tmeanC: number;
  es: number;
  ea: number;
  delta: number;
  ra: number;
  rso: number;
  rns: number;
  rnl: number;
  rn: number;
  u2: number;
  eto: number;
}

/**
 * Runs §3.1 → §3.6 for one day and returns ET₀ with every intermediate.
 *
 * This is the path taken for the station workbooks, which carry Tmin, Tmax,
 * mean RH, measured solar radiation and wind at 2 m. With that set none of
 * the chapter's estimation rules are needed: radiation is measured, so
 * Eq. 3.20 and the Hargreaves fallback (Eq. 3.26) do not apply, and humidity
 * is specified, so ea follows Eq. 3.12 directly.
 */
export function computeEto(obs: DailyObservation, site: Site): EtoBreakdown {
  // §3.1
  const pressure = atmosphericPressure(site.elevationM);
  const gamma = psychrometricConstant(pressure);

  // §3.2
  const tmeanC = meanAirTemperature(obs.tminC, obs.tmaxC);

  // §3.3
  const es = meanSaturationVapourPressure(obs.tminC, obs.tmaxC);
  const ea = vapourPressureFromRhMean(tmeanC, obs.rhMean);
  const delta = slopeSaturationVapourPressure(tmeanC);

  // §3.4
  const ra = extraterrestrialRadiation(site.latitudeDeg, obs.dayOfYear);
  const rso = clearSkyRadiation(ra, site.elevationM);
  const rns = netShortwaveRadiation(obs.solarRadiation);
  const rnl = netLongwaveRadiation(obs.tminC, obs.tmaxC, ea, obs.solarRadiation, rso);
  const rn = netRadiation(rns, rnl);

  // §3.5
  const u2 = windSpeedAt2m(obs.wind, obs.windHeightM ?? 2);

  // §3.6
  const eto = referenceEvapotranspiration({ delta, rn, gamma, tmeanC, u2, es, ea });

  return { pressure, gamma, tmeanC, es, ea, delta, ra, rso, rns, rnl, rn, u2, eto };
}

/** Day of year, 1–366, from an ISO date string. */
export function dayOfYear(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}
