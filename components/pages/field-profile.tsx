"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "@/components/icon";
import { Button, Panel, PageHeader, Segmented } from "@/components/ui/primitives";
import { CALENDAR_CROPS, FAMILY_LABEL } from "@/lib/crop-calendar";
import { CropImage } from "@/components/crop-visual";
import { Select } from "@/components/ui/select";
import {
  DRAINAGE,
  GROWTH_STAGES,
  PROFILE_USER,
  IRRIGATION,
  TEXTURES,
  clearProfile,
  defaultProfile,
  saveProfile,
  useFieldProfile,
  type FieldProfile,
} from "@/lib/field-profile";

/**
 * Where a user describes their field: the soil and farming facts
 * the Planting calendar judges each crop against. Each user has their own,
 * and can come back and change it at any time.
 */
export function PageFieldProfile() {
  const { profile, saved } = useFieldProfile(PROFILE_USER);

  // Edits are a draft until saved; a new stored profile resets the draft.
  const [draft, setDraft] = React.useState<FieldProfile>(profile);
  const [base, setBase] = React.useState(profile);
  if (base !== profile) {
    setBase(profile);
    setDraft(profile);
  }
  const [flash, setFlash] = React.useState(false);
  const dirty = JSON.stringify({ ...draft, savedAt: undefined }) !== JSON.stringify({ ...profile, savedAt: undefined });

  const set = <G extends keyof Omit<FieldProfile, "savedAt">>(group: G, patch: Partial<FieldProfile[G]>) =>
    setDraft((d) => ({ ...d, [group]: { ...d[group], ...patch } }));

  const save = () => {
    saveProfile(PROFILE_USER, draft);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 2200);
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-28 pt-7 sm:px-8">
      <PageHeader
        title="Field profile"
        lede="Describe your field once: the planting calendar checks every crop against it. You can change it at any time."
        actions={
          <Link
            href="/app/planting"
            className="flex items-center gap-1.5 text-[13px] text-accent no-underline hover:underline"
          >
            Planting calendar <Icon name="arrow" size={14} />
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
          style={{
            background: saved ? "color-mix(in srgb, #38A88A 14%, transparent)" : "var(--ap-neutral-100)",
            color: saved ? "#38A88A" : undefined,
          }}
        >
          <Icon name={saved ? "check" : "info"} size={13} />
          {saved && profile.savedAt
            ? `Saved ${new Date(profile.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "Not saved yet: showing defaults"}
        </span>
        <span>Stored for this account in this browser.</span>
      </div>

      {/* ── Soil ──────────────────────────────────────────────────────── */}
      <Section index={0} icon="layers" title="Soil" sub="From a soil test if you have one; otherwise your best estimate.">
        <div className="flex flex-col gap-5">
          <Field label="Texture">
            <Segmented
              size="sm"
              className="w-max max-w-full flex-wrap"
              value={draft.soil.texture}
              onChange={(v) => set("soil", { texture: v })}
              options={TEXTURES}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField
              label="pH"
              unit="water"
              value={draft.soil.ph}
              step={0.1}
              min={3}
              max={10}
              onChange={(v) => set("soil", { ph: v })}
            />
            <NumberField
              label="Salinity (ECe)"
              unit="dS/m"
              value={draft.soil.salinity}
              step={0.1}
              min={0}
              onChange={(v) => set("soil", { salinity: v })}
            />
            <NumberField
              label="Organic matter"
              unit="%"
              value={draft.soil.organicMatter}
              step={0.1}
              min={0}
              onChange={(v) => set("soil", { organicMatter: v })}
            />
            <NumberField
              label="Soil depth"
              unit="cm"
              value={draft.soil.depth}
              step={5}
              min={0}
              onChange={(v) => set("soil", { depth: v })}
            />
          </div>
          <Field label="Drainage">
            <Segmented size="sm" className="w-max" value={draft.soil.drainage} onChange={(v) => set("soil", { drainage: v })} options={DRAINAGE} />
          </Field>
        </div>
      </Section>

      {/* ── Agriculture ───────────────────────────────────────────────── */}
      <Section index={1} icon="sprout" title="Agriculture" sub="What is on the field now, and how it is watered.">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Crop type (current or last season)">
              <Select
                label="Crop type"
                value={draft.agriculture.cropType}
                onChange={(v) => set("agriculture", { cropType: v })}
                options={[
                  {
                    value: "none",
                    label: "None / new land",
                    leading: (
                      <span className="grid size-6 place-items-center rounded-full bg-neutral-100 text-muted">
                        <Icon name="x" size={12} />
                      </span>
                    ),
                  },
                  ...CALENDAR_CROPS.map((c) => ({
                    value: c.id,
                    label: c.name,
                    leading: <CropImage crop={c} className="size-6 rounded-full" iconSize={12} />,
                    hint: FAMILY_LABEL[c.family],
                  })),
                ]}
              />
            </Field>
            <Field label="Growth stage">
              <Select
                label="Growth stage"
                value={draft.agriculture.growthStage}
                onChange={(v) => set("agriculture", { growthStage: v })}
                options={GROWTH_STAGES.map((g, i) => ({
                  value: g.value,
                  label: g.label,
                  // Fallow is grey; the stages then darken as the crop grows.
                  leading: (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: ["#B8BEC4", "#C9A227", "#9BC27A", "#6AB04C", "#3E8E41", "#B5863B"][i] }}
                    />
                  ),
                }))}
              />
            </Field>
          </div>
          <Field label="Irrigation system">
            <Segmented
              size="sm"
              className="w-max max-w-full flex-wrap"
              value={draft.agriculture.irrigation}
              onChange={(v) => set("agriculture", { irrigation: v })}
              options={IRRIGATION}
            />
          </Field>
        </div>
      </Section>

      {/* ── Save bar ──────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 lg:pl-[248px]">
        <AnimatePresence>
          {(dirty || flash) && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-panel-border bg-s2 py-2 pl-5 pr-2 shadow-pop"
            >
              {flash && !dirty ? (
                <span className="flex items-center gap-2 py-1.5 pr-3 text-[13.5px] font-medium" style={{ color: "#38A88A" }}>
                  <Icon name="check" size={16} strokeWidth={2.4} />
                  Field profile saved
                </span>
              ) : (
                <>
                  <span className="text-[13.5px]">Unsaved changes</span>
                  <Button variant="ghost" onClick={() => setDraft(profile)}>
                    Discard
                  </Button>
                  <Button variant="primary" onClick={save}>
                    Save profile
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {saved && (
        <button
          type="button"
          onClick={() => {
            clearProfile(PROFILE_USER);
            setDraft(defaultProfile());
          }}
          className="w-fit text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Reset to defaults
        </button>
      )}
    </div>
  );
}

function Section({
  index,
  icon,
  title,
  sub,
  action,
  children,
}: {
  index: number;
  icon: IconName;
  title: string;
  sub: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Panel className="flex flex-col gap-5 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[12px] bg-accent-100 text-accent">
              <Icon name={icon} size={18} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-lg font-semibold leading-tight">{title}</span>
              <span className="text-[13px] text-muted">{sub}</span>
            </span>
          </span>
          {action}
        </div>
        {children}
      </Panel>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
      {children}
    </div>
  );
}

const INPUT =
  "h-11 w-full rounded-[10px] border border-divider bg-bg px-3.5 text-[14.5px] text-ink outline-none transition-[border-color,box-shadow] duration-150 " +
  "hover:border-[color-mix(in_srgb,var(--ap-accent)_50%,transparent)] focus:border-[var(--ap-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_18%,transparent)]";

function NumberField({
  label,
  unit,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
}) {
  // Keep the typed text so a half-typed "7." is not snapped back.
  const [text, setText] = React.useState(String(value));
  const [shown, setShown] = React.useState(value);
  if (shown !== value && Number(text) !== value) {
    setShown(value);
    setText(String(value));
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
      </span>
      <span className="relative">
        <input
          type="number"
          inputMode="decimal"
          className={`${INPUT} pr-[86px] tabular-nums`}
          value={text}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(v)) {
              setShown(v);
              onChange(v);
            }
          }}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12.5px] text-muted">{unit}</span>
      </span>
    </label>
  );
}
