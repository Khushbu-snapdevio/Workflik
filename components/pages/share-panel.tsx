"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  XIcon, CopyIcon, CheckIcon, GlobeIcon, LockIcon,
  UserPlusIcon, LinkIcon, CaretDownIcon,
} from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────────────────────────────

type AccessLevel = "full_access" | "can_edit" | "can_comment" | "can_view";
type PublicLevel = "can_view" | "can_comment";

interface PermissionGrant {
  id:          string;
  userId:      string | null;
  guestEmail:  string | null;
  accessLevel: AccessLevel;
  userName:    string | null;
  userEmail:   string | null;
  userImage:   string | null;
}

interface PublicLink {
  id:          string;
  token:       string;
  accessLevel: PublicLevel;
  isActive:    boolean;
}

const ACCESS_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "can_edit",     label: "Can edit" },
  { value: "can_comment",  label: "Can comment" },
  { value: "can_view",     label: "Can view" },
  { value: "full_access",  label: "Full access" },
];

const PUBLIC_OPTIONS: { value: PublicLevel; label: string }[] = [
  { value: "can_view",    label: "Can view" },
  { value: "can_comment", label: "Can comment" },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface SharePanelProps {
  pageId:          string;
  currentUserId:   string;
  isPrivate:       boolean;
  onClose:         () => void;
  onPrivateToggle: (isPrivate: boolean) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Avatar({ name, image }: { name?: string | null; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        className="h-7 w-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-rose-500",   "bg-amber-500", "bg-indigo-500",
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className={`h-7 w-7 rounded-full ${color} flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 select-none`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function SelectField({
  value, options, onChange, disabled, className = "",
}: {
  value:      string;
  options:    { value: string; label: string }[];
  onChange:   (v: string) => void;
  disabled?:  boolean;
  className?: string;
}) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none cursor-pointer rounded-md border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-[12px] text-gray-700 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <CaretDownIcon
        size={11}
        weight="bold"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </p>
  );
}

function Toggle({
  checked, onChange, disabled,
}: {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-[22px] w-10 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50 ${
        checked ? "bg-violet-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-[17px] w-[17px] transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[19px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SharePanel({
  pageId, currentUserId, isPrivate: initialPrivate, onClose, onPrivateToggle,
}: SharePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const [permissions, setPermissions]     = useState<PermissionGrant[]>([]);
  const [publicLink, setPublicLink]       = useState<PublicLink | null>(null);
  const [isPrivate, setIsPrivate]         = useState(initialPrivate);
  const [loading, setLoading]             = useState(true);

  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteLevel, setInviteLevel]     = useState<AccessLevel>("can_edit");
  const [inviting, setInviting]           = useState(false);
  const [inviteError, setInviteError]     = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [copied, setCopied]               = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [savingPrivate, setSavingPrivate]   = useState(false);

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
      const res  = await fetch(`/api/pages/${pageId}/guests/invite`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, accessLevel: inviteLevel }),
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
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId, accessLevel: level }),
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
    setTogglingPublic(true);
    const res  = await fetch(`/api/pages/${pageId}/public-link`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: on, accessLevel: publicLink?.accessLevel ?? "can_view" }),
    });
    if (res.ok) setPublicLink((await res.json()).link);
    setTogglingPublic(false);
  }

  async function changePublicLevel(level: PublicLevel) {
    const res  = await fetch(`/api/pages/${pageId}/public-link`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: true, accessLevel: level }),
    });
    if (res.ok) setPublicLink((await res.json()).link);
  }

  function copyLink() {
    if (!publicLink?.token) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${publicLink.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Private toggle ────────────────────────────────────────────────────────

  async function handlePrivateToggle() {
    setSavingPrivate(true);
    const next = !isPrivate;
    try {
      await onPrivateToggle(next);
      setIsPrivate(next);
    } finally {
      setSavingPrivate(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const isPublicActive = publicLink?.isActive ?? false;
  const publicUrl      = publicLink?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publicLink.token}`
    : "";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      className="w-[460px] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200/80 bg-white shadow-xl overflow-hidden flex flex-col"
      style={{ maxHeight: "calc(100vh - 80px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="text-[14px] font-semibold text-gray-900 tracking-tight">Share</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <XIcon size={14} weight="bold" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* Invite people */}
        <div className="px-5 pt-4 pb-4">
          <SectionLabel>Invite people</SectionLabel>
          <div className="space-y-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
              placeholder="Add email address…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-300 transition-all"
            />
            <div className="flex items-center gap-2">
              <SelectField
                value={inviteLevel}
                options={ACCESS_OPTIONS.filter((o) => o.value !== "full_access")}
                onChange={(v) => setInviteLevel(v as AccessLevel)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={invite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet-700 active:bg-violet-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {inviting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <UserPlusIcon size={13} weight="bold" />
                )}
                Invite
              </button>
            </div>
          </div>
          {inviteError && (
            <p className="mt-2 text-[12px] text-red-500">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-[12px] text-emerald-600">Invitation sent successfully.</p>
          )}
        </div>

        <div className="h-px bg-gray-100 mx-5" />

        {/* People with access */}
        <div className="px-5 py-4">
          <SectionLabel>People with access</SectionLabel>

          {loading ? (
            <div className="flex items-center justify-center py-5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-violet-500" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <LockIcon size={12} className="text-gray-400" />
              </div>
              <p className="text-[12px] text-gray-500">Only you have access to this page.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {permissions.map((grant) => {
                const isCurrentUser = grant.userId === currentUserId;
                const displayName   = grant.userName ?? grant.guestEmail ?? "Unknown";
                const displayEmail  = grant.userEmail ?? grant.guestEmail ?? "";
                const isGuest       = !grant.userId || !!grant.guestEmail;
                const showEmail     = displayEmail && displayEmail !== displayName;

                return (
                  <div
                    key={grant.id}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Avatar name={displayName} image={grant.userImage} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-medium text-gray-800 truncate leading-tight">
                          {displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[11px] text-gray-400 flex-shrink-0">(you)</span>
                        )}
                        {isGuest && (
                          <span className="flex-shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[9px] font-semibold text-amber-600 leading-none">
                            GUEST
                          </span>
                        )}
                      </div>
                      {showEmail && (
                        <p className="text-[11px] text-gray-400 truncate leading-tight">
                          {displayEmail}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
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
                          onClick={() => removeGrant(grant)}
                          title="Remove access"
                          className="rounded-md p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <XIcon size={12} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100 mx-5" />

        {/* Publish to web */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-blue-50">
                <GlobeIcon size={14} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900 leading-tight">Publish to web</p>
                <p className="mt-0.5 text-[11px] text-gray-400 leading-snug">
                  {isPublicActive
                    ? "Anyone with the link can access this page"
                    : "Share publicly with anyone on the internet"}
                </p>
              </div>
            </div>
            <Toggle
              checked={isPublicActive}
              onChange={togglePublicLink}
              disabled={togglingPublic}
            />
          </div>

          {isPublicActive && publicLink && (
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <LinkIcon size={11} weight="bold" className="text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-[11px] text-gray-500 font-mono">
                  {publicUrl}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {copied
                    ? <CheckIcon size={11} weight="bold" className="text-emerald-500" />
                    : <CopyIcon size={11} />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500">Visitors can</span>
                <SelectField
                  value={publicLink.accessLevel}
                  options={PUBLIC_OPTIONS}
                  onChange={(v) => changePublicLevel(v as PublicLevel)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100 mx-5" />

        {/* Page settings */}
        <div className="px-5 py-4">
          <SectionLabel>Page settings</SectionLabel>
          <button
            type="button"
            onClick={handlePrivateToggle}
            disabled={savingPrivate}
            className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-60 group"
          >
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
              isPrivate ? "bg-amber-100" : "bg-gray-100 group-hover:bg-gray-200"
            }`}>
              <LockIcon
                size={14}
                weight={isPrivate ? "fill" : "regular"}
                className={isPrivate ? "text-amber-600" : "text-gray-500"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium leading-tight ${isPrivate ? "text-amber-800" : "text-gray-800"}`}>
                {isPrivate ? "Private page" : "Make private"}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
                {isPrivate
                  ? "Only you and invited people can see this."
                  : "Hide from workspace members — only you can access."}
              </p>
            </div>
            {savingPrivate ? (
              <span className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
            ) : isPrivate ? (
              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Private
              </span>
            ) : null}
          </button>
        </div>

      </div>
    </div>
  );
}
