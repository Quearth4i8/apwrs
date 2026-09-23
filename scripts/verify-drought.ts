/**
 * Checks the TypeScript drought maths against the Python reference in
 * `formlas and data/indice spei.txt`. Both are fed the identical monthly
 * water balance, so any divergence is the port's fault, not the data's.
 *
 *   npx tsx scripts/verify-drought.ts
 */
import { readFileSync } from "node:fs";
import { accumulate, computeSpei, fitLogLogistic, gammaFn, normPpf, type MonthlyPoint } from "../lib/drought";

const balance: MonthlyPoint[] = JSON.parse(readFileSync("scripts/_balance_s1.json", "utf8"));

let failures = 0;
const check = (label: string, got: number, want: number, tol: number) => {
  const diff = Math.abs(got - want);
  const ok = diff <= tol;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(34)} got ${got.toFixed(10)}  want ${want.toFixed(10)}  Δ ${diff.toExponential(2)}`);
};

console.log("\nSpecial functions vs scipy");
check("gamma(1.5)", gammaFn(1.5), 0.8862269254527580, 1e-12);
check("gamma(5)", gammaFn(5), 24, 1e-10);
check("gamma(0.1)", gammaFn(0.1), 9.5135076986687306, 1e-10);
check("norm.ppf(0.975)", normPpf(0.975), 1.9599639845400545, 1e-12);
check("norm.ppf(0.001)", normPpf(0.001), -3.0902323061678132, 1e-12);
check("norm.ppf(0.5)", normPpf(0.5), 0, 1e-15);

console.log("\nLog-logistic PWM fit (SPEI-3 accumulation)");
const acc3 = accumulate(balance, 3);
const expected: Record<number, [number, number, number]> = {
  1: [292.879672, 8.117238, -187.649521],
  6: [145.629469, 8.299121, -493.843538],
  9: [252.239214, 13.103154, -680.493479],
  12: [161.619307, 5.407351, -132.423837],
};
for (const m of [1, 6, 9, 12]) {
  const data = acc3.filter((p) => p.month === m && p.value != null).map((p) => p.value as number);
  const { alpha, beta, gamma } = fitLogLogistic(data);
  const [ea, eb, eg] = expected[m];
  check(`month ${m} alpha`, alpha, ea, 1e-5);
  check(`month ${m} beta`, beta, eb, 1e-5);
  check(`month ${m} gamma`, gamma, eg, 1e-4);
}

console.log("\nSPEI-3 series vs Python (last 12 fitted months)");
const spei3 = computeSpei(acc3);
const truth: Record<string, number> = {
  "2024-12": -1.0269, "2025-01": -0.3913, "2025-02": -0.007, "2025-03": 0.0277,
  "2025-04": 0.0822, "2025-06": 0.4195, "2025-07": 0.1919, "2025-08": -1.3823,
  "2025-09": -0.4267, "2025-10": -0.8834, "2025-11": -0.9937, "2025-12": -0.5264,
};
for (const [key, want] of Object.entries(truth)) {
  const [y, m] = key.split("-").map(Number);
  const got = spei3.find((p) => p.year === y && p.month === m)?.value;
  if (got == null) {
    console.log(`  FAIL  ${key} — no value produced`);
    failures++;
  } else {
    check(key, got, want, 5e-4);
  }
}

// The reference leaves May 2025 unfitted (balance below the location parameter).
const may = spei3.find((p) => p.year === 2025 && p.month === 5)?.value;
console.log(`\n  ${may == null ? "PASS" : "FAIL"}  2025-05 left null, matching the reference`);
if (may != null) failures++;

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
