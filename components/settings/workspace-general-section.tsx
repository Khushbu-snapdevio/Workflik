"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { RoleSelect } from "@/components/ui/role-select";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { getClampedTop } from "@/lib/ui/clamp-to-viewport";

/* ── Icon picker — same Notion-style picker used for page/database icons
   (search, emoji categories, lucide icons, image upload) instead of a
   separate, more limited emoji-only grid just for the workspace icon. ── */
function WorkspaceIconPicker({
 value, workspaceId, onChange,
}: {
 value: string; workspaceId: string; onChange: (v: string) => void;
}) {
 const [open,  setOpen]  = useState(false);
 const [pos,   setPos]  = useState<{ top: number; left: number } | null>(null);
 const [mounted, setMounted] = useState(false);
 const btnRef = useRef<HTMLButtonElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 useEffect(() => { setMounted(true); }, []);

 // The panel is a `position: fixed` portal anchored to a rect snapshotted
 // once on open — lock page scroll while it's open instead of
 // repositioning, matching the pattern used by the app's other click-opened
 // popovers anchored via a one-time getBoundingClientRect() snapshot.
 useScrollLockWhileOpen(open, (target) => !!panelRef.current?.contains(target));

 function handleOpen() {
  if (!open && btnRef.current) {
   const rect = btnRef.current.getBoundingClientRect();
   // IconPicker is a fixed w-[352px] panel positioned "absolute left-0" —
   // anchor via `left` (not `right`) and clamp to the viewport, matching the
   // pattern used elsewhere (entry-context-menu.tsx). A `right`-anchored
   // wrapper collapses to zero width here (its only child is absolutely
   // positioned), which pulls "left-0" to the button's right edge instead
   // of flush against it — pushing the whole panel off-screen.
   const PANEL_WIDTH = 352;
   const PANEL_HEIGHT = 400;
   const left = Math.max(8, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
   const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - PANEL_HEIGHT));
   setPos({ top, left });
  }
  setOpen(o => !o);
 }

 const panel = mounted && open && pos ? createPortal(
  <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}>
   <div className="relative">
    <IconPicker
     workspaceId={workspaceId}
     uploadKind="workspace_icon"
     onSelect={(v) => { onChange(v); setOpen(false); }}
     onIconPreview={(v) => onChange(v)}
     onRemove={value ? () => { onChange(""); setOpen(false); } : undefined}
     onClose={() => setOpen(false)}
    />
   </div>
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button ref={btnRef} type="button" onClick={handleOpen}
    onMouseEnter={(e) => showTooltip("Change icon", e)}
    onMouseLeave={hideTooltip}
    className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-border bg-muted/30 transition-colors duration-150 hover:border-border hover:bg-accent active:scale-[0.97]">
    {value ? <PageIcon icon={value} size={28} /> : <span className="text-3xl leading-none">📁</span>}
   </button>
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
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
interface Props { workspace: WorkspaceData }

const ACCESS = [
 { value: "full_access",  label: "Full access" },
 { value: "can_edit",    label: "Can edit" },
 { value: "can_comment",  label: "Can comment" },
 { value: "can_view",    label: "View only" },
 { value: "private",    label: "Private" },
];

