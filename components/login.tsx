"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { ThemeScope } from "@/components/theme-provider";
import { Blueprint, Button, ButtonLink, Field, Input, RiskBadge } from "@/components/ui/primitives";

type View = "login" | "forgot";
type Role = "expert" | "farmer";

export function LoginView({ initialView }: { initialView: View }) {
  const [view, setView] = React.useState<View>(initialView);
  const [role, setRole] = React.useState<Role>("expert");
  const [showPw, setShowPw] = React.useState(false);
  const [stay, setStay] = React.useState(true);
  const [sent, setSent] = React.useState(false);

  const destination = role === "farmer" ? "/farm/today" : "/app/overview";

  return (
    <ThemeScope
      theme="dark"
      className="grid min-h-dvh bg-bg text-ink lg:grid-cols-[minmax(380px,560px)_minmax(0,1fr)]"
    >
      {/* ── Form column ──────────────────────────────────────────────── */}
      <div className="flex flex-col border-divider px-6 py-8 sm:px-14 lg:border-r">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
          <Brand />
          <span className="font-heading text-[21px] font-semibold tracking-[0.02em]">APWRS</span>
          <span className="ml-auto font-mono text-[11px] text-muted">
            <span className="text-ink">EN</span> / FR
          </span>
        </Link>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-7 py-12">
          <AnimatePresence mode="wait">
            {view === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-7"
              >
                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[11px] tracking-[0.12em] text-accent">SIGN IN</span>
                  <h1 className="text-[clamp(34px,6vw,44px)] leading-none tracking-[-0.03em]">Welcome back</h1>
                  <span className="text-[14.5px] text-muted">Sign in with your institutional account.</span>
                </div>

                <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                  <Field label="I am a">
                    <div className="grid grid-cols-2 border border-divider">
                      {(
                        [
                          ["expert", "Expert / advisor", "cpu"],
                          ["farmer", "Farmer", "sprout"],
                        ] as const
                      ).map(([id, label, icon], i) => {
                        const on = role === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setRole(id)}
                            aria-pressed={on}
                            className="flex h-10.5 items-center justify-center gap-2 text-sm transition-colors"
                            style={{
                              borderLeft: i ? "1px solid var(--ap-divider)" : undefined,
                              background: on ? "var(--ap-accent-100)" : "transparent",
                              color: on ? "var(--ap-text)" : "var(--ap-muted)",
                            }}
                          >
                            <Icon name={icon} size={16} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Email, phone or username">
                    <Input
                      type="text"
                      autoComplete="username"
                      defaultValue="sana.benamor@inrat.tn"
                      className="h-10.5 bg-surface text-[14.5px]"
                    />
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-baseline justify-between text-xs text-[color-mix(in_srgb,var(--ap-text)_70%,transparent)]">
                      <label htmlFor="pw">Password</label>
                      <button type="button" onClick={() => setView("forgot")} className="text-xs text-accent hover:underline">
                        Forgot password?
                      </button>
                    </span>
                    <div className="flex h-10.5 items-center border border-divider bg-surface transition-colors focus-within:border-accent">
                      <input
                        id="pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        defaultValue="correcthorsebattery"
                        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[14.5px] text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="flex h-full items-center px-3 text-muted transition-colors hover:text-ink"
                      >
                        <Icon name="eye" size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={stay}
                    onClick={() => setStay((v) => !v)}
                    className="flex items-center gap-2.5 text-[13.5px]"
                  >
                    <span
                      className="grid size-4 place-items-center border text-bg"
                      style={{
                        borderColor: stay ? "var(--ap-accent)" : "var(--ap-divider-strong)",
                        background: stay ? "var(--ap-accent)" : "transparent",
                      }}
                    >
                      {stay && <Icon name="check" size={12} strokeWidth={2.5} />}
                    </span>
                    Stay signed in for 30 days
                  </button>

                  <ButtonLink href={destination} variant="primary" size="lg" className="w-full">
                    Sign in
                  </ButtonLink>

                  <div className="flex items-center gap-3 font-mono text-[10.5px] text-faint">
                    <span className="h-px flex-1 bg-divider" />
                    OR
                    <span className="h-px flex-1 bg-divider" />
                  </div>

                  <Button size="lg" className="w-full" type="button">
                    <Icon name="key" size={16} />
                    Continue with institutional SSO
                  </Button>
                </form>

                <span className="text-[13px] text-muted">
                  No account?{" "}
                  <Link href="/#access" className="text-accent no-underline hover:underline">
                    Request access
                  </Link>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-7"
              >
                <button
                  onClick={() => {
                    setView("login");
                    setSent(false);
                  }}
                  className="flex items-center gap-1.5 self-start text-[13px] text-muted transition-colors hover:text-ink"
                >
                  <Icon name="left" size={14} />
                  Back to sign in
                </button>

                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[11px] tracking-[0.12em] text-accent">RESET PASSWORD</span>
                  <h1 className="text-[clamp(32px,5.5vw,44px)] leading-none tracking-[-0.03em]">
                    Forgot your password?
                  </h1>
                  <span className="text-[14.5px] text-muted">
                    Enter the email linked to your account and we&rsquo;ll send a reset link valid for 30 minutes.
                  </span>
                </div>

                {sent ? (
                  <Blueprint
                    className="flex gap-3 p-4.5"
                    style={{
                      borderColor: "color-mix(in srgb, var(--ap-accent) 45%, transparent)",
                      background: "var(--ap-accent-100)",
                    }}
                  >
                    <span className="flex text-accent">
                      <Icon name="mail" size={18} />
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">Check your inbox</span>
                      <span className="text-[13px] text-muted">
                        A link was sent to <span className="font-mono text-ink">sana.benamor@inrat.tn</span>.
                        Didn&rsquo;t get it? Resend in <span className="font-mono">0:58</span>.
                      </span>
                    </div>
                  </Blueprint>
                ) : (
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSent(true);
                    }}
                  >
                    <Field label="Email">
                      <Input
                        type="email"
                        autoComplete="email"
                        defaultValue="sana.benamor@inrat.tn"
                        className="h-10.5 bg-surface text-[14.5px]"
                      />
                    </Field>
                    <Button type="submit" variant="primary" size="lg" className="w-full">
                      Send reset link
                    </Button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-4.5 font-mono text-[11px] text-faint">
          <span>&copy; 2026 APWRS</span>
          <span>Privacy</span>
          <span>Terms</span>
          <span className="ml-auto">v2.4.1</span>
        </div>
      </div>

      {/* ── Showcase column ──────────────────────────────────────────── */}
      <div className="rule-grid relative hidden min-h-dvh overflow-hidden lg:block" style={{ backgroundSize: "64px 64px" }}>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--ap-glow), transparent 70%)" }}
        />
        <div className="absolute inset-16 flex flex-col justify-center gap-6">
          <Blueprint className="bg-bg shadow-lift">
            <div className="flex h-9.5 items-center justify-between border-b border-divider px-3.5 font-mono text-[11px] text-muted">
              <span>BIZERTE GOVERNORATE &middot; RISK 1 KM</span>
              <span>23 SEP 2026</span>
            </div>
            <div className="relative h-[420px]">
              <MapView layer="risk" sensors sensorIds={false} legend className="absolute inset-0" />
            </div>
          </Blueprint>

          <div className="grid grid-cols-3 border border-divider bg-bg">
            {(
              [
                ["ICHKEUL · TODAY", "58", <RiskBadge key="b" level="severe" />],
                ["BIZERTE · TODAY", "44", <RiskBadge key="b" level="watch" />],
              ] as const
            ).map(([k, v, badge]) => (
              <div key={k} className="border-r border-divider px-4.5 py-3.5">
                <div className="font-mono text-[10px] tracking-[0.1em] text-muted">{k}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-[32px] font-semibold tabular-nums">{v}</span>
                  {badge}
                </div>
              </div>
            ))}
            <div className="px-4.5 py-3.5">
              <div className="font-mono text-[10px] tracking-[0.1em] text-muted">NEXT WINDOW &middot; DURUM</div>
              <div className="mt-1 font-heading text-2xl font-semibold text-accent">12 Nov &rarr; 04 Dec</div>
            </div>
          </div>
        </div>
      </div>
    </ThemeScope>
  );
}
