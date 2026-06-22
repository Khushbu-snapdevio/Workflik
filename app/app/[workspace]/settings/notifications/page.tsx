"use client";

import { useEffect, useState } from "react";

type Frequency = "realtime" | "daily" | "weekly" | "off";

const DAYS     = ["S","M","T","W","T","F","S"];
const DAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const FREQ_OPTIONS: { value: Frequency; icon: string; label: string; desc: string }[] = [
  { value: "realtime", icon: "⚡", label: "Real-time",     desc: "Get notified instantly"     },
  { value: "daily",    icon: "🌅", label: "Daily digest",  desc: "One email every morning"    },
  { value: "weekly",   icon: "📆", label: "Weekly digest", desc: "One email per week"          },
];

const EVENTS = [
  { icon: "💬", bg: "bg-primary/8",    accent: "bg-primary",           label: "Mentions",          desc: "Someone @mentions you in a comment or page"    },
  { icon: "📝", bg: "bg-amber-50",     accent: "bg-amber-400",         label: "Page updates",      desc: "Pages you follow are edited or published"     },
  { icon: "✉️", bg: "bg-emerald-50",   accent: "bg-emerald-500",       label: "Workspace invites", desc: "You're invited to join a workspace"            },
  { icon: "📋", bg: "bg-purple-50",    accent: "bg-purple-500",        label: "Task assignments",  desc: "A task or action item is assigned to you"     },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 ${
        checked ? "bg-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]" : "bg-foreground/12"
      }`}>
      <span className={`inline-block size-[18px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[4px]"}`} />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [emailOn,   setEmailOn]   = useState(true);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    fetch("/api/user/notification-preferences")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const freq: Frequency = d.emailFrequency ?? "daily";
        setEmailOn(freq !== "off");
        setFrequency(freq === "off" ? "daily" : freq);
        setWeeklyDay(d.weeklyDigestDay ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/user/notification-preferences", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFrequency: emailOn ? frequency : "off", weeklyDigestDay: weeklyDay }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { /* no-op */ }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="size-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading preferences…</p>
        </div>
      </div>
    );
  }

  const freqLabel = !emailOn ? "Off" : frequency === "realtime" ? "Instant" : frequency === "daily" ? "Daily" : "Weekly";
  const freqColor = !emailOn ? "bg-muted text-muted-foreground"
    : frequency === "realtime" ? "bg-amber-100 text-amber-700"
    : frequency === "daily"    ? "bg-primary/10 text-primary"
    :                            "bg-primary/10 text-primary";

  return (
    <div className="mx-auto max-w-[640px] px-10 py-10">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-primary shadow-[var(--shadow-card)]">
          <svg viewBox="0 0 20 20" fill="white" className="size-5.5">
            <path d="M10 2a6 6 0 00-6 6v1.586l-1.707 1.707A1 1 0 003 13h14a1 1 0 00.707-1.707L16 9.586V8a6 6 0 00-6-6z"/>
            <path d="M10 18a2 2 0 01-2-2h4a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Control how and when you get notified.</p>
        </div>
      </div>

      {/* ── Email channel card ── */}
      <div className="mt-8">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/60">Channel</p>
        <div className={`overflow-hidden rounded-[var(--radius-lg)] border transition-all ${emailOn ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center gap-4 p-5">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors ${emailOn ? "bg-primary" : "bg-muted"}`}>
              <svg viewBox="0 0 20 20" fill="white" className="size-5">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14.5px] font-semibold text-foreground">Email notifications</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${emailOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {emailOn ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {emailOn ? `Receiving ${freqLabel.toLowerCase()} digests at ${typeof window !== "undefined" ? document.querySelector("meta[name=user-email]")?.getAttribute("content") ?? "your email" : "your email"}` : "All email notifications are paused"}
              </p>
            </div>
            <Toggle checked={emailOn} onChange={setEmailOn} />
          </div>
        </div>
      </div>

      {/* ── Delivery frequency ── */}
      <div className={`mt-7 transition-all duration-300 ${!emailOn ? "pointer-events-none select-none opacity-40" : ""}`}>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/60">Delivery frequency</p>
        <div className="grid grid-cols-3 gap-3">
          {FREQ_OPTIONS.map(opt => {
            const isActive = frequency === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setFrequency(opt.value)}
                className={`flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? "border-primary/30 bg-primary/5 shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
                    : "border-border bg-card hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                }`}>
                <div className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-[18px] ${isActive ? "bg-primary/10" : "bg-muted/50"}`}>
                  {opt.icon}
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isActive && (
                  <div className="ml-auto mt-auto flex size-5 items-center justify-center rounded-full bg-primary self-end">
                    <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Weekly day picker */}
        {frequency === "weekly" && (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Send digest every
              <span className="ml-1.5 text-primary">{DAY_FULL[weeklyDay]}</span>
            </p>
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => setWeeklyDay(i)}
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-[0.97] ${
                    weeklyDay === i
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── What you'll receive ── */}
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/60">What you'll receive</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${freqColor}`}>{freqLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {EVENTS.map(ev => (
            <div key={ev.label}
              className={`flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/60 p-4 transition-all ${ev.bg} ${!emailOn ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-card/70 text-[17px] shadow-[var(--shadow-card)]">{ev.icon}</span>
                <div className={`h-2 w-2 rounded-full ${emailOn ? ev.accent : "bg-muted-foreground/30"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{ev.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Save button ── */}
      <div className="mt-8 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-2 rounded-full bg-green-50 px-3.5 py-1.5 text-sm font-semibold text-green-700">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M2 7l3.5 3.5L12 3"/></svg>
            Preferences saved
          </span>
        )}
        <button type="button" onClick={save} disabled={saving}
          className="rounded-[var(--radius-md)] bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-raised)] disabled:opacity-60 active:scale-[0.97]">
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
