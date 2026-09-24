/**
 * Drought indices.
 *
 * SPEI follows the reference implementation in `formlas and data/indice spei.txt`:
 * a monthly climatic water balance D = P − ET₀, accumulated over the chosen
 * scale, then fitted per calendar month to a 3-parameter log-logistic
 * distribution by probability-weighted moments, and mapped through the
 * standard normal quantile function.
 *
 * SPI is the same idea on precipitation alone, fitted to a 2-parameter gamma
 * with an atom of probability at zero (Thom 1958 / Edwards & McKee 1997).
 *
 * The numbers this produces are verified against the Python reference in
 * scripts/verify-drought.ts.
 */

/* ── Special functions ───────────────────────────────────────────────── */

const LANCZOS_G = 7;
const LANCZOS_P = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Gamma function, Lanczos approximation (matches scipy.special.gamma to ~1e-14). */
export function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  let x = LANCZOS_P[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) x += LANCZOS_P[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** log Γ(z), for the gamma-distribution fit. */
export function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = LANCZOS_P[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) x += LANCZOS_P[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Standard normal quantile function — Wichura's AS241 PPND16, accurate to
 * about 1e-16, so it reproduces scipy.stats.norm.ppf to printed precision.
 */
export function normPpf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const q = p - 0.5;
  let r: number;

  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q;
    return (
      (q *
        (((((((2509.0809287301226727 * r + 33430.575583588128105) * r + 67265.770927008700853) * r +
          45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r +
          133.14166789178437745) * r + 3.387132872796366608)) /
      (((((((5226.495278852854561 * r + 28729.085735721942674) * r + 39307.89580009271061) * r +
        21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r +
        42.313330701600911252) * r + 1)
    );
  }

  r = q < 0 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));
  let val: number;

  if (r <= 5) {
    r -= 1.6;
    val =
      (((((((7.7454501427834140764e-4 * r + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
        1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r +
        4.6303378461565452959) * r + 1.42343711074968357734) /
      (((((((1.05075007164441684324e-9 * r + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
        0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r +
        2.05319162663775882187) * r + 1);
  } else {
    r -= 5;
    val =
      (((((((2.01033439929228813265e-7 * r + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
        0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r +
        5.4637849111641143699) * r + 6.6579046435011037772) /
      (((((((2.04426310338993978564e-15 * r + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
        7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r +
        0.59983220655588793769) * r + 1);
  }

  return q < 0 ? -val : val;
}

/* ── Log-logistic fit by probability-weighted moments ────────────────── */

export interface LogLogisticParams {
  alpha: number;
  beta: number;
  gamma: number;
}

/**
 * Fits a 3-parameter log-logistic distribution by PWM, exactly as the
 * reference `fit_loglogistic` does: plotting position (i − 0.35) / n.
 */
export function fitLogLogistic(values: readonly number[]): LogLogisticParams {
  const x = [...values].sort((a, b) => a - b);
  const n = x.length;

  let w0 = 0;
  let w1 = 0;
  let w2 = 0;
  for (let i = 0; i < n; i++) {
    const F = (i + 1 - 0.35) / n;
    w0 += x[i];
    w1 += (1 - F) * x[i];
    w2 += (1 - F) * (1 - F) * x[i];
  }
  w0 /= n;
  w1 /= n;
  w2 /= n;

  const beta = (2 * w1 - w0) / (6 * w1 - w0 - 6 * w2);
  const g1 = gammaFn(1 + 1 / beta);
  const g2 = gammaFn(1 - 1 / beta);
  const alpha = ((w0 - 2 * w1) * beta) / (g1 * g2);
  const gamma = w0 - alpha * g1 * g2;

  return { alpha, beta, gamma };
}

/* ── SPEI ────────────────────────────────────────────────────────────── */

/** A monthly value tagged with its calendar month (1–12). */
export interface MonthlyPoint {
  year: number;
  month: number;
  value: number | null;
}

/** Rolling sum over `scale` months; null until the window is full. */
export function accumulate(series: readonly MonthlyPoint[], scale: number): MonthlyPoint[] {
  return series.map((p, i) => {
    if (i < scale - 1) return { ...p, value: null };
    let sum = 0;
    for (let k = 0; k < scale; k++) {
      const v = series[i - k].value;
      if (v == null || !Number.isFinite(v)) return { ...p, value: null };
      sum += v;
    }
    return { ...p, value: sum };
  });
}

/**
 * SPEI for an accumulated water-balance series. Each calendar month is fitted
 * independently, which is what removes the seasonal cycle; months with fewer
 * than `minPoints` years are left null rather than fitted unreliably.
 */
export function computeSpei(accumulated: readonly MonthlyPoint[], minPoints = 10): MonthlyPoint[] {
  const out: MonthlyPoint[] = accumulated.map((p) => ({ ...p, value: null }));

  for (let m = 1; m <= 12; m++) {
    const idx = accumulated.map((p, i) => ({ p, i })).filter(({ p }) => p.month === m);
    const data = idx.map(({ p }) => p.value).filter((v): v is number => v != null && Number.isFinite(v));
    if (data.length < minPoints) continue;

    const { alpha, beta, gamma } = fitLogLogistic(data);
    if (!(alpha > 0) || !Number.isFinite(alpha)) continue;

    for (const { p, i } of idx) {
      if (p.value == null || !Number.isFinite(p.value)) continue;
      const diff = p.value - gamma;
      if (!(diff > 0)) continue; // matches the reference's np.where(diff > 0, …, nan)
      let F = 1 / (1 + Math.pow(alpha / diff, beta));
      F = Math.min(Math.max(F, 1e-6), 1 - 1e-6);
      out[i].value = normPpf(F);
    }
  }

  return out;
}

/* ── SPI ─────────────────────────────────────────────────────────────── */

/**
 * Two-parameter gamma fitted by Thom's maximum-likelihood approximation.
 * Months with no rain at all are handled by the mixed distribution below.
 */
function fitGamma(values: readonly number[]): { shape: number; scale: number } {
  const positive = values.filter((v) => v > 0);
  const n = positive.length;
  const mean = positive.reduce((a, b) => a + b, 0) / n;
  const meanLog = positive.reduce((a, b) => a + Math.log(b), 0) / n;
  const A = Math.log(mean) - meanLog;
  const shape = (1 + Math.sqrt(1 + (4 * A) / 3)) / (4 * A);
  return { shape, scale: mean / shape };
}

/** Regularised lower incomplete gamma P(a, x), series + continued fraction. */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Continued fraction for Q(a, x), then P = 1 − Q.
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** SPI for an accumulated precipitation series, fitted per calendar month. */
export function computeSpi(accumulated: readonly MonthlyPoint[], minPoints = 10): MonthlyPoint[] {
  const out: MonthlyPoint[] = accumulated.map((p) => ({ ...p, value: null }));

  for (let m = 1; m <= 12; m++) {
    const idx = accumulated.map((p, i) => ({ p, i })).filter(({ p }) => p.month === m);
    const data = idx.map(({ p }) => p.value).filter((v): v is number => v != null && Number.isFinite(v));
    if (data.length < minPoints) continue;

    const zeros = data.filter((v) => v <= 0).length;
    const q = zeros / data.length; // probability of zero precipitation
    if (data.length - zeros < 3) continue;

    const { shape, scale } = fitGamma(data);
    if (!Number.isFinite(shape) || shape <= 0) continue;

    for (const { p, i } of idx) {
      if (p.value == null || !Number.isFinite(p.value)) continue;
      const G = p.value > 0 ? gammaP(shape, p.value / scale) : 0;
      let F = q + (1 - q) * G;
      F = Math.min(Math.max(F, 1e-6), 1 - 1e-6);
      out[i].value = normPpf(F);
    }
  }

  return out;
}

/* ── Entropy weight method ───────────────────────────────────────────── */

export type FactorDirection = "positive" | "negative";

export interface Factor {
  key: string;
  /**
   * "positive" — higher raw value means wetter/healthier (NDVI, soil moisture);
   * "negative" — higher raw value means drier (LST, PET).
   * Both are normalised so that 1 = best conditions, per eq. (4).
   */
  direction: FactorDirection;
  values: readonly (number | null)[];
}

export interface EntropyResult {
  weights: Record<string, number>;
  entropy: Record<string, number>;
  /** Composite condition index per cell, 0 (worst) – 1 (best). */
  composite: (number | null)[];
}

/**
 * The entropy weight method from `entroy_weight_method.png`.
 *
 * Each factor is min–max normalised by direction (eq. 4), turned into a
 * distribution over cells, and scored by information entropy (eq. 5); a
 * factor whose values are more dispersed carries more information and so
 * earns a larger weight (eq. 6). This removes the analyst's thumb from the
 * scale — the weights come out of the data.
 *
 * Note on eq. (5): the proportion is normalised over the m×n cells for each
 * factor, which is what makes H fall in [0, 1] and eq. (6) well-posed.
 */
export function entropyWeights(factors: readonly Factor[]): EntropyResult {
  const K = factors.length;
  const n = factors[0]?.values.length ?? 0;

  // (4) direction-aware min–max normalisation
  const normalised = factors.map((f) => {
    const finite = f.values.filter((v): v is number => v != null && Number.isFinite(v));
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = max - min;
    return f.values.map((v) => {
      if (v == null || !Number.isFinite(v)) return null;
      if (span === 0) return 0.5;
      return f.direction === "positive" ? (v - min) / span : (max - v) / span;
    });
  });

  const entropy: Record<string, number> = {};
  const rawWeights: number[] = [];

  factors.forEach((f, k) => {
    const col = normalised[k];
    // Eq. (5) prints p(i,j,k) = r(i,j,k) / Σ_{k=1..4} r(i,j,k), i.e. normalised
    // across the four factors at each pixel. Taken literally that cannot be
    // right: p would then sum to 1 per pixel rather than per factor, H_k comes
    // out around 17 on a 320-cell grid instead of inside [0, 1], and eq. (6)'s
    // denominator K − ΣH goes negative. Normalising over positions is what
    // makes H a proper normalised entropy and the standard form of the method,
    // so the subscript is read as a typo for Σ over (i, j).
    const total = col.reduce((a: number, v) => a + (v ?? 0), 0);
    let H = 0;
    if (total > 0) {
      for (const v of col) {
        if (v == null) continue;
        const p = v / total;
        if (p > 0) H += p * Math.log(p); // p·ln p → 0 as p → 0, per the paper
      }
      H = -H / Math.log(n);
    }
    entropy[f.key] = H;
    rawWeights.push(1 - H);
  });

  // (6) ω_k = (1 − H_k) / (K − Σ H_k)
  const denom = rawWeights.reduce((a, b) => a + b, 0);
  const weights: Record<string, number> = {};
  factors.forEach((f, k) => {
    weights[f.key] = denom > 0 ? rawWeights[k] / denom : 1 / K;
  });

  const composite = Array.from({ length: n }, (_, i) => {
    let sum = 0;
    let used = 0;
    factors.forEach((f, k) => {
      const v = normalised[k][i];
      if (v == null) return;
      sum += weights[f.key] * v;
      used += weights[f.key];
    });
    return used > 0 ? sum / used : null;
  });

  return { weights, entropy, composite };
}

/** The composite condition index reads as drought risk on the app's 0–100 scale. */
export function compositeToRisk(composite: number | null): number | null {
  return composite == null ? null : Math.round((1 - composite) * 100);
}
