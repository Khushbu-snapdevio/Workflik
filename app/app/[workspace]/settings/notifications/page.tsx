"use client";

import { Check, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Frequency = "realtime" | "daily" | "weekly" | "off";

const DAYS    = ["S","M","T","W","T","F","S"];
const DAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const FREQ_OPTIONS: { value: Frequency; icon: string; label: string; desc: string }[] = [
  { value: "realtime", icon: "⚡", label: "Real-time",    desc: "Get notified instantly"  },
  { value: "daily",   icon: "🌅", label: "Daily digest",  desc: "One email every morning" },
  { value: "weekly",  icon: "📆", label: "Weekly digest", desc: "One email per week"      },
];

type EventKey = "notifyMentions" | "notifyPageUpdates" | "notifyWorkspaceInvites" | "notifyTaskAssignments";

const EVENTS: { key: EventKey; icon: string; label: string; desc: string }[] = [
  { key: "notifyMentions",         icon: "💬", label: "Mentions",          desc: "Someone @mentions you in a comment or page" },
  { key: "notifyPageUpdates",      icon: "📝", label: "Page updates",      desc: "Pages you follow are edited or published"   },
  { key: "notifyWorkspaceInvites", icon: "✉️", label: "Workspace invites", desc: "You're invited to join a workspace"         },
  { key: "notifyTaskAssignments",  icon: "📋", label: "Task assignments",  desc: "A task or action item is assigned to you"   },
];

export default function NotificationSettingsPage() {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [emailOn,   setEmailOn]   = useState(true);
  const [events,    setEvents]    = useState<Record<EventKey, boolean>>({
    notifyMentions:         true,
    notifyPageUpdates:      true,
    notifyWorkspaceInvites: true,
    notifyTaskAssignments:  true,
  });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  // Snapshot of the last loaded/saved values, so the Save button can stay
  // disabled until something actually changes rather than just "not saving".
  const [savedSnapshot, setSavedSnapshot] = useState("");

  useEffect(() => {
    fetch("/api/user/notification-preferences")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const freq: Frequency = d.emailFrequency ?? "daily";
        const nextEmailOn  = freq !== "off";
        const nextFrequency = freq === "off" ? "daily" : freq;
        const nextWeeklyDay = d.weeklyDigestDay ?? 1;
        const nextEvents: Record<EventKey, boolean> = {
          notifyMentions:         d.notifyMentions         ?? true,
          notifyPageUpdates:      d.notifyPageUpdates      ?? true,
          notifyWorkspaceInvites: d.notifyWorkspaceInvites ?? true,
          notifyTaskAssignments:  d.notifyTaskAssignments  ?? true,
        };
        setEmailOn(nextEmailOn);
        setFrequency(nextFrequency);
        setWeeklyDay(nextWeeklyDay);
        setEvents(nextEvents);
        setSavedSnapshot(JSON.stringify({ emailOn: nextEmailOn, frequency: nextFrequency, weeklyDay: nextWeeklyDay, events: nextEvents }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = savedSnapshot !== JSON.stringify({ emailOn, frequency, weeklyDay, events });

  async function save() {
    setSaving(true); setSaved(false); setSaveError("");
    // The PATCH below usually resolves in well under 100ms, which makes the
    // spinner flash imperceptibly — hold it up for a minimum stretch so the
    // saving -> saved transition actually reads as feedback to the user.
    const minSpinner = new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const [res] = await Promise.all([
        fetch("/api/user/notification-preferences", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailFrequency: emailOn ? frequency : "off", weeklyDigestDay: weeklyDay, ...events }),
        }),
        minSpinner,
      ]);
      if (res.ok) {
        setSavedSnapshot(JSON.stringify({ emailOn, frequency, weeklyDay, events }));
        setSaved(true); setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError("Failed to save — please try again.");
      }
    } catch {
      await minSpinner;
      setSaveError("Network error — change wasn't saved.");
    }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading preferences…</p>
        </div>
      </div>
    );
  }

  const freqLabel = !emailOn ? "Off" : frequency === "realtime" ? "Instant" : frequency === "daily" ? "Daily" : "Weekly";

  return (
    <div className="mx-auto max-w-[780px] px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

      <p className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        These preferences are per-account, not per-workspace — they apply the same way across every workspace you&apos;re a member of.
      </p>

      {/* ── Email channel card ── */}
      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Channel</p>
        <div className={`overflow-hidden rounded-[var(--radius-lg)] border transition-colors duration-150 ${emailOn ? "border-border bg-card" : "border-border bg-muted/20"}`}>
          <div className="flex items-center gap-4 p-5">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors ${emailOn ? "bg-primary" : "bg-muted"}`}>
              <Mail size={20} className={emailOn ? "text-primary-foreground" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label className="text-[14.5px] font-semibold text-foreground">Email notifications</Label>
                <span className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-bold ${emailOn ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}>
                  {emailOn ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {emailOn ? `Receiving ${freqLabel.toLowerCase()} digests` : "All email notifications are paused"}
              </p>
            </div>
            <Switch
              checked={emailOn}
              onCheckedChange={setEmailOn}
              aria-label="Toggle email notifications"
            />
          </div>
        </div>
      </div>

      {/* ── Delivery frequency ── */}
      <div className={`mt-7 transition-[opacity] duration-300 ${!emailOn ? "pointer-events-none select-none opacity-40" : ""}`}>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Delivery frequency</p>
        <div className="grid grid-cols-3 gap-3">
          {FREQ_OPTIONS.map(opt => {
            const isActive = frequency === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setFrequency(opt.value)}
                className={`flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-colors duration-150 ${
                  isActive
                    ? "border-primary/30 bg-accent"
                    : "border-border bg-card hover:border-border hover:bg-accent"
                }`}>
                <div className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-lg ${isActive ? "bg-card" : "bg-muted/50"}`}>
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold leading-tight ${isActive ? "text-foreground" : "text-foreground"}`}>{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isActive && (
                  <div className="ml-auto flex size-5 items-center justify-center rounded-[var(--radius-xs)] bg-primary self-end">
                    <Check size={11} className="text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Weekly day picker */}
        {frequency === "weekly" && (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border bg-card p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Send digest every
              <span className="ml-1.5 font-semibold text-foreground">{DAY_FULL[weeklyDay]}</span>
            </p>
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => setWeeklyDay(i)}
                  className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold transition-colors duration-150 ${
                    weeklyDay === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-accent"
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
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">What you'll receive</p>
          <span className="rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{freqLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {EVENTS.map(ev => (
            <div key={ev.key}
              className={`flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/60 bg-card p-4 transition-colors duration-150 ${!emailOn ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-muted/50 text-base">{ev.icon}</span>
                <Switch
                  checked={events[ev.key]}
                  disabled={!emailOn}
                  onCheckedChange={(checked) => setEvents(prev => ({ ...prev, [ev.key]: checked }))}
                  aria-label={`Toggle ${ev.label.toLowerCase()} notifications`}
                />
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
        {saveError && (
          <span className="text-sm text-destructive">{saveError}</span>
        )}
        {saved && (
          <span className="flex items-center gap-1.5">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success">
              <Check size={9} strokeWidth={3} className="text-white" />
            </span>
            <span className="text-sm font-medium text-success">Saved</span>
          </span>
        )}
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving || !isDirty}
          >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
