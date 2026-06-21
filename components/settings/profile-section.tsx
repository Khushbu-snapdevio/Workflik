"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUpload } from "@/lib/storage/use-upload";
import { useSettingsUser } from "./settings-user-context";

interface UserData {
  id:       string;
  name:     string | null;
  email:    string;
  jobTitle: string | null;
  timezone: string | null;
  image:    string | null;
}
interface Props { user: UserData }

const TIMEZONES = [
  "UTC",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "America/Vancouver","America/Toronto","America/Sao_Paulo",
  "Europe/London","Europe/Paris","Europe/Berlin","Europe/Amsterdam",
  "Europe/Madrid","Europe/Rome","Europe/Moscow",
  "Asia/Dubai","Asia/Kolkata","Asia/Bangkok","Asia/Singapore",
  "Asia/Shanghai","Asia/Tokyo","Asia/Seoul",
  "Australia/Sydney","Pacific/Auckland","Pacific/Honolulu",
];

function avatarColor(s: string) {
  const c = ["#e07b54","#6fba9b","#8b7fd4","#e0a54f","#5b9bd4","#d4596e"];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return c[Math.abs(h) % c.length]!;
}

function timeInZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", weekday: "short", hour12: true,
    }).format(new Date());
  } catch { return ""; }
}

/* ── Custom timezone dropdown (portal, smart flip) ────────── */
type PanelPos = { top?: number; bottom?: number; right: number };

function TimezoneDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState("");
  const [pos,     setPos]     = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef    = useRef<HTMLButtonElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) { setSearch(""); return; }
    setTimeout(() => inputRef.current?.focus(), 60);
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect   = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const panelH = 320; // approx height of dropdown
      const right  = window.innerWidth - rect.right;
      if (spaceBelow >= panelH) {
        setPos({ top: rect.bottom + 6, right });
      } else {
        setPos({ bottom: window.innerHeight - rect.top + 6, right });
      }
    }
    setOpen(o => !o);
  }

  const filtered = search.trim()
    ? TIMEZONES.filter(tz => tz.toLowerCase().includes(search.trim().toLowerCase()))
    : TIMEZONES;

  const regionGroups: Record<string, string[]> = {};
  for (const tz of filtered) {
    const region = tz.includes("/") ? tz.split("/")[0]! : "Global";
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region]!.push(tz);
  }

  const panel = mounted && open && pos ? createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", zIndex: 9999, right: pos.right, ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }) }}
      className="w-[280px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
    >
      {/* Search */}
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-2.5 py-1.5">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5 shrink-0"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search timezone…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/40 hover:text-muted-foreground">
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[240px] overflow-y-auto py-1">
        {Object.entries(regionGroups).map(([region, tzs]) => (
          <div key={region}>
            <p className="sticky top-0 z-10 bg-card/90 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 backdrop-blur-sm">{region}</p>
            {tzs.map(tz => {
              const isActive = tz === value;
              return (
                <button key={tz} type="button" onClick={() => { onChange(tz); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-[7px] text-left text-sm transition-colors ${
                    isActive ? "bg-primary/5 font-semibold text-primary" : "text-foreground hover:bg-muted/50"
                  }`}>
                  <span className={`flex size-4 shrink-0 items-center justify-center ${isActive ? "" : "opacity-0"}`}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M1.5 6l3 3 6-6"/></svg>
                  </span>
                  {tz.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground/40">No timezones found</div>}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className={`flex w-[220px] items-center justify-between rounded-[var(--radius-sm)] border bg-muted/20 px-3 py-2 text-sm text-foreground outline-none transition-all ${
          open ? "border-primary bg-card shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]" : "border-border hover:border-border/80"
        }`}>
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5 shrink-0 text-primary"><circle cx="7" cy="7" r="5.5"/><path d="M7 1.5c-2 0-4 2.7-4 5.5s2 5.5 4 5.5 4-2.7 4-5.5-2-5.5-4-5.5z"/><path d="M1.5 7h11"/></svg>
          <span className="truncate">{value.replace(/_/g, " ")}</span>
        </div>
        <svg className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
      </button>
      {panel}
    </>
  );
}

/* ── ProfileSection ───────────────────────────────────────── */
export function ProfileSection({ user }: Props) {
  const [name,          setName]          = useState(user.name ?? "");
  const [jobTitle,      setJobTitle]      = useState(user.jobTitle ?? "");
  const [timezone,      setTimezone]      = useState(user.timezone ?? "UTC");
  const [currentImage,  setCurrentImage]  = useState(user.image);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError,   setAvatarError]   = useState("");
  const [saving,        setSaving]        = useState<string | null>(null);
  const [saved,         setSaved]         = useState<string | null>(null);
  const [tzTime,        setTzTime]        = useState(() => timeInZone(user.timezone ?? "UTC"));
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteEmail,   setDeleteEmail]   = useState("");
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState("");

  const nameRef = useRef(name); nameRef.current = name;
  const jobRef  = useRef(jobTitle); jobRef.current = jobTitle;
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading: avatarUploading } = useUpload({ kind: "user_avatar" });
  const { updateUser } = useSettingsUser();

  useEffect(() => {
    setTzTime(timeInZone(timezone));
    const id = setInterval(() => setTzTime(timeInZone(timezone)), 30_000);
    return () => clearInterval(id);
  }, [timezone]);

  async function patch(field: string, value: unknown) {
    setSaving(field); setSaved(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) { setSaved(field); setTimeout(() => setSaved(null), 2500); }
    } catch { /* no-op */ }
    finally { setSaving(null); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) {
      setAvatarError("Please select a JPG, PNG, WebP, or GIF image."); return;
    }
    if (file.size > 1024 * 1024) { setAvatarError("Image must be smaller than 1 MB."); return; }
    setAvatarError("");
    const blobUrl = URL.createObjectURL(file);
    setAvatarPreview(blobUrl);
    const result = await upload(file);
    URL.revokeObjectURL(blobUrl);
    setAvatarPreview(null);
    if (result) {
      await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.fileUrl }),
      });
      setCurrentImage(result.fileUrl);
      updateUser({ image: result.fileUrl });
    } else {
      setAvatarError("Upload failed. Please try again.");
    }
  }

  async function handleRemovePhoto() {
    const res = await fetch("/api/user/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: null }),
    });
    if (res.ok) { setCurrentImage(null); updateUser({ image: null }); }
  }

  async function handleDeleteAccount() {
    setDeleteError(""); setDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });
      if (res.ok) { window.location.href = "/"; }
      else { const d = await res.json().catch(() => ({})); setDeleteError(d.error ?? "Something went wrong"); }
    } catch { setDeleteError("Network error"); }
    finally { setDeleting(false); }
  }

  const displayImage = avatarPreview ?? currentImage;
  const displayName  = name || user.email;
  const initials     = displayName.slice(0, 2).toUpperCase();
  const bg           = avatarColor(displayName);

  return (
    <div className="mx-auto max-w-[640px] px-8 py-10">

      {/* ── Header — matches all other settings pages ── */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-primary to-sky-400 shadow-[var(--shadow-raised)]">
          <svg viewBox="0 0 20 20" fill="white" className="size-5.5">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-foreground">My profile</h1>
          <p className="text-sm text-muted-foreground">Manage your name, photo, and personal details.</p>
        </div>
      </div>

      {/* ── Photo ── */}
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/40">Photo</p>
      <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
        <div className="flex items-center gap-5 px-5 py-5">
          {/* Clickable avatar */}
          <div
            role="button" tabIndex={0}
            onClick={() => !avatarUploading && fileRef.current?.click()}
            onKeyDown={e => e.key === "Enter" && !avatarUploading && fileRef.current?.click()}
            className="group relative size-[72px] shrink-0 cursor-pointer rounded-full"
            title="Click to upload a photo"
          >
            {displayImage
              ? <img src={displayImage} alt={displayName} className="size-[72px] rounded-full object-cover ring-2 ring-white shadow-[var(--shadow-card)]" />
              : <div className="flex size-[72px] items-center justify-center rounded-full text-[22px] font-bold text-white ring-2 ring-white shadow-[var(--shadow-card)]" style={{ background: bg }}>{initials}</div>
            }
            <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/45 transition-opacity ${avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {avatarUploading
                ? <svg className="size-5 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg viewBox="0 0 20 20" fill="white" className="size-5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">{displayName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {avatarUploading ? "Uploading…" : "Click the photo to change it"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, WebP or GIF · Max 1 MB</p>
            {avatarError && <p className="mt-1.5 text-xs text-red-500">{avatarError}</p>}
            {currentImage && !avatarUploading && (
              <button type="button" onClick={handleRemovePhoto}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500 transition-colors hover:text-red-700">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9"/></svg>
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Identity ── */}
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/40">Identity</p>
      <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
        {/* Name */}
        <div className="flex items-center justify-between gap-4 border-b border-border/50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Preferred name</p>
            <p className="mt-0.5 text-xs text-muted-foreground">How your name appears to teammates.</p>
          </div>
          <div className="relative shrink-0">
            <input type="text" value={name} placeholder="Your name"
              onChange={e => setName(e.target.value)}
              onBlur={() => { const v = nameRef.current.trim(); if (v && v !== (user.name ?? "")) patch("name", v); }}
              className="w-[220px] rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-card transition-colors" />
            {saving === "name" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saving…</span>}
            {saved  === "name" && <span className="absolute -bottom-5 right-0 text-xs text-primary">Saved ✓</span>}
          </div>
        </div>

        {/* Job title */}
        <div className="flex items-center justify-between gap-4 border-b border-border/50 px-5 py-4">
          <p className="text-sm font-medium text-foreground">Job title</p>
          <div className="relative shrink-0">
            <input type="text" value={jobTitle} placeholder="e.g. Product Designer"
              onChange={e => setJobTitle(e.target.value)}
              onBlur={() => { const v = jobRef.current.trim() || null; if (v !== (user.jobTitle ?? null)) patch("jobTitle", v); }}
              className="w-[220px] rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-card transition-colors" />
            {saving === "jobTitle" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saving…</span>}
            {saved  === "jobTitle" && <span className="absolute -bottom-5 right-0 text-xs text-primary">Saved ✓</span>}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Contact support to change your email address.</p>
          </div>
          <div className="shrink-0">
            <input type="text" value={user.email} readOnly
              className="w-[220px] cursor-not-allowed rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground outline-none" />
          </div>
        </div>
      </div>

      {/* ── Language & time ── */}
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/40">Language &amp; time</p>
      <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Timezone</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Used for digest emails and date/time displays.</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <TimezoneDropdown
              value={timezone}
              onChange={tz => { setTimezone(tz); patch("timezone", tz); }}
            />
            {tzTime && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3 shrink-0">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/>
                </svg>
                Current time: <span className="font-semibold text-foreground">{tzTime}</span>
              </p>
            )}
            {saving === "timezone" && <p className="text-xs text-muted-foreground">Saving…</p>}
            {saved  === "timezone" && <p className="text-xs text-primary">Saved ✓</p>}
          </div>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/40">Danger zone</p>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-red-200/60 bg-gradient-to-br from-red-50/40 to-white">
        <div className="flex items-start gap-4 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-red-100">
            <svg viewBox="0 0 20 20" fill="none" stroke="#dc2626" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M10 2L2 17h16L10 2z"/><path d="M10 8v4M10 14.5v.5"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Delete account</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Permanently delete your account and all personal data. This cannot be undone.
            </p>
            {!deleteOpen ? (
              <button type="button" onClick={() => setDeleteOpen(true)}
                className="mt-4 rounded-[var(--radius-sm)] border border-red-200 bg-card px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.97]">
                Delete account…
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-foreground">Type <strong className="font-semibold text-red-700">{user.email}</strong> to confirm:</p>
                <input type="email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} placeholder={user.email}
                  className="w-full rounded-[var(--radius-sm)] border border-red-200 bg-card px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" />
                {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDeleteOpen(false); setDeleteEmail(""); setDeleteError(""); }}
                    className="rounded-[var(--radius-sm)] border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeleteAccount} disabled={deleting || deleteEmail !== user.email}
                    className="rounded-[var(--radius-sm)] bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50 active:scale-[0.97]">
                    {deleting ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
