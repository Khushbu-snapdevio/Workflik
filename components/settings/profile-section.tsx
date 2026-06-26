"use client";

import { Camera, Check, ChevronDown, Clock, Globe, Loader2, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUpload } from "@/lib/storage/use-upload";
import { useSettingsUser } from "./settings-user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserData {
 id:    string;
 name:   string | null;
 email:  string;
 jobTitle: string | null;
 timezone: string | null;
 image:  string | null;
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

const AVATAR_BG_CLASSES = [
 "bg-primary", "bg-destructive", "bg-success", "bg-warning",
 "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
];
function avatarColor(s: string): string {
 let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
 return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]!;
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
 const [open,  setOpen]  = useState(false);
 const [search, setSearch] = useState("");
 const [pos,   setPos]   = useState<PanelPos | null>(null);
 const [mounted, setMounted] = useState(false);
 const btnRef  = useRef<HTMLButtonElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

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
   const rect  = btnRef.current.getBoundingClientRect();
   const spaceBelow = window.innerHeight - rect.bottom;
   const panelH = 320; // approx height of dropdown
   const right = window.innerWidth - rect.right;
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
   className="w-[280px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card"
  >
   {/* Search */}
   <div className="border-b border-border/60 px-3 py-2.5">
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-2.5 py-1.5">
     <Search size={14} className="shrink-0 text-muted-foreground" />
     <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search timezone…"
      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40" />
     {search && (
      <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/70 hover:text-muted-foreground">
       <X size={12} />
      </button>
     )}
    </div>
   </div>

   {/* List */}
   <div className="max-h-[240px] overflow-y-auto py-1">
    {Object.entries(regionGroups).map(([region, tzs]) => (
     <div key={region}>
      <p className="sticky top-0 z-10 bg-card/90 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground/70">{region}</p>
      {tzs.map(tz => {
       const isActive = tz === value;
       return (
        <button key={tz} type="button" onClick={() => { onChange(tz); setOpen(false); }}
         className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors duration-150 ${
          isActive ? "bg-accent font-semibold text-foreground" : "text-foreground hover:bg-accent"
         }`}>
         <span className={`flex size-4 shrink-0 items-center justify-center ${isActive ? "" : "opacity-0"}`}>
          <Check size={12} />
         </span>
         {tz.replace(/_/g, " ")}
        </button>
       );
      })}
     </div>
    ))}
    {filtered.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground/70">No timezones found</div>}
   </div>
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button ref={btnRef} type="button" onClick={handleOpen}
    className={`flex w-[220px] items-center justify-between rounded-[var(--radius-sm)] border bg-muted/20 px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 ${
     open ? "border-primary bg-card" : "border-border hover:border-border/80"
    }`}>
    <div className="flex min-w-0 items-center gap-2">
     <Globe size={14} className="shrink-0 text-muted-foreground/60" />
     <span className="truncate">{value.replace(/_/g, " ")}</span>
    </div>
    <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
   </button>
   {panel}
  </>
 );
}

/* ── ProfileSection ───────────────────────────────────────── */
export function ProfileSection({ user }: Props) {
 const [name,     setName]     = useState(user.name ?? "");
 const [jobTitle,   setJobTitle]   = useState(user.jobTitle ?? "");
 const [timezone,   setTimezone]   = useState(user.timezone ?? "UTC");
 const [currentImage, setCurrentImage] = useState(user.image);
 const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
 const [avatarError,  setAvatarError]  = useState("");
 const [saving,    setSaving]    = useState<string | null>(null);
 const [saved,     setSaved]     = useState<string | null>(null);
 const [tzTime,    setTzTime]    = useState(() => timeInZone(user.timezone ?? "UTC"));
 const [deleteOpen,  setDeleteOpen]  = useState(false);
 const [deleteEmail,  setDeleteEmail]  = useState("");
 const [deleting,   setDeleting]   = useState(false);
 const [deleteError,  setDeleteError]  = useState("");

 const nameRef = useRef(name); nameRef.current = name;
 const jobRef = useRef(jobTitle); jobRef.current = jobTitle;
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
   window.dispatchEvent(new CustomEvent("workflik:user-image-changed", { detail: { image: result.fileUrl } }));
  } else {
   setAvatarError("Upload failed. Please try again.");
  }
 }

 async function handleRemovePhoto() {
  const res = await fetch("/api/user/profile", {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ image: null }),
  });
  if (res.ok) {
   setCurrentImage(null);
   updateUser({ image: null });
   window.dispatchEvent(new CustomEvent("workflik:user-image-changed", { detail: { image: null } }));
  }
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
 const displayName = name || user.email;
 const initials   = displayName.slice(0, 2).toUpperCase();
 const bg      = avatarColor(displayName);

 return (
  <div className="mx-auto max-w-[780px] px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

   {/* ── Header — matches all other settings pages ── */}
   <div className="mb-8 flex items-center gap-4">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary">
     <User size={22} className="text-primary-foreground" />
    </div>
    <div>
     <h1 className="text-2xl font-bold text-foreground">My profile</h1>
     <p className="text-sm text-muted-foreground">Manage your name, photo, and personal details.</p>
    </div>
   </div>

   {/* ── Photo ── */}
   <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Photo</p>
   <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="flex items-center gap-5 px-5 py-5">
     {/* Clickable avatar — kept as raw button (complex UI trigger) */}
     <div
      role="button" tabIndex={0}
      onClick={() => !avatarUploading && fileRef.current?.click()}
      onKeyDown={e => e.key === "Enter" && !avatarUploading && fileRef.current?.click()}
      className="group relative size-[72px] shrink-0 cursor-pointer rounded-full"
      title="Click to upload a photo"
     >
      {displayImage
       ? <img src={displayImage} alt={displayName} className="size-[72px] rounded-full object-cover ring-1 ring-border/30" />
       : <div className={`flex size-[72px] items-center justify-center rounded-full text-2xl font-bold text-white ring-1 ring-border/30 ${bg}`}>{initials}</div>
      }
      <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/45 transition-opacity ${avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
       {avatarUploading
        ? <Loader2 size={20} className="animate-spin text-white" />
        : <Camera size={20} className="text-white" />
       }
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
       onChange={handleAvatarChange} className="hidden" />
     </div>

     <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-3">
       <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{displayName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
         {avatarUploading ? "Uploading…" : "Click the photo to change it"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">JPG, PNG, WebP or GIF · Max 1 MB</p>
        {avatarError && <p className="mt-1.5 text-xs text-destructive">{avatarError}</p>}
       </div>
       {currentImage && !avatarUploading && (
        <Button variant="outline" size="sm"
         type="button" onClick={handleRemovePhoto}
         className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50 hover:text-destructive">
         <X size={12} />
         Remove photo
        </Button>
       )}
      </div>
     </div>
    </div>
   </div>

   {/* ── Identity ── */}
   <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Identity</p>
   <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    {/* Name */}
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-5 py-4">
     <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">Preferred name</p>
      <p className="mt-0.5 text-xs text-muted-foreground">How your name appears to teammates.</p>
     </div>
     <div className="relative shrink-0">
      <Input
       type="text"
       value={name}
       placeholder="Your name"
       onChange={e => setName(e.target.value)}
       onBlur={() => { const v = nameRef.current.trim(); if (v && v !== (user.name ?? "")) patch("name", v); }}
       className="w-[220px] focus-visible:border-primary"
      />
      {saving === "name" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saving…</span>}
      {saved === "name" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saved ✓</span>}
     </div>
    </div>

    {/* Job title */}
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-5 py-4">
     <p className="text-sm font-medium text-foreground">Job title</p>
     <div className="relative shrink-0">
      <Input
       type="text"
       value={jobTitle}
       placeholder="e.g. Product Designer"
       onChange={e => setJobTitle(e.target.value)}
       onBlur={() => { const v = jobRef.current.trim() || null; if (v !== (user.jobTitle ?? null)) patch("jobTitle", v); }}
       className="w-[220px] focus-visible:border-primary"
      />
      {saving === "jobTitle" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saving…</span>}
      {saved === "jobTitle" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saved ✓</span>}
     </div>
    </div>

    {/* Email */}
    <div className="flex items-center justify-between gap-4 px-5 py-4">
     <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">Email</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Contact support to change your email address.</p>
     </div>
     <div className="shrink-0">
      <Input
       type="text"
       value={user.email}
       readOnly
       disabled
       className="w-[220px] cursor-not-allowed text-muted-foreground"
      />
     </div>
    </div>
   </div>

   {/* ── Language & time ── */}
   <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Language &amp; time</p>
   <div className="mb-7 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="flex items-center justify-between gap-4 px-5 py-4">
     <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-foreground">Timezone</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Used for digest emails and date/time displays.</p>
     </div>
     <div className="shrink-0 flex items-center gap-3">
      {tzTime && (
       <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock size={12} className="shrink-0" />
        Current time: <span className="font-semibold text-foreground">{tzTime}</span>
       </p>
      )}
      {saving === "timezone" && <p className="text-xs text-muted-foreground">Saving…</p>}
      <TimezoneDropdown
       value={timezone}
       onChange={tz => { setTimezone(tz); patch("timezone", tz); }}
      />
     </div>
    </div>
    {saved === "timezone" && (
     <div className="flex items-center justify-end gap-1.5 border-t border-border/50 px-5 py-2">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success">
       <Check size={9} strokeWidth={3} className="text-white" />
      </span>
      <p className="text-xs font-medium text-success">Saved successfully</p>
     </div>
    )}
   </div>

   {/* ── Danger zone ── */}
   <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Danger zone</p>
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/5">
    <div className="flex items-start gap-4 px-5 py-5">
     <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-destructive/10">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-destructive">
       <path d="M10 2L2 17h16L10 2z"/><path d="M10 8v4M10 14.5v.5"/>
      </svg>
     </div>
     <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">Delete account</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
       Permanently delete your account and all personal data. This cannot be undone.
      </p>
      {!deleteOpen ? (
       <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30">
        Delete account…
       </Button>
      ) : (
       <div className="mt-4 space-y-3">
        <p className="text-sm text-foreground">Type <strong className="font-semibold text-destructive">{user.email}</strong> to confirm:</p>
        <Input
         type="email"
         value={deleteEmail}
         onChange={e => setDeleteEmail(e.target.value)}
         placeholder={user.email}
         className="w-full border-destructive/30 focus-visible:border-destructive"
        />
        {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
        <div className="flex gap-2">
         <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => { setDeleteOpen(false); setDeleteEmail(""); setDeleteError(""); }}
          >
          Cancel
         </Button>
         <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting || deleteEmail !== user.email}
          >
          {deleting ? "Deleting…" : "Delete account"}
         </Button>
        </div>
       </div>
      )}
     </div>
    </div>
   </div>

  </div>
 );
}
