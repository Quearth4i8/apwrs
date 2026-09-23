/**
 * MapLibre GL v6 ships its tile-parsing worker as a separate ES module and
 * resolves its URL at runtime from `import.meta.url`. Bundlers cannot trace a
 * dynamic URL like that, so under Turbopack the path points nowhere and the
 * map fails with "Worker failed to load" — the container and markers mount,
 * but no tile ever decodes.
 *
 * The fix is to serve the worker from our own origin and tell MapLibre where
 * it is (see setWorkerUrl in components/map-view.tsx). This copies the two
 * files it needs into public/, keeping them in step with the installed
 * version rather than vendoring a snapshot that silently goes stale.
 *
 * Runs on postinstall, and again before dev/build in case installs were run
 * with --ignore-scripts.
 */
import { copyFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");

// The worker imports ./maplibre-gl-shared.mjs relatively, so both must sit
// side by side at the served path.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (!existsSync(from)) {
  console.warn("[maplibre] package not installed yet — skipping worker sync");
  process.exit(0);
}

const version = JSON.parse(
  readFileSync(join(root, "node_modules", "maplibre-gl", "package.json"), "utf8"),
).version;

mkdirSync(to, { recursive: true });
for (const f of FILES) copyFileSync(join(from, f), join(to, f));

console.log(`[maplibre] worker ${version} synced to public/maplibre/`);
