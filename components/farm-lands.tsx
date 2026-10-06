"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { LngLatBoundsLike } from "maplibre-gl";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { CropImage } from "@/components/crop-visual";
import { LandPin, LAND_FILL, LAND_LINE, LAND_SELECTED } from "@/components/land-pin";
import { DEFAULT_VIEW, SATELLITE_LABELS, SATELLITE_STYLE, lockToPlan } from "@/components/map-view";
import { Button, Panel } from "@/components/ui/primitives";
import { Select } from "@/components/ui/select";
import { CALENDAR_CROPS, calendarCrop } from "@/lib/crop-calendar";
import {
  areaHa,
  bounds,
  deleteLand,
  landsGeoJSON,
  saveLand,
  useFarmer,
  useLands,
  type Farmer,
  type Land,
  type LandDraft,
  type LngLat,
} from "@/lib/lands";

/**
 * The farmer's own fields: a list beside a satellite map, and a three-step
 * way to add one — go to the land by its coordinates, tap its corners on
 * the map, name it. Fields are saved to the server, so the expert sees them
 * on the Live Map.
 */

type Lang = "en" | "fr";
const tr = (lang: Lang, en: string, fr: string) => (lang === "fr" ? fr : en);
const EASE = [0.2, 0.8, 0.2, 1] as const;

export function FarmLands({ lang }: { lang: Lang }) {
  const { farmer, setName } = useFarmer();
  if (!farmer?.name) return <NameGate lang={lang} onName={setName} />;
  return <Fields farmer={farmer} lang={lang} />;
}

/* ── First visit: who is this? ───────────────────────────────────────── */

function NameGate({ lang, onName }: { lang: Lang; onName: (n: string) => void }) {
  const [name, setName] = React.useState("");
  return (
    <Panel className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-4 px-6 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-accent-100 text-accent">
        <Icon name="map" size={24} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[20px] font-semibold">{tr(lang, "Your fields", "Vos parcelles")}</span>
        <span className="text-[13.5px] text-muted">
          {tr(
            lang,
            "Draw your fields on the map so your advisor can see them. First, your name:",
            "Dessinez vos parcelles sur la carte pour que votre conseiller les voie. D’abord, votre nom :",
          )}
        </span>
      </span>
      <form
        className="flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onName(name);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr(lang, "Full name", "Nom complet")}
          className={INPUT}
        />
        <Button variant="primary" type="submit" disabled={!name.trim()}>
          {tr(lang, "Continue", "Continuer")}
        </Button>
      </form>
    </Panel>
  );
}

const INPUT =
  "h-10 w-full rounded-[10px] border border-divider bg-bg px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 " +
  "focus:border-[var(--ap-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_18%,transparent)]";

/* ── List + map ──────────────────────────────────────────────────────── */

type Target = { kind: "point"; at: LngLat; zoom: number } | { kind: "bounds"; box: [number, number, number, number] } | null;

