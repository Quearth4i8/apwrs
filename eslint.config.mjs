import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** Flat config: eslint-config-next 16 ships native flat presets. */
const config = [
  { ignores: [".next/**", "node_modules/**", "design/**", "public/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
