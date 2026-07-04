"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ChevronDown, ExternalLink, Link2, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

/* ── Emoji catalogue ──────────────────────────────────────── */
const EMOJI_CATEGORIES = [
 {
  key: "work", label: "Work",
  emojis: ["💼","📁","📂","🗂️","🏢","📊","📈","📋","📌","📍","🔑","📎","🖇️","✂️","🗃️","🗄️","📝","✏️","🖊️","📐"],
 },
 {
  key: "objects", label: "Objects",
  emojis: ["⚡","🚀","💡","💎","🔬","🔭","📡","🖥️","⚙️","🛠️","🔒","🛡️","🎯","✅","🔥","🌐","🏗️","🧩","💫","🔮"],
 },
 {
  key: "nature", label: "Nature",
  emojis: ["🌟","⭐","🌈","🦄","🐬","🦅","🌺","🌻","🌴","🍀","🌊","🌙","☀️","🐘","🦁","🌿","🌸","🦋","🐺","🦊"],
 },
 {
  key: "fun", label: "Fun",
  emojis: ["🏆","🎁","🎨","🎭","🎬","🎮","🎲","🎸","⚽","🏀","🧸","🎪","🎵","🎉","🎊","🌮","☕","🍕","🦸","🧠"],
 },
] as const;

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
 const [open,  setOpen]  = useState(false);
 const [cat,   setCat]  = useState<string>("work");
 const [pos,   setPos]  = useState<{ top: number; right: number } | null>(null);
 const [mounted, setMounted] = useState(false);
 const btnRef  = useRef<HTMLButtonElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 useEffect(() => { setMounted(true); }, []);

 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   const t = e.target as Node;
   if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
   setOpen(false);
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [open]);

 useScrollLockWhileOpen(open, (target) =>
  !!panelRef.current?.contains(target) || !!btnRef.current?.contains(target));

 function handleOpen() {
  if (!open && btnRef.current) {
   const rect = btnRef.current.getBoundingClientRect();
   setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }
  setOpen(o => !o);
 }

 const active = EMOJI_CATEGORIES.find(c => c.key === cat) ?? EMOJI_CATEGORIES[0]!;

 const panel = mounted && open && pos ? createPortal(
  <div
   ref={panelRef}
   style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
   className="w-[310px] overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card"
  >
   {/* Header */}
   <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
    <p className="text-sm font-semibold text-foreground">Choose an icon</p>
    <button type="button" onClick={() => setOpen(false)}
     className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground">
     <X size={12} />
    </button>
   </div>

   {/* Category tabs */}
   <div className="flex gap-0.5 border-b border-border/50 px-3 pt-2.5">
    {EMOJI_CATEGORIES.map(c => (
     <button key={c.key} type="button" onClick={() => setCat(c.key)}
      className={`rounded-t-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors ${
       cat === c.key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}>
      {c.label}
     </button>
    ))}
   </div>

   {/* Emoji grid */}
   <div className="grid grid-cols-8 gap-0.5 p-3">
    {active.emojis.map(e => (
     <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
      className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-lg transition-all hover:scale-110 active:scale-[0.97] ${
       value === e ? "bg-accent" : "hover:bg-accent"
      }`}>
      {e}
     </button>
    ))}
   </div>

   {/* Footer */}
   <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2.5">
    {value ? (
     <>
      <span className="text-lg">{value}</span>
      <p className="flex-1 text-xs text-muted-foreground">Selected</p>
      <button type="button" onClick={() => { onChange(""); setOpen(false); }}
       className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
       <X size={12} />
       Remove icon
      </button>
     </>
    ) : (
     <p className="text-xs text-muted-foreground">Click an emoji to select it</p>
    )}
   </div>
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button ref={btnRef} type="button" onClick={handleOpen} title="Change icon"
    className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-border bg-muted/30 text-3xl leading-none transition-colors duration-150 hover:border-border hover:bg-accent active:scale-[0.97]">
    {value || "📁"}
   </button>
   {panel}
  </>
 );
}