function Fields({ farmer, lang }: { farmer: Farmer; lang: Lang }) {
  const { lands, error } = useLands(farmer.id);
  const [draft, setDraft] = React.useState<LandDraft | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<Target>(null);

  const list = lands ?? [];
  const total = list.reduce((a, l) => a + l.areaHa, 0);

  // Frame all the fields once they first arrive.
  const [framed, setFramed] = React.useState(false);
  if (!framed && lands && lands.length) {
    setFramed(true);
    setTarget({ kind: "bounds", box: bounds(lands.flatMap((l) => l.polygon)) });
  }

  const focusLand = (l: Land) => {
    setSelected(l.id);
    setTarget({ kind: "bounds", box: bounds(l.polygon) });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel className="flex max-h-[640px] flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {draft ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <Editor
                lang={lang}
                farmer={farmer}
                draft={draft}
                setDraft={setDraft}
                onGo={(at) => setTarget({ kind: "point", at, zoom: 16.5 })}
                onDone={(land) => {
                  setDraft(null);
                  if (land) focusLand(land);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-semibold">{tr(lang, "My fields", "Mes parcelles")}</span>
                  <span className="text-[12.5px] text-muted">
                    {list.length} · {total.toFixed(1)} ha · {farmer.name}
                  </span>
                </span>
                <Button variant="primary" size="sm" onClick={() => setDraft({ name: "", crop: "none", polygon: [] })}>
                  <Icon name="plus" size={14} />
                  {tr(lang, "Add a field", "Ajouter")}
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
                {error && <span className="px-2 py-3 text-[13px] text-muted">{tr(lang, "Fields could not be loaded.", "Impossible de charger les parcelles.")}</span>}
                {lands && !list.length && (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13.5px] text-muted">
                    <Icon name="map" size={26} />
                    {tr(lang, "No fields yet. Add your first one: it takes a minute.", "Aucune parcelle. Ajoutez la première : une minute suffit.")}
                  </div>
                )}
                {list.map((l, i) => (
                  <LandCard
                    key={l.id}
                    land={l}
                    index={i}
                    active={l.id === selected}
                    onFocus={() => focusLand(l)}
                    onEdit={() => {
                      setDraft({ id: l.id, name: l.name, crop: l.crop, polygon: l.polygon });
                      focusLand(l);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <Panel className="relative h-[640px] overflow-hidden">
        <FieldMap
          lands={list.filter((l) => l.id !== draft?.id)}
          selected={selected}
          onSelect={(l) => focusLand(l)}
          draft={draft}
          onDraft={(polygon) => setDraft((d) => (d ? { ...d, polygon } : d))}
          target={target}
          lang={lang}
        />
      </Panel>
    </div>
  );
}

function LandCard({
  land,
  index,
  active,
  onFocus,
  onEdit,
}: {
  land: Land;
  index: number;
  active: boolean;
  onFocus: () => void;
  onEdit: () => void;
}) {
  const crop = land.crop !== "none" ? calendarCrop(land.crop) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={`group flex items-center gap-3 rounded-[14px] border p-2.5 transition-colors ${
        active ? "border-[var(--ap-accent)] bg-accent-100" : "border-divider hover:border-[color-mix(in_srgb,var(--ap-accent)_45%,transparent)]"
      }`}
    >
      <button type="button" onClick={onFocus} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ShapeThumb polygon={land.polygon} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold">{land.name}</span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            {crop && <CropImage crop={crop} className="size-4 rounded-full" iconSize={9} />}
            {crop ? crop.name : "—"} · {land.areaHa.toFixed(2)} ha
          </span>
          <span className="text-[11px] text-faint tabular-nums">
            {land.center[1].toFixed(4)}°N {land.center[0].toFixed(4)}°E
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit field"
        className="grid size-8 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
      >
        <Icon name="pencil" size={14} />
      </button>
    </motion.div>
  );
}

/** The field's outline, drawn to fit a small tile. */
function ShapeThumb({ polygon }: { polygon: LngLat[] }) {
  const [w, s, e, n] = bounds(polygon);
  const k = Math.cos(((s + n) / 2) * (Math.PI / 180)); // squash longitude to true shape
  const span = Math.max((e - w) * k, n - s) || 1;
  const pts = polygon.map(([x, y]) => `${(6 + (((x - w) * k) / span) * 36).toFixed(1)},${(6 + ((n - y) / span) * 36).toFixed(1)}`).join(" ");
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" className="flex-none rounded-[10px] bg-[#1d2b22]">
      <polygon points={pts} fill={LAND_FILL} fillOpacity={0.45} stroke={LAND_LINE} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────── */

function Editor({
  lang,
  farmer,
  draft,
  setDraft,
  onGo,
  onDone,
}: {
  lang: Lang;
  farmer: Farmer;
  draft: LandDraft;
  setDraft: (fn: (d: LandDraft | null) => LandDraft | null) => void;
  onGo: (at: LngLat) => void;
  onDone: (land?: Land) => void;
}) {
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const ha = areaHa(draft.polygon);
  const canSave = draft.polygon.length >= 3 && draft.name.trim().length > 0 && !busy;

  const go = () => {
    // Accept "37.15, 9.67" pasted into either box.
    const pair = `${lat} ${lon}`.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const [la, lo] = pair;
    if (pair.length < 2 || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      setErr(tr(lang, "Enter a latitude and a longitude, e.g. 37.150 and 9.672.", "Saisissez une latitude et une longitude, p. ex. 37,150 et 9,672."));
      return;
    }
    setErr(null);
    setLat(String(la));
    setLon(String(lo));
    onGo([lo, la]);
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLon(p.coords.longitude.toFixed(6));
        onGo([p.coords.longitude, p.coords.latitude]);
      },
      () => setErr(tr(lang, "Your location is not available.", "Votre position n’est pas disponible.")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      onDone(await saveLand(farmer, draft));
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, "");
      try {
        setErr(JSON.parse(msg).error ?? msg);
      } catch {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft.id || !window.confirm(tr(lang, `Delete “${draft.name}”?`, `Supprimer « ${draft.name} » ?`))) return;
    setBusy(true);
    try {
      await deleteLand(farmer, draft.id);
      onDone();
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
        <span className="text-[17px] font-semibold">{draft.id ? tr(lang, "Edit field", "Modifier") : tr(lang, "New field", "Nouvelle parcelle")}</span>
        <button
          type="button"
          onClick={() => onDone()}
          aria-label="Cancel"
          className="grid size-8 place-items-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-ink"
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <Step n={1} title={tr(lang, "Find your field", "Trouvez votre parcelle")} done={draft.polygon.length > 0}>
          <div className="grid grid-cols-2 gap-2">
            <input className={INPUT} inputMode="decimal" placeholder={tr(lang, "Latitude", "Latitude")} value={lat} onChange={(e) => setLat(e.target.value)} />
            <input className={INPUT} inputMode="decimal" placeholder={tr(lang, "Longitude", "Longitude")} value={lon} onChange={(e) => setLon(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" className="flex-1" onClick={go}>
              <Icon name="search" size={13} />
              {tr(lang, "Go there", "Y aller")}
            </Button>
            <Button size="sm" className="flex-1" onClick={locate}>
              <Icon name="pin" size={13} />
              {tr(lang, "My location", "Ma position")}
            </Button>
          </div>
          <span className="text-[12px] text-muted">{tr(lang, "Or move the map to your land yourself.", "Ou déplacez la carte jusqu’à votre terrain.")}</span>
        </Step>

        <Step n={2} title={tr(lang, "Mark its corners", "Marquez ses coins")} done={draft.polygon.length >= 3}>
          <span className="text-[12.5px] leading-snug text-muted">
            {tr(
              lang,
              "Tap each corner of the field on the map, going round it. Drag a corner to move it.",
              "Touchez chaque coin de la parcelle sur la carte, en faisant le tour. Faites glisser un coin pour le déplacer.",
            )}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-[10px] bg-neutral-100 px-3 py-2 text-[13px]">
              <strong className="tabular-nums">{draft.polygon.length}</strong> {tr(lang, "corners", "coins")} ·{" "}
              <strong className="tabular-nums">{ha.toFixed(2)}</strong> ha
            </span>
            <Button size="sm" disabled={!draft.polygon.length} onClick={() => setDraft((d) => (d ? { ...d, polygon: d.polygon.slice(0, -1) } : d))}>
              {tr(lang, "Undo", "Annuler")}
            </Button>
            <Button size="sm" disabled={!draft.polygon.length} onClick={() => setDraft((d) => (d ? { ...d, polygon: [] } : d))}>
              {tr(lang, "Clear", "Effacer")}
            </Button>
          </div>
        </Step>

        <Step n={3} title={tr(lang, "Name it", "Nommez-la")} done={!!draft.name.trim()}>
          <input
            className={INPUT}
            placeholder={tr(lang, "e.g. North field", "p. ex. Parcelle nord")}
            value={draft.name}
            maxLength={80}
            onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
          />
          <Select
            label={tr(lang, "Crop", "Culture")}
            value={draft.crop}
            onChange={(v) => setDraft((d) => (d ? { ...d, crop: v } : d))}
            options={[
              { value: "none", label: tr(lang, "No crop / fallow", "Aucune / jachère") },
              ...CALENDAR_CROPS.map((c) => ({
                value: c.id,
                label: lang === "fr" ? c.nameFr : c.name,
                leading: <CropImage crop={c} className="size-6 rounded-full" iconSize={12} />,
              })),
            ]}
          />
        </Step>

        {err && <span className="rounded-[10px] bg-[color-mix(in_srgb,#D96565_12%,transparent)] px-3 py-2 text-[12.5px] text-extreme-ink">{err}</span>}
      </div>

      <div className="flex items-center gap-2 border-t border-divider px-5 py-3.5">
        {draft.id && (
          <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
            {tr(lang, "Delete", "Supprimer")}
          </Button>
        )}
        <span className="flex-1" />
        <Button size="sm" onClick={() => onDone()} disabled={busy}>
          {tr(lang, "Cancel", "Annuler")}
        </Button>
        <Button size="sm" variant="primary" onClick={save} disabled={!canSave}>
          {busy ? tr(lang, "Saving…", "Enregistrement…") : tr(lang, "Save field", "Enregistrer")}
        </Button>
      </div>
    </>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className={`grid size-6 flex-none place-items-center rounded-full text-[12px] font-semibold transition-colors ${
          done ? "bg-[var(--ap-accent)] text-white" : "bg-neutral-100 text-muted"
        }`}
      >
        {done ? <Icon name="check" size={12} strokeWidth={3} /> : n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[14px] font-semibold">{title}</span>
        {children}
      </div>
    </div>
  );
}

/* ── Map ─────────────────────────────────────────────────────────────── */

function FieldMap({
  lands,
  selected,
  onSelect,
  draft,
  onDraft,
  target,
  lang,
}: {
  lands: Land[];
  selected: string | null;
  onSelect: (l: Land) => void;
  draft: LandDraft | null;
  onDraft: (polygon: LngLat[]) => void;
  target: Target;
  lang: Lang;
}) {
  const ref = React.useRef<MapRef | null>(null);
  const drawing = draft != null;

  React.useEffect(() => {
    const map = ref.current;
    if (!map || !target) return;
    if (target.kind === "point") map.flyTo({ center: target.at, zoom: target.zoom, duration: 1400 });
    else {
      const [w, s, e, n] = target.box;
      map.fitBounds([w, s, e, n] as LngLatBoundsLike, { padding: 70, maxZoom: 17, duration: 1200 });
    }
  }, [target]);

  const shape = draft?.polygon ?? [];
  const draftGeo = {
    type: "FeatureCollection" as const,
    features: [
      ...(shape.length >= 3
        ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[...shape, shape[0]]] } }]
        : []),
      ...(shape.length >= 2
        ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: shape.length >= 3 ? [...shape, shape[0]] : shape } }]
        : []),
    ],
  };

  return (
    <>
      <Map
        ref={ref}
        mapStyle={SATELLITE_STYLE}
        initialViewState={DEFAULT_VIEW}
        minZoom={6}
        maxZoom={19}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        onLoad={lockToPlan}
        doubleClickZoom={!drawing}
        cursor={drawing ? "crosshair" : "grab"}
        attributionControl={{ compact: true }}
        onClick={(e) => {
          if (drawing) onDraft([...shape, [+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]]);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="my-lands" type="geojson" data={landsGeoJSON(lands, selected)}>
          <Layer
            id="my-lands-fill"
            type="fill"
            beforeId={SATELLITE_LABELS}
            paint={{ "fill-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_FILL], "fill-opacity": drawing ? 0.15 : 0.35 }}
          />
          <Layer
            id="my-lands-line"
            type="line"
            beforeId={SATELLITE_LABELS}
            paint={{ "line-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_LINE], "line-width": 2 }}
          />
        </Source>

        {drawing && (
          <Source id="draft" type="geojson" data={draftGeo}>
            <Layer id="draft-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": LAND_SELECTED, "fill-opacity": 0.3 }} />
            <Layer
              id="draft-line"
              type="line"
              filter={["==", ["geometry-type"], "LineString"]}
              paint={{ "line-color": LAND_SELECTED, "line-width": 2.5, "line-dasharray": [2, 1] }}
            />
          </Source>
        )}

        {!drawing &&
          lands.map((l) => (
            <Marker key={l.id} longitude={l.center[0]} latitude={l.center[1]} anchor="bottom">
              {/* Marker clicks would otherwise reach the map as well. */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(l);
                }}
              >
                <LandPin active={l.id === selected} label={l.name} />
              </span>
            </Marker>
          ))}

        {/* Corners: drag to move. */}
        {shape.map((p, i) => (
          <Marker
            key={i}
            longitude={p[0]}
            latitude={p[1]}
            anchor="center"
            draggable
            onDrag={(e) => onDraft(shape.map((q, k) => (k === i ? [+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)] : q)))}
          >
            <span
              onClick={(e) => e.stopPropagation()}
              className="block cursor-move rounded-full border-2 border-white shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
              style={{ width: i === 0 ? 16 : 13, height: i === 0 ? 16 : 13, background: i === 0 ? LAND_SELECTED : "#0b1a22" }}
            />
          </Marker>
        ))}

        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-left" maxWidth={100} unit="metric" />
      </Map>

      <AnimatePresence>
        {drawing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_90%,transparent)] px-4 py-2 text-[12.5px] font-medium shadow-pop backdrop-blur-md"
          >
            {shape.length < 3
              ? tr(lang, `Tap the corners of your field (${shape.length}/3 at least)`, `Touchez les coins de votre parcelle (${shape.length}/3 minimum)`)
              : tr(lang, `${shape.length} corners · ${areaHa(shape).toFixed(2)} ha: keep tapping, or save`, `${shape.length} coins · ${areaHa(shape).toFixed(2)} ha : continuez, ou enregistrez`)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
