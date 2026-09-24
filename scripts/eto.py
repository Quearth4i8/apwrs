"""
FAO Penman-Monteith reference evapotranspiration (ET0), in Python.

A standalone port of lib/eto.ts, following Chapter 3 ("Calculation
procedures") of the ETo Calculator Reference Manual V3.2 (FAO, September
2012) -- the PDF in `formlas and data/`. The methods are those of FAO
Irrigation and Drainage Paper 56 (Allen et al., 1998).

One function per numbered equation, named for the quantity it returns and
annotated with its equation number, so it reads side by side with the manual:

    3.1  atmospheric pressure, psychrometric constant
    3.2  air temperature
    3.3  air humidity     (saturation / actual vapour pressure, curve slope)
    3.4  radiation        (extraterrestrial -> clear-sky -> net)
    3.5  wind speed       (adjustment to 2 m)
    3.6  ET0              (eq. 3.28)

Standard metric units throughout: temperature degC, pressure kPa, radiation
MJ m-2 day-1, wind m s-1, ET0 mm day-1.

Only the standard library is used, so this runs anywhere:

    python scripts/eto.py            # runs the FAO-56 worked examples
    python scripts/eto.py --demo     # one worked day, every intermediate

Usage as a module:

    from eto import compute_eto, DailyObservation, Site
    r = compute_eto(
        DailyObservation(day_of_year=1, tmin_c=12.8, tmax_c=17.6,
                         rh_mean=86.2, solar_radiation=6.54, wind=3.40),
        Site(latitude_deg=37.010, elevation_m=20),
    )
    print(r.eto)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

# ---------------------------------------------------------------- constants

SOLAR_CONSTANT = 0.0820       # MJ m-2 min-1   (3.4, eq. 3.14)
STEFAN_BOLTZMANN = 4.903e-9   # MJ K-4 m-2 d-1 (3.4, eq. 3.24)
ALBEDO = 0.23                 # grass reference crop (3.4, eq. 3.23)

# The manual fixes latent heat at 2.45 (the value for about 20 degC) rather
# than varying it with temperature, "to correspond with the calculation
# procedure for the FAO Penman-Monteith equation" (3.1).
LATENT_HEAT = 2.45            # MJ kg-1
SPECIFIC_HEAT = 1.013e-3      # MJ kg-1 degC-1
EPSILON = 0.622               # molecular weight water vapour / dry air

ANGSTROM_AS = 0.25            # (3.4, eq. 3.20)
ANGSTROM_BS = 0.50


# ------------------------------------------------- 3.1 atmospheric parameters

def atmospheric_pressure(elevation_m: float) -> float:
    """Atmospheric pressure, kPa -- eq. 3.1."""
    return 101.3 * ((293 - 0.0065 * elevation_m) / 293) ** 5.26


def psychrometric_constant(pressure_kpa: float) -> float:
    """Psychrometric constant, kPa degC-1 -- eq. 3.2.

    gamma = (cp * P) / (epsilon * lambda), which with the manual's fixed
    constants reduces to 0.664742e-3 * P.
    """
    return (SPECIFIC_HEAT * pressure_kpa) / (EPSILON * LATENT_HEAT)


# ------------------------------------------------------- 3.2 air temperature

def mean_air_temperature(tmin_c: float, tmax_c: float) -> float:
    """Mean air temperature, degC -- eq. 3.3."""
    return (tmax_c + tmin_c) / 2


# ---------------------------------------------------------- 3.3 air humidity

def saturation_vapour_pressure(t_c: float) -> float:
    """Saturation vapour pressure at air temperature T, kPa -- eq. 3.4."""
    return 0.6108 * math.exp((17.27 * t_c) / (t_c + 237.3))


def mean_saturation_vapour_pressure(tmin_c: float, tmax_c: float) -> float:
    """Mean saturation vapour pressure over a day, kPa -- eq. 3.5.

    The mean of e0(Tmax) and e0(Tmin), not e0(Tmean): eq. 3.4 is non-linear,
    so using the mean temperature would understate it.
    """
    return (saturation_vapour_pressure(tmax_c) + saturation_vapour_pressure(tmin_c)) / 2


def slope_saturation_vapour_pressure(t_c: float) -> float:
    """Slope of the saturation vapour pressure curve, kPa degC-1 -- eq. 3.6."""
    return (4098 * saturation_vapour_pressure(t_c)) / (t_c + 237.3) ** 2


def vapour_pressure_from_dewpoint(tdew_c: float) -> float:
    """Actual vapour pressure from dewpoint, kPa -- eq. 3.7."""
    return saturation_vapour_pressure(tdew_c)


def vapour_pressure_from_rh_max_min(
    tmin_c: float, tmax_c: float, rh_max: float, rh_min: float
) -> float:
    """Actual vapour pressure from RHmax and RHmin, kPa -- eq. 3.10."""
    return (
        saturation_vapour_pressure(tmin_c) * (rh_max / 100)
        + saturation_vapour_pressure(tmax_c) * (rh_min / 100)
    ) / 2


def vapour_pressure_from_rh_max(tmin_c: float, rh_max: float) -> float:
    """Actual vapour pressure from RHmax alone, kPa -- eq. 3.11."""
    return saturation_vapour_pressure(tmin_c) * (rh_max / 100)


def vapour_pressure_from_rh_mean(tmean_c: float, rh_mean: float) -> float:
    """Actual vapour pressure from mean RH, kPa -- eq. 3.12 (Smith, 1992).

    The manual notes this deliberately differs from the equation in I&D Paper
    56: across several climatic data sets eq. 3.12 gives more accurate
    estimates of ea when only mean RH is available. That is the case for the
    station workbooks here, which carry a single relative_humidity column, so
    this is the route the pipeline uses.
    """
    return saturation_vapour_pressure(tmean_c) * (rh_mean / 100)


# -------------------------------------------------------------- 3.4 radiation

def to_radians(decimal_degrees: float) -> float:
    """Degrees to radians -- eq. 3.15."""
    return (math.pi / 180) * decimal_degrees


def inverse_relative_distance(day_of_year: int) -> float:
    """Inverse relative distance Earth-Sun -- eq. 3.16."""
    return 1 + 0.033 * math.cos((2 * math.pi * day_of_year) / 365)


def solar_declination(day_of_year: int) -> float:
    """Solar declination, rad -- eq. 3.17."""
    return 0.409 * math.sin((2 * math.pi * day_of_year) / 365 - 1.39)


def sunset_hour_angle(latitude_rad: float, declination_rad: float) -> float:
    """Sunset hour angle, rad -- eq. 3.18.

    The argument is clamped to [-1, 1]: at high latitudes near the solstices
    -tan(phi)tan(delta) leaves the domain of arccos, which is polar day/night.
    """
    x = -math.tan(latitude_rad) * math.tan(declination_rad)
    return math.acos(max(-1.0, min(1.0, x)))


def daylight_hours(sunset_angle_rad: float) -> float:
    """Daylight hours N -- eq. 3.19."""
    return (24 / math.pi) * sunset_angle_rad


def extraterrestrial_radiation(latitude_deg: float, day_of_year: int) -> float:
    """Extraterrestrial radiation Ra, MJ m-2 d-1 -- eq. 3.14."""
    phi = to_radians(latitude_deg)
    dr = inverse_relative_distance(day_of_year)
    decl = solar_declination(day_of_year)
    ws = sunset_hour_angle(phi, decl)
    return (
        ((24 * 60) / math.pi)
        * SOLAR_CONSTANT
        * dr
        * (
            ws * math.sin(phi) * math.sin(decl)
            + math.cos(phi) * math.cos(decl) * math.sin(ws)
        )
    )


def solar_radiation_from_sunshine(
    relative_sunshine: float, ra: float, a_s: float = ANGSTROM_AS, b_s: float = ANGSTROM_BS
) -> float:
    """Solar radiation from relative sunshine duration n/N -- eq. 3.20."""
    return (a_s + b_s * relative_sunshine) * ra


def solar_radiation_from_temperature(
    tmin_c: float, tmax_c: float, ra: float, k_rs: float = 0.16
) -> float:
    """Solar radiation from the temperature range -- eq. 3.26 (Hargreaves).

    The fallback when neither measured radiation nor sunshine hours exist.
    k_rs is 0.16 for interior locations, 0.19 for coastal ones.
    """
    return k_rs * math.sqrt(max(0.0, tmax_c - tmin_c)) * ra


def clear_sky_radiation(ra: float, elevation_m: float) -> float:
    """Clear-sky radiation adjusted for station elevation -- eq. 3.21."""
    return (0.75 + 2e-5 * elevation_m) * ra


def clear_sky_radiation_from_angstrom(
    ra: float, a_s: float = ANGSTROM_AS, b_s: float = ANGSTROM_BS
) -> float:
    """Clear-sky radiation from calibrated Angstrom coefficients -- eq. 3.22."""
    return (a_s + b_s) * ra


def net_shortwave_radiation(rs: float, albedo: float = ALBEDO) -> float:
    """Net shortwave radiation Rns -- eq. 3.23."""
    return (1 - albedo) * rs


def net_longwave_radiation(
    tmin_c: float, tmax_c: float, ea: float, rs: float, rso: float
) -> float:
    """Net longwave radiation Rnl -- eq. 3.24.

    Rs/Rso is the relative shortwave radiation and the manual limits it to
    1.0; measured radiation slightly above the clear-sky estimate would
    otherwise push the cloudiness term above unity.
    """
    tmax_k4 = (tmax_c + 273.16) ** 4
    tmin_k4 = (tmin_c + 273.16) ** 4
    relative = min(1.0, rs / rso) if rso > 0 else 1.0
    return (
        STEFAN_BOLTZMANN
        * ((tmax_k4 + tmin_k4) / 2)
        * (0.34 - 0.14 * math.sqrt(max(0.0, ea)))
        * (1.35 * relative - 0.35)
    )


def net_radiation(rns: float, rnl: float) -> float:
    """Net radiation Rn -- eq. 3.25."""
    return rns - rnl


# ------------------------------------------------------------- 3.5 wind speed

def wind_speed_at_2m(uz: float, measurement_m: float) -> float:
    """Wind speed adjusted to the standard 2 m height -- eq. 3.27."""
    if measurement_m == 2:
        return uz
    return uz * (4.87 / math.log(67.8 * measurement_m - 5.42))


# --------------------------------------------- 3.6 reference evapotranspiration

def reference_evapotranspiration(
    delta: float,
    rn: float,
    gamma: float,
    tmean_c: float,
    u2: float,
    es: float,
    ea: float,
    g: float = 0.0,
) -> float:
    """FAO Penman-Monteith ET0, mm day-1 -- eq. 3.28.

               0.408 D (Rn - G) + gamma (900 / (T + 273)) u2 (es - ea)
      ET0  =  --------------------------------------------------------
                          D + gamma (1 + 0.34 u2)

    The 0.408 converts net radiation in MJ m-2 d-1 to equivalent evaporation
    in mm d-1. Soil heat flux G is zero: the manual ignores it for daily and
    ten-daily steps, because beneath the grass reference surface it is small
    against Rn over 24 hours or longer (Allen et al., 1989).
    """
    numerator = 0.408 * delta * (rn - g) + gamma * (900 / (tmean_c + 273)) * u2 * (es - ea)
    denominator = delta + gamma * (1 + 0.34 * u2)
    return numerator / denominator


# --------------------------------------------------------------- the whole chain

@dataclass
class DailyObservation:
    day_of_year: int          # 1-366
    tmin_c: float
    tmax_c: float
    rh_mean: float            # %
    solar_radiation: float    # MJ m-2 d-1, measured
    wind: float               # m s-1
    wind_height_m: float = 2.0


@dataclass
class Site:
    latitude_deg: float       # positive north
    elevation_m: float


@dataclass
class EtoBreakdown:
    """ET0 with every intermediate, so a result can be audited step by step."""
    pressure: float
    gamma: float
    tmean_c: float
    es: float
    ea: float
    delta: float
    ra: float
    rso: float
    rns: float
    rnl: float
    rn: float
    u2: float
    eto: float


def compute_eto(obs: DailyObservation, site: Site) -> EtoBreakdown:
    """Runs 3.1 -> 3.6 for one day.

    This is the path for station data carrying Tmin, Tmax, mean RH, measured
    solar radiation and wind. With that set none of the chapter's estimation
    rules apply: radiation is measured, so eq. 3.20 and the Hargreaves
    fallback are not needed, and humidity is specified, so ea follows
    eq. 3.12 directly.
    """
    # 3.1
    pressure = atmospheric_pressure(site.elevation_m)
    gamma = psychrometric_constant(pressure)

    # 3.2
    tmean_c = mean_air_temperature(obs.tmin_c, obs.tmax_c)

    # 3.3
    es = mean_saturation_vapour_pressure(obs.tmin_c, obs.tmax_c)
    ea = vapour_pressure_from_rh_mean(tmean_c, obs.rh_mean)
    delta = slope_saturation_vapour_pressure(tmean_c)

    # 3.4
    ra = extraterrestrial_radiation(site.latitude_deg, obs.day_of_year)
    rso = clear_sky_radiation(ra, site.elevation_m)
    rns = net_shortwave_radiation(obs.solar_radiation)
    rnl = net_longwave_radiation(obs.tmin_c, obs.tmax_c, ea, obs.solar_radiation, rso)
    rn = net_radiation(rns, rnl)

    # 3.5
    u2 = wind_speed_at_2m(obs.wind, obs.wind_height_m)

    # 3.6
    eto = reference_evapotranspiration(delta, rn, gamma, tmean_c, u2, es, ea)

    return EtoBreakdown(pressure, gamma, tmean_c, es, ea, delta, ra, rso, rns, rnl, rn, u2, eto)


def day_of_year(iso_date: str) -> int:
    """Day of year, 1-366, from an ISO date string."""
    d = date.fromisoformat(iso_date[:10])
    return d.timetuple().tm_yday


# ------------------------------------------------------------------- self-test

def _check(label: str, got: float, want: float, tol: float) -> bool:
    ok = abs(got - want) <= tol
    print(f"  {'PASS' if ok else 'FAIL'}  {label:<44} got {got:>10.4f}   want {want}")
    return ok


def _self_test() -> int:
    """Checks each equation on its own against FAO-56's published examples.

    Separately, so a compensating pair of errors cannot hide inside ET0.
    """
    print("\nFAO-56 worked examples\n")
    ok = [
        # Example 2 -- pressure and psychrometric constant at 1800 m.
        _check("eq 3.1  P at z=1800 m [kPa]", atmospheric_pressure(1800), 81.8, 0.05),
        _check("eq 3.2  gamma at z=1800 m [kPa/degC]",
               psychrometric_constant(atmospheric_pressure(1800)), 0.054, 5e-4),
        # Example 3 -- saturation vapour pressure, Tmin 15 / Tmax 24.5.
        _check("eq 3.4  e0(24.5 degC) [kPa]", saturation_vapour_pressure(24.5), 3.075, 1e-3),
        _check("eq 3.4  e0(15.0 degC) [kPa]", saturation_vapour_pressure(15), 1.705, 1e-3),
        _check("eq 3.5  es [kPa]", mean_saturation_vapour_pressure(15, 24.5), 2.39, 1e-3),
        # Annex 2, Table 2.4 -- slope at 30 degC.
        _check("eq 3.6  slope at 30 degC [kPa/degC]",
               slope_saturation_vapour_pressure(30), 0.243, 5e-4),
        # Example 5 -- ea from RHmax/RHmin.
        _check("eq 3.10 ea from RHmax/RHmin [kPa]",
               vapour_pressure_from_rh_max_min(18, 25, 82, 54), 1.70, 5e-3),
        # Example 8 -- extraterrestrial radiation, 3 September at 20 degS.
        _check("eq 3.14 Ra at 20S, 3 Sep [MJ/m2/d]",
               extraterrestrial_radiation(-20, 246), 32.2, 0.05),
        _check("eq 3.17 solar declination [rad]", solar_declination(246), 0.120, 1e-3),
        _check("eq 3.18 sunset hour angle [rad]",
               sunset_hour_angle(to_radians(-20), solar_declination(246)), 1.527, 1e-3),
        _check("eq 3.19 daylight hours N [h]",
               daylight_hours(sunset_hour_angle(to_radians(-20), solar_declination(246))),
               11.66, 0.01),
        # Example 10 -- net longwave, Rio de Janeiro, May.
        _check("eq 3.24 Rnl [MJ/m2/d]",
               net_longwave_radiation(19.1, 25.1, 2.1, 14.5, 18.8), 3.5, 0.05),
        # Example 11 -- FAO prints 11.1; 0.77 x 14.5 is exactly 11.165.
        _check("eq 3.23 Rns [MJ/m2/d]", net_shortwave_radiation(14.5), 11.1, 0.07),
        # Example 14 -- FAO prints 2.4 to 1 dp; the exact value is 2.3934.
        _check("eq 3.27 u2 from 10 m [m/s]", wind_speed_at_2m(3.2, 10), 2.4, 0.01),
    ]
    failures = ok.count(False)
    print(f"\n{'ALL CHECKS PASSED' if not failures else f'{failures} CHECK(S) FAILED'}\n")
    return failures


def _demo() -> None:
    """One real day, every intermediate: Ichkeul, 1 January 1996."""
    obs = DailyObservation(
        day_of_year=day_of_year("1996-01-01"),
        tmin_c=12.8, tmax_c=17.6, rh_mean=86.2, solar_radiation=6.54, wind=3.40,
    )
    site = Site(latitude_deg=37.010, elevation_m=20)
    r = compute_eto(obs, site)
    print("\nIchkeul, 1 January 1996  (lat 37.010 N, alt 20 m)\n")
    print(f"  inputs   Tmin {obs.tmin_c} degC   Tmax {obs.tmax_c} degC   RH {obs.rh_mean} %")
    print(f"           Rs {obs.solar_radiation} MJ/m2   u {obs.wind} m/s\n")
    for name, value, unit in [
        ("P      (3.1)", r.pressure, "kPa"),
        ("gamma  (3.2)", r.gamma, "kPa/degC"),
        ("Tmean  (3.3)", r.tmean_c, "degC"),
        ("es     (3.5)", r.es, "kPa"),
        ("ea     (3.12)", r.ea, "kPa"),
        ("delta  (3.6)", r.delta, "kPa/degC"),
        ("Ra     (3.14)", r.ra, "MJ/m2/d"),
        ("Rso    (3.21)", r.rso, "MJ/m2/d"),
        ("Rns    (3.23)", r.rns, "MJ/m2/d"),
        ("Rnl    (3.24)", r.rnl, "MJ/m2/d"),
        ("Rn     (3.25)", r.rn, "MJ/m2/d"),
        ("u2     (3.27)", r.u2, "m/s"),
    ]:
        print(f"  {name:<14} {value:>10.4f}  {unit}")
    print(f"\n  ET0    (3.28) {r.eto:>10.4f}  mm/day\n")


if __name__ == "__main__":
    import sys

    if "--demo" in sys.argv:
        _demo()
        raise SystemExit(0)
    raise SystemExit(_self_test())