/* ── Types ────────────────────────────────────────────────── */
interface WorkspaceData {
 id:        string;
 name:       string;
 slug:       string;
 icon:       string | null;
 defaultPageAccess: string | null;
 inviteLinkToken:  string | null;
 inviteLinkActive: boolean | null;
 inviteLinkRole:  string | null;
}
interface Props { workspace: WorkspaceData; bytesUsed: number; memberCount: number }

const QUOTA = 5 * 1024 * 1024 * 1024;
const ACCESS = [
 { value: "full_access",  label: "Full access" },
 { value: "can_edit",    label: "Can edit" },
 { value: "can_comment",  label: "Can comment" },
 { value: "can_view",    label: "View only" },
 { value: "private",    label: "Private" },
];

function fmt(b: number) {
 if (b === 0) return "0 B";
 const gb = b / 1073741824; if (gb >= 1) return `${gb.toFixed(2).replace(/\.?0+$/, "")} GB`;
 const mb = b / 1048576;  if (mb >= 1) return `${mb.toFixed(1)} MB`;
 return `${(b / 1024).toFixed(0)} KB`;
}

function SectionLabel({ label }: { label: string }) {
 return <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{label}</p>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
 return (
  <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card ${className}`}>
   {children}
  </div>
 );
}
function CardRow({ label, desc, control, last }: { label: string; desc?: string; control: React.ReactNode; last?: boolean }) {
 return (
  <div className={`flex items-center justify-between gap-6 px-5 py-4 ${!last ? "border-b border-border/40" : ""}`}>
   <div className="min-w-0 flex-1">
    <p className="text-sm font-medium text-foreground">{label}</p>
    {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
   </div>
   <div className="shrink-0">{control}</div>
  </div>
 );
}
function ChevronSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
 const [open, setOpen] = useState(false);
 const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
 const [mounted, setMounted] = useState(false);
 const btnRef = useRef<HTMLButtonElement>(null);
 const menuRef = useRef<HTMLDivElement>(null);
 const selected = options.find(o => o.value === value);

 useEffect(() => { setMounted(true); }, []);

 useEffect(() => {
  if (!open) return;
  function handleClick(e: MouseEvent) {
   const t = e.target as Node;
   if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
   setOpen(false);
  }
  function handleKey(e: KeyboardEvent) {
   if (e.key === "Escape") setOpen(false);
  }
  document.addEventListener("mousedown", handleClick);
  document.addEventListener("keydown", handleKey);
  return () => {
   document.removeEventListener("mousedown", handleClick);
   document.removeEventListener("keydown", handleKey);
  };
 }, [open]);

 useScrollLockWhileOpen(open, (target) =>
  !!menuRef.current?.contains(target) || !!btnRef.current?.contains(target));

 function handleOpen() {
  if (!open && btnRef.current) {
   const rect = btnRef.current.getBoundingClientRect();
   setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }
  setOpen(o => !o);
 }

 const menu = mounted && open && pos ? createPortal(
  <div
   ref={menuRef}
   style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
   className="min-w-[160px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-card py-1"
  >
   {options.map(o => (
    <button
     key={o.value}
     type="button"
     onClick={() => { onChange(o.value); setOpen(false); }}
     className={[
      "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition-colors duration-150",
      o.value === value
       ? "bg-accent text-foreground font-medium"
       : "text-foreground hover:bg-accent",
     ].join(" ")}
    >
     {o.label}
     {o.value === value && <Check size={13} className="shrink-0 text-foreground" />}
    </button>
   ))}
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button
    ref={btnRef}
    type="button"
    onClick={handleOpen}
    className={[
     "flex items-center gap-2 rounded-[var(--radius-sm)] border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150",
     "focus-visible:outline-none",
     open ? "border-primary" : "border-border hover:border-border/80",
    ].join(" ")}
   >
    <span className="min-w-[110px] text-left">{selected?.label ?? value}</span>
    <ChevronDown
     size={14}
     className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    />
   </button>
   {menu}
  </>
 );
}

/* ── Main component ───────────────────────────────────────── */
export function WorkspaceGeneralSection({ workspace, bytesUsed, memberCount }: Props) {
 const router = useRouter();
 const [name,       setName]       = useState(workspace.name);
 const [icon,       setIcon]       = useState(workspace.icon ?? "");
 const [access,      setAccess]      = useState(workspace.defaultPageAccess ?? "shared");
 const [inviteActive,  setInviteActive]  = useState(workspace.inviteLinkActive ?? false);
 const [inviteToken,  setInviteToken]  = useState(workspace.inviteLinkToken ?? "");
 const [inviteRole,   setInviteRole]   = useState(workspace.inviteLinkRole ?? "editor");
 const [saving,      setSaving]      = useState<string | null>(null);
 const [saved,      setSaved]      = useState<string | null>(null);
 const [nameError,    setNameError]    = useState("");
 const [copied,      setCopied]      = useState(false);
 const [deleteOpen,   setDeleteOpen]   = useState(false);
 const [deleteName,   setDeleteName]   = useState("");
 const [deleting,    setDeleting]    = useState(false);
 const [deleteError,  setDeleteError]  = useState("");

 const nameRef = useRef(name); nameRef.current = name;

 function toSlug(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || workspace.slug;
 }

 async function saveName() {
  const trimmed = nameRef.current.trim();
  if (!trimmed || trimmed === workspace.name) return;
  const newSlug = toSlug(trimmed);
  setSaving("name"); setSaved(null); setNameError("");
  try {
   const res = await fetch(`/api/workspaces/${workspace.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: trimmed, slug: newSlug }),
   });
   if (res.ok) {
    setSaved("name"); setTimeout(() => setSaved(null), 2500);
    if (newSlug !== workspace.slug) {
     router.replace(`/app/${newSlug}/settings/general`);
    }
   } else {
    const d = await res.json().catch(() => ({}));
    setNameError(d.error ?? "Failed to save");
   }
  } catch { setNameError("Network error"); }
  finally { setSaving(null); }
 }

 async function patchWs(patch: Record<string, unknown>) {
  const field = Object.keys(patch)[0]!;
  setSaving(field); setSaved(null);
  try {
   const res = await fetch(`/api/workspaces/${workspace.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
   });
   if (res.ok) {
    setSaved(field); setTimeout(() => setSaved(null), 2500);
   }
  } catch { /* no-op */ }
  finally { setSaving(null); }
 }

 async function generateLink() {
  setSaving("inviteLink");
  try {
   const r = await fetch(`/api/workspaces/${workspace.id}/invite-link`, { method: "POST" });
   if (r.ok) { const d = await r.json(); setInviteToken(d.inviteLinkToken ?? ""); setInviteActive(true); }
  } catch { /* no-op */ }
  finally { setSaving(null); }
 }

 async function disableLink() {
  setSaving("inviteDisable");
  try {
   const r = await fetch(`/api/workspaces/${workspace.id}/invite-link`, { method: "DELETE" });
   if (r.ok) setInviteActive(false);
  } catch { /* no-op */ }
  finally { setSaving(null); }
 }

 async function handleDelete() {
  setDeleteError(""); setDeleting(true);
  try {
   const r = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
   if (r.ok) { window.location.href = "/platform/onboarding"; }
   else { const d = await r.json().catch(() => ({})); setDeleteError(d.error ?? "Failed to delete workspace"); }
  } catch { setDeleteError("Network error"); }
  finally { setDeleting(false); }
 }

 function changeIcon(v: string) { setIcon(v); patchWs({ icon: v || null }); }

 const pct    = Math.min((bytesUsed / QUOTA) * 100, 100);
 const isNear  = pct >= 90;
 const isAtLim  = pct >= 100;
 const origin  = typeof window !== "undefined" ? window.location.origin : "";
 const inviteUrl = inviteToken ? `${origin}/invite/${inviteToken}` : "";
 const inviteShort = inviteUrl.replace(/^https?:\/\//, "");

 function copy() {
  if (!inviteUrl) return;
  navigator.clipboard.writeText(inviteUrl);
  setCopied(true); setTimeout(() => setCopied(false), 2000);
 }

 return (
  <div className="mx-auto max-w-[780px] px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

   {/* ── Header ── */}
   <div className="mb-8 flex items-center gap-4">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary">
     <Settings size={22} className="text-primary-foreground" />
    </div>
    <div>
     <h1 className="text-2xl font-bold text-foreground">General</h1>
     <p className="text-sm text-muted-foreground">Manage your workspace name, URL, and settings.</p>
    </div>
   </div>

   {/* ── WORKSPACE IDENTITY ── */}
   <div className="mb-7">
    <SectionLabel label="Workspace" />
    <Card>
     {/* Live preview banner */}
     <div className="flex items-center gap-3.5 border-b border-border/40 bg-muted/20 px-5 py-4">
      <span className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-card text-2xl">
       {icon || "📁"}
      </span>
      <div>
       <p className="text-[14.5px] font-semibold text-foreground">{name || "Workspace name"}</p>
       <p className="text-xs text-muted-foreground">Sidebar preview</p>
      </div>
      <div className="ml-auto rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Preview</div>
     </div>

     {/* Icon row — picker + remove link inline */}
     <div className={`flex items-center justify-between gap-6 px-5 py-4 border-b border-border/40`}>
      <div className="min-w-0 flex-1">
       <p className="text-sm font-medium text-foreground">Icon</p>
       <p className="mt-0.5 text-xs text-muted-foreground">Click to choose an emoji for your workspace.</p>
       {icon && (
        <button type="button" onClick={() => changeIcon("")}
         className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive">
         <X size={12} />
         Remove icon
        </button>
       )}
      </div>
      <EmojiPicker value={icon} onChange={changeIcon} />
     </div>

     {/* Name row */}
     <div className={`flex items-center justify-between gap-6 px-5 py-4 border-b border-border/40`}>
      <div className="min-w-0 flex-1">
       <p className="text-sm font-medium text-foreground">Name</p>
       <p className="mt-0.5 text-xs text-muted-foreground">Shown in the sidebar and all emails.</p>
      </div>
      <div className="relative shrink-0">
       <Input value={name} onChange={e => { setName(e.target.value); setNameError(""); }}
        onBlur={saveName}
        className="w-[220px] focus-visible:border-primary" />
       {saved === "name" && <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">Saved ✓</span>}
       {nameError && <span className="absolute -bottom-5 right-0 text-xs text-destructive">{nameError}</span>}
      </div>
     </div>

     {/* Slug row — read-only, auto-derived from name */}
     <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0 flex-1">
       <p className="text-sm font-medium text-foreground">URL</p>
       <p className="mt-0.5 text-xs text-muted-foreground">Auto-generated from workspace name.</p>
      </div>
      <div className="shrink-0">
       <div className="flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-muted/30">
        <span className="select-none border-r border-border/50 bg-muted px-2.5 py-2 text-xs font-medium text-muted-foreground">/app/</span>
        <span className="px-2.5 py-2 text-xs text-foreground">{workspace.slug}</span>
       </div>
      </div>
     </div>
    </Card>
   </div>

   {/* ── DEFAULTS ── */}
   <div className="mb-7">
    <SectionLabel label="Defaults" />
    <Card>
     <CardRow label="Default page access" desc="New pages created in this workspace will inherit this access level." last
      control={<ChevronSelect value={access} options={ACCESS} onChange={v => { setAccess(v); patchWs({ defaultPageAccess: v }); }} />}
     />
    </Card>
   </div>

   {/* ── INVITE LINK ── */}
   <div className="mb-7">
    <SectionLabel label="Invite link" />
    {inviteActive && inviteUrl ? (
     <Card>
      {/* URL bar */}
      <div className="border-b border-border/40 bg-muted/20 px-5 py-4">
       <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
         <ExternalLink size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
         <p className="truncate font-mono text-xs text-foreground">{inviteShort}</p>
         <p className="text-xs text-muted-foreground">Anyone with this link can join your workspace</p>
        </div>
        <Button type="button" size="sm" onClick={copy}
         className={`shrink-0 active:scale-[0.97] ${copied ? "bg-success-subtle text-success-foreground hover:bg-success-subtle" : ""}`}>
         {copied ? "Copied ✓" : "Copy link"}
        </Button>
       </div>
      </div>
      <CardRow label="Join as" desc="New members via this link will be assigned this role."
       control={<ChevronSelect value={inviteRole} options={[{value:"editor",label:"Editor"},{value:"viewer",label:"Viewer"}]}
        onChange={v => { setInviteRole(v); patchWs({ inviteLinkRole: v }); }} />}
      />
      <CardRow label="Manage link" last
       control={
        <div className="flex gap-2">
         <Button type="button" variant="outline" size="sm" onClick={generateLink} disabled={saving === "inviteLink"}>
          Regenerate
         </Button>
         <Button type="button" variant="destructive" size="sm" onClick={disableLink} disabled={saving === "inviteDisable"}>
          Disable
         </Button>
        </div>
       }
      />
     </Card>
    ) : (
     <Card>
      <div className="flex items-center gap-4 px-5 py-5">
       <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/50">
        <Link2 size={20} className="text-muted-foreground" />
       </div>
       <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">No active invite link</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Generate a shareable link to invite new members.</p>
       </div>
       <Button type="button" size="sm" onClick={generateLink} disabled={saving === "inviteLink"} className="shrink-0 active:scale-[0.97]">
        {saving === "inviteLink" ? "Generating…" : "Generate link"}
       </Button>
      </div>
     </Card>
    )}
   </div>

   {/* ── STORAGE ── */}
   <div className="mb-7">
    <SectionLabel label="Storage" />
    <Card className="p-5">
     <div className="flex items-start justify-between gap-4">
      <div>
       <p className={`text-3xl font-bold leading-tight tracking-tight ${isAtLim ? "text-destructive" : isNear ? "text-warning" : "text-foreground"}`}>
        {fmt(bytesUsed)}
       </p>
       <p className="mt-0.5 text-xs text-muted-foreground">
        used of {fmt(QUOTA)} · {memberCount} member{memberCount !== 1 ? "s" : ""}
       </p>
      </div>
      <div className="text-right">
       <p className={`text-xl font-bold ${isAtLim ? "text-destructive" : isNear ? "text-warning" : "text-foreground"}`}>
        {pct.toFixed(0)}%
       </p>
       <p className="text-xs text-muted-foreground">{fmt(QUOTA - bytesUsed)} free</p>
      </div>
     </div>
     <div className="mt-4 h-[8px] w-full overflow-hidden rounded-full bg-border/50">
      <div
       className={`h-full rounded-full transition-all duration-700 ${isAtLim ? "bg-destructive" : isNear ? "bg-warning" : "bg-primary"}`}
       style={{ width: `${Math.max(pct, 1.5)}%` }}
      />
     </div>
     {(isNear || isAtLim) && (
      <div className={`mt-3 flex items-center gap-2 text-xs font-medium ${isAtLim ? "text-destructive" : "text-warning"}`}>
       <AlertCircle size={14} className="shrink-0" />
       {isAtLim ? "Storage limit reached — new uploads are blocked." : "Storage is almost full."}
      </div>
     )}
    </Card>
   </div>

   {/* ── DANGER ZONE ── */}
   <div>
    <SectionLabel label="Danger zone" />
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/5">
     <div className="px-5 py-5">
      <div className="flex items-start gap-4">
       <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-destructive/10">
        <AlertTriangle size={20} className="text-destructive" />
       </div>
       <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Delete this workspace</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Permanently deletes all pages, files, and member data. This cannot be undone.</p>
       </div>
      </div>
      {!deleteOpen ? (
       <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="mt-4 active:scale-[0.97]">
        Delete workspace…
       </Button>
      ) : (
       <div className="mt-4 space-y-3">
        <p className="text-sm text-foreground">
         Type <strong className="font-semibold text-destructive">{workspace.name}</strong> to confirm:
        </p>
        <Input value={deleteName} onChange={e => setDeleteName(e.target.value)} placeholder={workspace.name}
         className="w-full border-destructive/40 focus-visible:border-destructive" />
        {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
        <div className="flex gap-2">
         <Button type="button" variant="outline" size="sm" onClick={() => { setDeleteOpen(false); setDeleteName(""); setDeleteError(""); }}>Cancel</Button>
         <Button type="button" size="sm" onClick={handleDelete} disabled={deleting || deleteName !== workspace.name} className="border-transparent bg-destructive text-white hover:bg-destructive/85 active:scale-[0.97] disabled:bg-destructive/40 disabled:text-white/80 disabled:opacity-100 disabled:cursor-not-allowed disabled:pointer-events-none">
          {deleting ? "Deleting…" : "Delete workspace"}
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
