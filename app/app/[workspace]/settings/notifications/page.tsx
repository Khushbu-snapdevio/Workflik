"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CheckIcon, EnvelopeIcon, BellSlashIcon, ArrowLeftIcon } from "@phosphor-icons/react";

type Frequency = "realtime" | "daily" | "weekly" | "off";

const FREQUENCY_OPTIONS: {
  value:       Frequency;
  label:       string;
  description: string;
  icon:        React.ReactNode;
}[] = [
  {
    value:       "realtime",
    label:       "Real-time",
    description: "One email per notification, sent immediately",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.317.964 2.317 2.17v.51c0 1.207-1.07 2.004-2.317 2.17A41.37 41.37 0 019 7a41.37 41.37 0 01-5.495-.365C2.253 6.484 1.183 5.687 1.183 4.48v-.51c0-1.206 1.07-2.003 2.322-2.205zM9 8.5a.75.75 0 01.75.75v6.19l1.22-1.22a.75.75 0 111.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06l1.22 1.22V9.25A.75.75 0 019 8.5z" />
      </svg>
    ),
  },
  {
    value:       "daily",
    label:       "Daily digest",
    description: "One email each morning at 8 AM with all activity",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    value:       "weekly",
    label:       "Weekly digest",
    description: "One email per week on your chosen day",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    value:       "off",
    label:       "Off",
    description: "In-app notifications only — no emails",
    icon: <BellSlashIcon size={16} />,
  },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    fetch("/api/user/notification-preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setFrequency(d.emailFrequency ?? "daily");
          setWeeklyDay(d.weeklyDigestDay ?? 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/notification-preferences", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ emailFrequency: frequency, weeklyDigestDay: weeklyDay }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* no-op */ }
    finally { setSaving(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-8 py-12">

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon size={14} weight="bold" />
          Back
        </button>

        {/* Page header */}
        <div className="mb-10 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellIcon size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Control how and when you receive notifications
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <div className="space-y-6">

            {/* Email frequency card */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-1 flex items-center gap-2">
                <EnvelopeIcon size={16} className="text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Email frequency</h2>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Choose how often you receive email notifications. You&apos;ll always see everything in-app.
              </p>

              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const selected = frequency === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                        selected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-accent/50"
                      }`}
                    >
                      {/* Custom radio */}
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`flex size-4 items-center justify-center rounded-full border-2 transition-colors ${
                            selected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40 bg-transparent"
                          }`}
                        >
                          {selected && <div className="size-1.5 rounded-full bg-white" />}
                        </div>
                        <input
                          type="radio"
                          name="frequency"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setFrequency(opt.value)}
                          className="sr-only"
                        />
                      </div>

                      {/* Icon */}
                      <div
                        className={`mt-0.5 shrink-0 ${
                          selected ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {opt.icon}
                      </div>

                      {/* Text */}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${selected ? "text-foreground" : "text-foreground"}`}>
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-snug">
                          {opt.description}
                        </p>
                      </div>

                      {/* Selected badge */}
                      {selected && (
                        <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Active
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Digest day card — only when weekly */}
            {frequency === "weekly" && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-1 text-base font-semibold text-foreground">Digest day</h2>
                <p className="mb-5 text-sm text-muted-foreground">
                  Your weekly digest will be sent every <strong>{DAY_FULL[weeklyDay]}</strong> morning at 8 AM.
                </p>
                <div className="flex gap-2">
                  {DAYS.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setWeeklyDay(idx)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold border transition-colors ${
                        weeklyDay === idx
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Save section */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Save changes</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Changes take effect from the next delivery cycle.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                      <CheckIcon size={14} weight="bold" />
                      Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {saving ? "Saving…" : "Save preferences"}
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
