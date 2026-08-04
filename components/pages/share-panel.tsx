"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react";
import {
 X, Check, Globe, Lock, Building2,
 UserPlus, Link2, ChevronDown,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { getAvatarColor } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type AccessLevel = "full_access" | "can_edit" | "can_comment" | "can_view";
type PublicLevel = "can_view" | "can_comment";

interface PermissionGrant {
 id:     string;
 userId:   string | null;
 guestEmail: string | null;
 accessLevel: AccessLevel;
 userName:  string | null;
 userEmail:  string | null;
 userImage:  string | null;
}

interface PublicLink {
 id:     string;
 token:    string;
 accessLevel: PublicLevel;
 isActive:  boolean;
}

const ACCESS_OPTIONS: { value: AccessLevel; label: string }[] = [
 { value: "can_edit",   label: "Can edit" },
 { value: "can_comment", label: "Can comment" },
 { value: "can_view",   label: "Can view" },
 { value: "full_access", label: "Full access" },
];

const PUBLIC_OPTIONS: { value: PublicLevel; label: string }[] = [
 { value: "can_view",  label: "Can view" },
 { value: "can_comment", label: "Can comment" },
];

type GeneralAccess = "invited" | "workspace" | "public";

const GENERAL_ACCESS_OPTIONS: {
 value: GeneralAccess;
 label: string;
 icon: typeof Lock;
}[] = [
 { value: "invited",  label: "Only people invited",  icon: Lock },
 { value: "workspace", label: "Workspace members",   icon: Building2 },
 { value: "public",   label: "Anyone with the link",  icon: Globe },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface SharePanelProps {
 pageId:      string;
 pageShortId:   string;
 workspaceSlug:  string;
 currentUserId:  string;
 currentUserName: string | null;
 currentUserEmail: string | null;
 currentUserImage: string | null;
 isPrivate:    boolean;
 onClose:     () => void;
 onPrivateToggle: (isPrivate: boolean) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────


function Avatar({ name, image }: { name?: string | null; image?: string | null }) {
 const [failed, setFailed] = useState(false);
 useEffect(() => { setFailed(false); }, [image]);
 if (image && !failed) {
  return (
   <img
    src={image}
    alt={name ?? ""}
    className="size-7 shrink-0 rounded-full object-cover"
    onError={() => setFailed(true)}
   />
  );
 }
 return (
  <div
   className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white select-none ${getAvatarColor(name ?? "?")}`}
  >
   {name?.[0]?.toUpperCase() ?? "?"}
  </div>
 );
}

function SelectField({
 value, options, onChange, disabled, className = "",
}: {
 value:   string;
 options:  { value: string; label: string }[];
 onChange:  (v: string) => void;
 disabled?: boolean;
 className?: string;
}) {
 return (
  <select
   value={value}
   disabled={disabled}
   onChange={(e) => onChange(e.target.value)}
   className={`h-9 shrink-0 rounded-sm border border-input bg-background px-2.5 text-xs text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
   {options.map((o) => (
    <option key={o.value} value={o.value}>{o.label}</option>
   ))}
  </select>
 );
}

function GeneralAccessControl({
 value, onChange, disabled,
}: {
 value:   GeneralAccess;
 onChange:  (v: GeneralAccess) => void;
 disabled?: boolean;
}) {
 const current = GENERAL_ACCESS_OPTIONS.find((o) => o.value === value) ?? GENERAL_ACCESS_OPTIONS[1]!;
 const Icon  = current.icon;

 return (
  <Listbox value={value} onChange={onChange} disabled={disabled}>
   <ListboxButton className="h-9 w-full flex items-center gap-2.5 rounded-sm border border-border bg-muted/20 px-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60 data-open:bg-muted/40">
    <Icon size={14} className="shrink-0 text-muted-foreground" />
    <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-foreground">{current.label}</span>
    {disabled ? (
     <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
    ) : (
     <ChevronDown size={13} className="shrink-0 text-muted-foreground transition-transform duration-150 data-open:rotate-180" />
    )}
   </ListboxButton>

   <ListboxOptions
    anchor={{ to: "bottom start", gap: 4 }}
    transition
    className="z-600 w-(--button-width) overflow-hidden rounded-md border border-border bg-popover p-1 transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95"
   >
    {GENERAL_ACCESS_OPTIONS.map((o) => {
     const OptionIcon = o.icon;
     return (
      <ListboxOption
       key={o.value}
       value={o.value}
       className="flex w-full cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-left transition-colors data-focus:bg-accent"
      >
       {({ selected }) => (
        <>
         <OptionIcon size={14} className={`shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
         <span className={`flex-1 min-w-0 truncate text-[13px] font-medium ${selected ? "text-primary" : "text-foreground"}`}>{o.label}</span>
         {selected && <Check size={13} className="shrink-0 text-primary" />}
        </>
       )}
      </ListboxOption>
     );
    })}
   </ListboxOptions>
  </Listbox>
 );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
 return (
  <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
   {children}
  </p>
 );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SharePanel({
 pageId, pageShortId, workspaceSlug, currentUserId, currentUserName, currentUserEmail, currentUserImage,
 isPrivate: initialPrivate, onClose, onPrivateToggle,
}: SharePanelProps) {
 const panelRef = useRef<HTMLDivElement>(null);

 const [permissions, setPermissions]   = useState<PermissionGrant[]>([]);
 const [publicLink, setPublicLink]    = useState<PublicLink | null>(null);
 const [isPrivate, setIsPrivate]     = useState(initialPrivate);
 const [loading, setLoading]       = useState(true);

 const [inviteEmail, setInviteEmail]   = useState("");
 const [inviting, setInviting]      = useState(false);
 const [inviteError, setInviteError]   = useState("");
 const [inviteSuccess, setInviteSuccess] = useState(false);

 const [copied, setCopied]      = useState(false);
 const [savingAccess, setSavingAccess] = useState(false);
 const [pendingRemoveGrant, setPendingRemoveGrant] = useState<PermissionGrant | null>(null);

 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 // ── Load ──────────────────────────────────────────────────────────────────

 const load = useCallback(async () => {
  setLoading(true);
  const [permRes, linkRes] = await Promise.all([
   fetch(`/api/pages/${pageId}/permissions`),
   fetch(`/api/pages/${pageId}/public-link`),
  ]);
  if (permRes.ok) setPermissions((await permRes.json()).permissions ?? []);
  if (linkRes.ok) setPublicLink((await linkRes.json()).link);
  setLoading(false);
 }, [pageId]);

 useEffect(() => { load(); }, [load]);

 useEffect(() => {
  function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
 }, [onClose]);

 // ── Invite ────────────────────────────────────────────────────────────────

 async function invite() {
  const email = inviteEmail.trim();
  if (!email) return;
  setInviting(true);
  setInviteError("");
  setInviteSuccess(false);
  try {
   const res = await fetch(`/api/pages/${pageId}/guests/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:  JSON.stringify({ email, accessLevel: "can_edit" }),
   });
   const data = await res.json();
   if (!res.ok) { setInviteError(data.error ?? "Failed to invite"); return; }
   setInviteEmail("");
   setInviteSuccess(true);
   setTimeout(() => setInviteSuccess(false), 3000);
   await load();
  } finally {
   setInviting(false);
  }
 }

 // ── Permission management ─────────────────────────────────────────────────

 async function changeLevel(userId: string, level: AccessLevel) {
  await fetch(`/api/pages/${pageId}/permissions`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ userId, accessLevel: level }),
  });
  setPermissions((prev) =>
   prev.map((p) => (p.userId === userId ? { ...p, accessLevel: level } : p))
  );
 }

 async function removeGrant(grant: PermissionGrant) {
  if (grant.userId) {
   await fetch(`/api/pages/${pageId}/permissions?userId=${grant.userId}`, { method: "DELETE" });
  } else if (grant.guestEmail) {
   await fetch(`/api/pages/${pageId}/guests/${grant.id}`, { method: "DELETE" });
  }
  setPermissions((prev) => prev.filter((p) => p.id !== grant.id));
 }

 // ── Public link ───────────────────────────────────────────────────────────

 async function togglePublicLink(on: boolean) {
  const res = await fetch(`/api/pages/${pageId}/public-link`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ isActive: on, accessLevel: publicLink?.accessLevel ?? "can_view" }),
  });
  if (res.ok) setPublicLink((await res.json()).link);
 }

 async function changePublicLevel(level: PublicLevel) {
  const res = await fetch(`/api/pages/${pageId}/public-link`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ isActive: true, accessLevel: level }),
  });
  if (res.ok) setPublicLink((await res.json()).link);
 }

 function copyLink() {
  navigator.clipboard.writeText(shareUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
 }

 // ── General access ───────────────────────────────────────────────────────

 async function setPrivate(next: boolean) {
  await onPrivateToggle(next);
  setIsPrivate(next);
 }

 async function changeGeneralAccess(next: GeneralAccess) {
  setSavingAccess(true);
  try {
   if (next === "public") {
    if (isPrivate) await setPrivate(false);
    if (!isPublicActive) await togglePublicLink(true);
   } else {
    if (isPublicActive) await togglePublicLink(false);
    await setPrivate(next === "invited");
   }
  } finally {
   setSavingAccess(false);
  }
 }

 // ── Computed ──────────────────────────────────────────────────────────────

 const isPublicActive = publicLink?.isActive ?? false;
 const generalAccess: GeneralAccess = isPublicActive ? "public" : isPrivate ? "invited" : "workspace";
 const origin     = typeof window !== "undefined" ? window.location.origin : "";
 const shareUrl    = generalAccess === "public" && publicLink?.token
  ? `${origin}/p/${publicLink.token}`
  : `${origin}/app/${workspaceSlug}/${pageShortId}`;

 // ── Render ────────────────────────────────────────────────────────────────

 return (
  <>
  <div
   ref={panelRef}
   className="w-115 max-w-[calc(100vw-32px)] rounded-md border border-border bg-card overflow-hidden flex flex-col"
   style={{ maxHeight: "calc(100vh - 80px)" }}
  >
   {/* Header */}
   <div className="flex items-center justify-between px-5 py-4 border-b border-border">
    <span className="text-sm font-semibold text-foreground tracking-tight">Share</span>
    <button
     type="button"
     onClick={onClose}
     className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
     <X size={14} />
    </button>
   </div>

   {/* Scrollable body */}
   <div className="flex-1 overflow-y-auto overscroll-contain">

    {/* Invite people */}
    <div className="px-5 pt-3 pb-3">
     <div className="flex items-center gap-2">
      <input
       type="email"
       value={inviteEmail}
       onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(false); }}
       onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
       placeholder="Email or group, separated by commas"
       className="flex-1 min-w-0 rounded-sm border border-border bg-muted/30 px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground-subtle focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
      />
      <button
       type="button"
       onClick={invite}
       disabled={inviting || !inviteEmail.trim()}
       className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
       {inviting && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
       )}
       Invite
      </button>
     </div>
     {inviteError && (
      <p className="mt-2 text-xs text-destructive">{inviteError}</p>
     )}
     {inviteSuccess && (
      <p className="mt-2 text-xs text-primary font-medium">Invitation sent successfully.</p>
     )}
    </div>

    <div className="h-px bg-border mx-5" />

    {/* People with access */}
    <div className="px-5 py-3">
     <div className="space-y-0.5">
      {/* Owner — always shown, not editable */}
      <div className="flex items-center gap-3 rounded-sm px-2 py-1.5">
       <Avatar name={currentUserName ?? currentUserEmail} image={currentUserImage} />
       <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
         <span className="text-[13px] font-medium text-foreground truncate leading-tight">
          {currentUserName ?? currentUserEmail ?? "You"}
         </span>
         <span className="text-xs text-muted-foreground shrink-0">(you)</span>
        </div>
        {currentUserName && currentUserEmail && (
         <p className="text-xs text-muted-foreground truncate leading-tight">{currentUserEmail}</p>
        )}
       </div>
       <span className="text-xs text-muted-foreground shrink-0">Full access</span>
      </div>

      {loading ? (
       <div className="flex items-center justify-center py-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
       </div>
      ) : permissions.map((grant) => {
        const isCurrentUser = grant.userId === currentUserId;
        const displayName  = grant.userName ?? grant.guestEmail ?? "Unknown";
        const displayEmail = grant.userEmail ?? grant.guestEmail ?? "";
        const isGuest    = !grant.userId || !!grant.guestEmail;
        const showEmail   = displayEmail && displayEmail !== displayName;

        return (
         <div
          key={grant.id}
          className="group flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-muted/40 transition-colors"
         >
          <Avatar name={displayName} image={grant.userImage} />

          <div className="flex-1 min-w-0">
           <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-medium text-foreground truncate leading-tight">
             {displayName}
            </span>
            {isCurrentUser && (
             <span className="text-xs text-muted-foreground shrink-0">(you)</span>
            )}
            {isGuest && (
             <span className="shrink-0 rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-px text-xs font-semibold text-primary leading-none">
              GUEST
             </span>
            )}
           </div>
           {showEmail && (
            <p className="text-xs text-muted-foreground truncate leading-tight">
             {displayEmail}
            </p>
           )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
           <SelectField
            value={grant.accessLevel}
            options={ACCESS_OPTIONS}
            onChange={(v) => {
             if (grant.userId) changeLevel(grant.userId, v as AccessLevel);
            }}
            disabled={isCurrentUser || !grant.userId}
           />
           {!isCurrentUser && (
            <button
             type="button"
             onClick={() => setPendingRemoveGrant(grant)}
             onMouseEnter={(e) => showTooltip("Remove access", e)}
             onMouseLeave={hideTooltip}
             className="rounded-sm p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
            >
             <X size={12} />
            </button>
           )}
          </div>
         </div>
        );
       })}
     </div>
    </div>

    <div className="h-px bg-border mx-5" />

    {/* General access */}
    <div className="px-5 py-3">
     <SectionLabel>General access</SectionLabel>
     <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
       <GeneralAccessControl
        value={generalAccess}
        onChange={changeGeneralAccess}
        disabled={savingAccess}
       />
      </div>
      {generalAccess === "public" && publicLink && (
       <SelectField
        value={publicLink.accessLevel}
        options={PUBLIC_OPTIONS}
        onChange={(v) => changePublicLevel(v as PublicLevel)}
        className="w-36"
       />
      )}
     </div>
    </div>

   </div>

   {/* Footer */}
   <div className="flex items-center justify-end border-t border-border px-5 py-3">
    <button
     type="button"
     onClick={copyLink}
     className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/30 hover:bg-primary/5 transition-colors"
    >
     {copied
      ? <Check size={12} className="text-primary" />
      : <Link2 size={12} />}
     {copied ? "Copied!" : "Copy link"}
    </button>
   </div>
  </div>

  <ConfirmDialog
   open={!!pendingRemoveGrant}
   onOpenChange={(o) => !o && setPendingRemoveGrant(null)}
   title="Remove access?"
   description={`${pendingRemoveGrant?.userName ?? pendingRemoveGrant?.guestEmail ?? "This person"} will lose access to this page immediately.`}
   confirmLabel="Remove"
   onConfirm={() => { if (pendingRemoveGrant) { removeGrant(pendingRemoveGrant); setPendingRemoveGrant(null); } }}
  />

  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}
  </>
 );
}