function SectionLabel({ label }: { label: string }) {
 return <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{label}</p>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
 return (
  <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card ${className}`}>
   {children}
  </div>
 );
}
function CardRow({ label, desc, control, last, feedback }: { label: string; desc?: string; control: React.ReactNode; last?: boolean; feedback?: React.ReactNode }) {
 return (
  <div className={`flex items-center justify-between gap-6 px-5 py-4 ${!last ? "border-b border-border" : ""}`}>
   <div className="min-w-0 flex-1">
    <p className="text-sm font-medium text-foreground">{label}</p>
    {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
   </div>
   <div className="flex shrink-0 items-center gap-2.5">
    {feedback}
    {control}
   </div>
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
     open ? "border-primary" : "border-border hover:border-border",
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
export function WorkspaceGeneralSection({ workspace }: Props) {
 const router = useRouter();
 const [name,       setName]       = useState(workspace.name);
 const [icon,       setIcon]       = useState(workspace.icon ?? "");
 const [access,      setAccess]      = useState(workspace.defaultPageAccess ?? "shared");
 const [inviteActive,  setInviteActive]  = useState(workspace.inviteLinkActive ?? false);
 const [inviteToken,  setInviteToken]  = useState(workspace.inviteLinkToken ?? "");
 const [inviteRole,   setInviteRole]   = useState(workspace.inviteLinkRole ?? "editor");
 const [saving,      setSaving]      = useState<string | null>(null);
 const [saved,      setSaved]      = useState<string | null>(null);
 const [patchError,   setPatchError]   = useState<{ field: string; message: string } | null>(null);
 const [nameError,    setNameError]    = useState("");
 const [copied,      setCopied]      = useState(false);
 const [deleteOpen,   setDeleteOpen]   = useState(false);
 const [regenerateOpen, setRegenerateOpen] = useState(false);
 const [deleteName,   setDeleteName]   = useState("");
 const [deleting,    setDeleting]    = useState(false);
 const [deleteError,  setDeleteError]  = useState("");
 // window.location.origin differs between the server (absent) and the
 // client's first hydration pass (present) — reading it unconditionally in
 // the render body causes a hydration mismatch. Gate it behind `mounted` so
 // both the SSR pass and the client's initial render agree on "", and the
 // full URL fills in one render later, after hydration has already settled.
 const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);

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
    window.dispatchEvent(new CustomEvent("workflik:workspace-name-changed", { detail: { workspaceId: workspace.id, name: trimmed } }));
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

 async function patchWs(patch: Record<string, unknown>, rollback?: () => void, onSuccess?: () => void) {
  const field = Object.keys(patch)[0]!;
  setSaving(field); setSaved(null); setPatchError(null);
  try {
   const res = await fetch(`/api/workspaces/${workspace.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
   });
   if (res.ok) {
    setSaved(field); setTimeout(() => setSaved(null), 2500);
    onSuccess?.();
   } else {
    rollback?.();
    const d = await res.json().catch(() => ({}));
    setPatchError({ field, message: d.error ?? "Failed to save" });
   }
  } catch {
   rollback?.();
   setPatchError({ field, message: "Network error — change wasn't saved" });
  }
  finally { setSaving(null); }
 }

 async function generateLink() {
  setSaving("inviteLink"); setPatchError(null);
  try {
   const r = await fetch(`/api/workspaces/${workspace.id}/invite-link`, { method: "POST" });
   if (r.ok) { const d = await r.json(); setInviteToken(d.inviteLinkToken ?? ""); setInviteActive(true); }
   else setPatchError({ field: "inviteLink", message: "Failed to generate a new link" });
  } catch { setPatchError({ field: "inviteLink", message: "Network error — link wasn't regenerated" }); }
  finally { setSaving(null); }
 }

 async function disableLink() {
  setSaving("inviteDisable"); setPatchError(null);
  try {
   const r = await fetch(`/api/workspaces/${workspace.id}/invite-link`, { method: "DELETE" });
   if (r.ok) setInviteActive(false);
   else setPatchError({ field: "inviteDisable", message: "Failed to disable the link" });
  } catch { setPatchError({ field: "inviteDisable", message: "Network error — link wasn't disabled" }); }
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

 function changeIcon(v: string) {
  const prev = icon; setIcon(v);
  // Notify the sidebar workspace switcher only AFTER the write commits —
  // it self-fetches once on mount and otherwise has no reason to refresh,
  // so without this it kept showing the old icon until a hard reload.
  patchWs({ icon: v || null }, () => setIcon(prev), () => {
   window.dispatchEvent(new CustomEvent("workflik:workspace-icon-changed", { detail: { workspaceId: workspace.id, icon: v || null } }));
  });
 }

 const origin  = mounted ? window.location.origin : "";
 const inviteUrl = inviteToken ? `${origin}/invite/${inviteToken}` : "";
 const inviteShort = inviteUrl.replace(/^https?:\/\//, "");

 function copy() {
  if (!inviteUrl) return;
  navigator.clipboard.writeText(inviteUrl);
  setCopied(true); setTimeout(() => setCopied(false), 2000);
 }

 return (
  <div className="mx-auto max-w-[780px] px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

   {/* ── WORKSPACE IDENTITY ── */}
   <div className="mb-7">
    <SectionLabel label="Workspace" />
    <Card>
     {/* Live preview banner */}
     <div className="flex items-center gap-3.5 border-b border-border bg-muted/20 px-5 py-4">
      <span className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-card text-2xl">
       {icon ? <PageIcon icon={icon} size={22} /> : "📁"}
      </span>
      <div>
       <p className="text-[14.5px] font-semibold text-foreground">{name || "Workspace name"}</p>
       <p className="text-xs text-muted-foreground">Sidebar preview</p>
      </div>
      <div className="ml-auto rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Preview</div>
     </div>

     {/* Icon row — removing happens inside the picker itself (its own
         "Remove" footer button, same as page/database icons), so there's no
         separate, disconnected remove control floating in this row. */}
     <div className={`flex items-center justify-between gap-6 px-5 py-4 border-b border-border`}>
      <div className="min-w-0 flex-1">
       <p className="text-sm font-medium text-foreground">Icon</p>
       <p className="mt-0.5 text-xs text-muted-foreground">Click to choose an icon for your workspace.</p>
      </div>
      <WorkspaceIconPicker value={icon} workspaceId={workspace.id} onChange={changeIcon} />
     </div>

     {/* Name row */}
     <div className="flex items-center justify-between gap-6 px-5 py-4">
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
    </Card>
   </div>

   {/* ── DEFAULTS ── */}
   <div className="mb-7">
    <SectionLabel label="Defaults" />
    <Card>
     <CardRow label="Default page access" desc="New pages created in this workspace will inherit this access level." last
      feedback={
       saved === "defaultPageAccess" ? <span className="text-xs text-muted-foreground">Saved ✓</span>
       : patchError?.field === "defaultPageAccess" ? <span className="text-xs text-destructive">{patchError.message}</span>
       : null
      }
      control={<ChevronSelect value={access} options={ACCESS} onChange={v => {
       const prev = access; setAccess(v);
       patchWs({ defaultPageAccess: v }, () => setAccess(prev));
      }} />}
     />
    </Card>
   </div>

   {/* ── INVITE LINK ── */}
   <div className="mb-7">
    <SectionLabel label="Invite link" />
    {inviteActive && inviteUrl ? (
     <Card>
      {/* URL bar */}
      <div className="border-b border-border bg-muted/20 px-5 py-4">
       <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
         <ExternalLink size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
         <p className="truncate font-mono text-xs text-foreground">{inviteShort}</p>
         <p className="text-xs text-muted-foreground">Anyone with this link can join your workspace</p>
        </div>
        <Button type="button" size="sm" onClick={copy}
         className={`shrink-0 active:scale-[0.97] ${copied ? "bg-success-subtle text-success hover:bg-success-subtle" : ""}`}>
         {copied ? "Copied ✓" : "Copy link"}
        </Button>
       </div>
      </div>
      <CardRow label="Join as" desc="New members via this link will be assigned this role."
       feedback={
        saved === "inviteLinkRole" ? <span className="text-xs text-muted-foreground">Saved ✓</span>
        : patchError?.field === "inviteLinkRole" ? <span className="text-xs text-destructive">{patchError.message}</span>
        : null
       }
       control={<RoleSelect value={inviteRole} options={[{value:"editor",label:"Member"},{value:"viewer",label:"Viewer"}]}
        onChange={v => {
         const prev = inviteRole; setInviteRole(v);
         patchWs({ inviteLinkRole: v }, () => setInviteRole(prev));
        }} />}
      />
      <CardRow label="Manage link" last
       feedback={
        (patchError?.field === "inviteLink" || patchError?.field === "inviteDisable")
         ? <span className="text-xs text-destructive">{patchError.message}</span>
         : null
       }
       control={
        <div className="flex gap-2">
         <Button type="button" variant="outline" size="sm" onClick={() => setRegenerateOpen(true)} disabled={saving === "inviteLink"}>
          {saving === "inviteLink" ? "Regenerating…" : "Regenerate"}
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
      <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="mt-4 active:scale-[0.97]">
       Delete workspace…
      </Button>
     </div>
    </div>
   </div>

   <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) { setDeleteOpen(o); if (!o) { setDeleteName(""); setDeleteError(""); } } }}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
      <AlertDialogDescription>
       This will permanently delete <strong className="text-foreground">{workspace.name}</strong> and all its pages, files, and member data. This cannot be undone.
       <br /><br />
       Type <strong className="text-foreground">{workspace.name}</strong> to confirm.
      </AlertDialogDescription>
     </AlertDialogHeader>
     <Input value={deleteName} onChange={e => setDeleteName(e.target.value)} placeholder={workspace.name}
      className="w-full border-destructive/40 focus-visible:border-destructive" />
     {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
     <AlertDialogFooter>
      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
       onClick={(e) => { e.preventDefault(); handleDelete(); }}
       disabled={deleting || deleteName !== workspace.name}
       className="disabled:cursor-not-allowed disabled:opacity-40"
      >
       {deleting ? "Deleting…" : "Delete workspace"}
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

   <ConfirmDialog
    open={regenerateOpen}
    onOpenChange={setRegenerateOpen}
    title="Regenerate the invite link?"
    description="The current link stops working immediately — anyone who has it but hasn't joined yet will no longer be able to use it."
    confirmLabel="Regenerate"
    confirmLoadingLabel="Regenerating…"
    loading={saving === "inviteLink"}
    onConfirm={generateLink}
   />
  </div>
 );
}
