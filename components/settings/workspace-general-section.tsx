"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/* ── Emoji catalogue ──────────────────────────────────────── */
const EMOJI_CATEGORIES = [
  {
    key: "work",  label: "Work",
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
  const [open,    setOpen]   = useState(false);
  const [cat,     setCat]    = useState<string>("work");
  const [pos,     setPos]    = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef   = useRef<HTMLButtonElement>(null);
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
      className="w-[310px] overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#37352f]">Choose an icon</p>
        <button type="button" onClick={() => setOpen(false)}
          className="flex size-6 items-center justify-center rounded-full text-[#9b9b9b] transition-colors hover:bg-[#f0f0ee] hover:text-[#37352f]">
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3"><path d="M1 1l8 8M9 1L1 9"/></svg>
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 border-b border-black/[0.06] px-3 pt-2.5">
        {EMOJI_CATEGORIES.map(c => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)}
            className={`rounded-t-[8px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              cat === c.key ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "text-[#787774] hover:text-[#37352f]"
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-3">
        {active.emojis.map(e => (
          <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
            className={`flex size-9 items-center justify-center rounded-[8px] text-[19px] transition-all hover:scale-110 active:scale-95 ${
              value === e ? "bg-[#f59e0b]/10 ring-1 ring-[#f59e0b]/40" : "hover:bg-[#f5f4f2]"
            }`}>
            {e}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-black/[0.06] px-4 py-2.5">
        {value ? (
          <>
            <span className="text-[18px]">{value}</span>
            <p className="flex-1 text-[12px] text-[#787774]">Selected</p>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-red-500 transition-colors hover:bg-red-50">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3"><path d="M2 2l8 8M10 2L2 10"/></svg>
              Remove icon
            </button>
          </>
        ) : (
          <p className="text-[12px] text-[#b3b0aa]">Click an emoji to select it</p>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} title="Change icon"
        className="flex size-12 items-center justify-center rounded-[12px] border-2 border-dashed border-black/[0.12] bg-[#fafaf9] text-[26px] leading-none transition-all hover:border-[#f59e0b]/60 hover:bg-amber-50 active:scale-95">
        {value || "📁"}
      </button>
      {panel}
    </>
  );
}

/* ── Types ────────────────────────────────────────────────── */
interface WorkspaceData {
  id:                string;
  name:              string;
  slug:              string;
  icon:              string | null;
  defaultPageAccess: string | null;
  inviteLinkToken:   string | null;
  inviteLinkActive:  boolean | null;
  inviteLinkRole:    string | null;
}
interface Props { workspace: WorkspaceData; bytesUsed: number; memberCount: number }

const QUOTA  = 5 * 1024 * 1024 * 1024;
const ACCESS = [
  { value: "full",      label: "Full access" },
  { value: "edit",      label: "Can edit" },
  { value: "comment",   label: "Can comment" },
  { value: "view",      label: "View only" },
  { value: "no_access", label: "No access" },
];

function fmt(b: number) {
  if (b === 0) return "0 B";
  const gb = b / 1073741824; if (gb >= 1) return `${gb.toFixed(2).replace(/\.?0+$/, "")} GB`;
  const mb = b / 1048576;    if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

function SectionLabel({ label }: { label: string }) {
  return <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-[#b3b0aa]">{label}</p>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-black/[0.07] bg-white ${className}`}>
      {children}
    </div>
  );
}
function CardRow({ label, desc, control, last }: { label: string; desc?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-6 px-5 py-4 ${!last ? "border-b border-black/[0.05]" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#37352f]">{label}</p>
        {desc && <p className="mt-0.5 text-[12.5px] text-[#787774]">{desc}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
function ChevronSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-[10px] border border-black/[0.1] bg-[#fafaf9] py-2 pl-3 pr-8 text-[13.5px] font-medium text-[#37352f] outline-none transition-colors focus:border-[#f59e0b] focus:bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-[#787774]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export function WorkspaceGeneralSection({ workspace, bytesUsed, memberCount }: Props) {
  const router = useRouter();
  const [name,         setName]         = useState(workspace.name);
  const [slug,         setSlug]         = useState(workspace.slug);
  const [icon,         setIcon]         = useState(workspace.icon ?? "");
  const [access,       setAccess]       = useState(workspace.defaultPageAccess ?? "view");
  const [inviteActive, setInviteActive] = useState(workspace.inviteLinkActive ?? false);
  const [inviteToken,  setInviteToken]  = useState(workspace.inviteLinkToken ?? "");
  const [inviteRole,   setInviteRole]   = useState(workspace.inviteLinkRole ?? "editor");
  const [saving,       setSaving]       = useState<string | null>(null);
  const [saved,        setSaved]        = useState<string | null>(null);
  const [slugError,    setSlugError]    = useState("");
  const [copied,       setCopied]       = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteName,   setDeleteName]   = useState("");
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState("");

  const nameRef = useRef(name); nameRef.current = name;
  const slugRef = useRef(slug); slugRef.current = slug;

  async function patchWs(patch: Record<string, unknown>) {
    const field = Object.keys(patch)[0]!;
    setSaving(field); setSaved(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      if (res.ok) {
        const d = await res.json();
        if (field === "slug" && d.slug !== workspace.slug) router.replace(`/app/${d.slug}/settings/general`);
        setSaved(field); setTimeout(() => setSaved(null), 2500); setSlugError("");
      } else {
        const d = await res.json().catch(() => ({}));
        if (field === "slug") setSlugError(d.error ?? "Slug already taken");
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

  const pct       = Math.min((bytesUsed / QUOTA) * 100, 100);
  const isNear    = pct >= 90;
  const isAtLim   = pct >= 100;
  const origin    = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl  = inviteToken ? `${origin}/invite/${inviteToken}` : "";
  const inviteShort = inviteUrl.replace(/^https?:\/\//, "");

  function copy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-[640px] px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] shadow-[0_4px_12px_rgba(245,158,11,0.35)]">
          <svg viewBox="0 0 20 20" fill="white" className="size-5.5">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[#1c1917]">General</h1>
          <p className="text-[13.5px] text-[#78716c]">Manage your workspace name, URL, and settings.</p>
        </div>
      </div>

      {/* ── WORKSPACE IDENTITY ── */}
      <div className="mb-7">
        <SectionLabel label="Workspace" />
        <Card>
          {/* Live preview banner */}
          <div className="flex items-center gap-3.5 border-b border-black/[0.05] bg-gradient-to-r from-[#fafaf9] to-[#f5f4f2] px-5 py-4">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-white text-[22px] shadow-[0_1px_6px_rgba(0,0,0,0.12)]">
              {icon || "📁"}
            </span>
            <div>
              <p className="text-[14.5px] font-semibold text-[#1c1917]">{name || "Workspace name"}</p>
              <p className="text-[11.5px] text-[#78716c]">Sidebar preview</p>
            </div>
            <div className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Preview</div>
          </div>

          {/* Icon row — picker + remove link inline */}
          <div className={`flex items-center justify-between gap-6 px-5 py-4 border-b border-black/[0.05]`}>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#37352f]">Icon</p>
              <p className="mt-0.5 text-[12.5px] text-[#787774]">Click to choose an emoji for your workspace.</p>
              {icon && (
                <button type="button" onClick={() => changeIcon("")}
                  className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-red-500 transition-colors hover:text-red-700">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3"><path d="M2 2l8 8M10 2L2 10"/></svg>
                  Remove icon
                </button>
              )}
            </div>
            <EmojiPicker value={icon} onChange={changeIcon} />
          </div>

          {/* Name row */}
          <div className={`flex items-center justify-between gap-6 px-5 py-4 border-b border-black/[0.05]`}>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#37352f]">Name</p>
              <p className="mt-0.5 text-[12.5px] text-[#787774]">Shown in the sidebar and all emails.</p>
            </div>
            <div className="relative shrink-0">
              <input value={name} onChange={e => setName(e.target.value)}
                onBlur={() => { const v = nameRef.current.trim(); if (v && v !== workspace.name) patchWs({ name: v }); }}
                className="w-[220px] rounded-[10px] border border-black/[0.1] bg-[#fafaf9] px-3 py-2 text-[14px] text-[#37352f] outline-none transition-colors focus:border-[#f59e0b] focus:bg-white" />
              {saved === "name" && <span className="absolute -bottom-5 right-0 text-[11px] text-[#2383e2]">Saved ✓</span>}
            </div>
          </div>

          {/* Slug row */}
          <div className={`flex items-center justify-between gap-6 px-5 py-4`}>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#37352f]">URL</p>
              <p className="mt-0.5 text-[12.5px] text-[#787774]">Changing this will redirect existing links.</p>
            </div>
            <div className="shrink-0">
              <div className="flex items-center overflow-hidden rounded-[10px] border border-black/[0.1] bg-[#fafaf9] transition-colors focus-within:border-[#f59e0b] focus-within:bg-white">
                <span className="select-none border-r border-black/[0.06] bg-[#f3f3f0] px-2.5 py-2 text-[12px] font-medium text-[#787774]">/app/</span>
                <input value={slug}
                  onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"")); setSlugError(""); }}
                  onBlur={() => { const v = slugRef.current.trim(); if (v && v !== workspace.slug) patchWs({ slug: v }); }}
                  className="w-[140px] bg-transparent px-2.5 py-2 text-[14px] text-[#37352f] outline-none" />
              </div>
              {slugError && <p className="mt-1 text-[11.5px] text-red-500">{slugError}</p>}
              {saved === "slug" && <p className="mt-1 text-[11.5px] text-[#2383e2]">Saved ✓</p>}
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
            <div className="border-b border-black/[0.05] bg-gradient-to-r from-[#eff6ff] to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#2383e2]/10">
                  <svg viewBox="0 0 14 14" fill="none" stroke="#2383e2" strokeWidth="1.5" strokeLinecap="round" className="size-4"><path d="M8 1.5h4.5v4.5M12.5 1.5L6 8M5.5 2.5H2A.5.5 0 001.5 3v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V8.5"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12.5px] text-[#37352f]">{inviteShort}</p>
                  <p className="text-[11.5px] text-[#787774]">Anyone with this link can join your workspace</p>
                </div>
                <button type="button" onClick={copy}
                  className={`shrink-0 rounded-[8px] px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95 ${
                    copied ? "bg-green-100 text-green-700" : "bg-[#2383e2] text-white hover:bg-[#1a6fc0]"
                  }`}>
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>
            </div>
            <CardRow label="Join as" desc="New members via this link will be assigned this role."
              control={<ChevronSelect value={inviteRole} options={[{value:"editor",label:"Editor"},{value:"viewer",label:"Viewer"}]}
                onChange={v => { setInviteRole(v); patchWs({ inviteLinkRole: v }); }} />}
            />
            <CardRow label="Manage link" last
              control={
                <div className="flex gap-2">
                  <button type="button" onClick={generateLink} disabled={saving === "inviteLink"}
                    className="rounded-[8px] border border-black/[0.1] bg-[#fafaf9] px-3.5 py-1.5 text-[13px] font-medium text-[#37352f] hover:bg-[#f0f0ee] disabled:opacity-50 transition-colors">
                    Regenerate
                  </button>
                  <button type="button" onClick={disableLink} disabled={saving === "inviteDisable"}
                    className="rounded-[8px] border border-red-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors">
                    Disable
                  </button>
                </div>
              }
            />
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-4 px-5 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f4f2]">
                <svg viewBox="0 0 20 20" fill="none" stroke="#b3b0aa" strokeWidth="1.5" strokeLinecap="round" className="size-5"><path d="M13 10a3 3 0 11-6 0 3 3 0 016 0zM17.5 10c0 4.14-3.36 7.5-7.5 7.5S2.5 14.14 2.5 10 5.86 2.5 10 2.5 17.5 5.86 17.5 10z"/><path d="M10 7v6M7 10h6"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#37352f]">No active invite link</p>
                <p className="mt-0.5 text-[12.5px] text-[#787774]">Generate a shareable link to invite new members.</p>
              </div>
              <button type="button" onClick={generateLink} disabled={saving === "inviteLink"}
                className="shrink-0 rounded-[10px] bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] disabled:opacity-50 transition-all active:scale-95 hover:brightness-105">
                {saving === "inviteLink" ? "Generating…" : "Generate link"}
              </button>
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
              <p className={`text-[28px] font-bold leading-tight tracking-tight ${isAtLim ? "text-red-600" : isNear ? "text-amber-600" : "text-[#1c1917]"}`}>
                {fmt(bytesUsed)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#787774]">
                used of {fmt(QUOTA)} · {memberCount} member{memberCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[20px] font-bold ${isAtLim ? "text-red-600" : isNear ? "text-amber-500" : "text-[#2383e2]"}`}>
                {pct.toFixed(0)}%
              </p>
              <p className="text-[12px] text-[#78716c]">{fmt(QUOTA - bytesUsed)} free</p>
            </div>
          </div>
          <div className="mt-4 h-[8px] w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isAtLim ? "bg-red-500" : isNear ? "bg-amber-400" : "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]"}`}
              style={{ width: `${Math.max(pct, 1.5)}%` }}
            />
          </div>
          {(isNear || isAtLim) && (
            <div className={`mt-3 flex items-center gap-2 text-[12.5px] font-medium ${isAtLim ? "text-red-700" : "text-amber-700"}`}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5 shrink-0"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7"/><circle cx="7" cy="9.5" r=".5" fill="currentColor"/></svg>
              {isAtLim ? "Storage limit reached — new uploads are blocked." : "Storage is almost full."}
            </div>
          )}
        </Card>
      </div>

      {/* ── DANGER ZONE ── */}
      <div>
        <SectionLabel label="Danger zone" />
        <div className="overflow-hidden rounded-[16px] border border-red-200/70 bg-gradient-to-br from-red-50/40 to-white">
          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-red-100">
                <svg viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" className="size-5"><path d="M8 2L1.5 13.5h13L8 2z"/><path d="M8 7v3M8 12v.5"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#37352f]">Delete this workspace</p>
                <p className="mt-0.5 text-[13px] text-[#787774]">Permanently deletes all pages, files, and member data. This cannot be undone.</p>
              </div>
            </div>
            {!deleteOpen ? (
              <button type="button" onClick={() => setDeleteOpen(true)}
                className="mt-4 rounded-[8px] border border-red-200 bg-white px-4 py-2 text-[13.5px] font-medium text-red-600 transition-all hover:bg-red-50 active:scale-95">
                Delete workspace…
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-[13px] text-[#37352f]">
                  Type <strong className="font-semibold text-red-700">{workspace.name}</strong> to confirm:
                </p>
                <input value={deleteName} onChange={e => setDeleteName(e.target.value)} placeholder={workspace.name}
                  className="w-full rounded-[10px] border border-red-300 bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200" />
                {deleteError && <p className="text-[12.5px] text-red-600">{deleteError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDeleteOpen(false); setDeleteName(""); setDeleteError(""); }}
                    className="rounded-[8px] border border-black/[0.1] bg-white px-4 py-2 text-[13px] font-medium text-[#37352f] hover:bg-[#f7f7f5]">Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={deleting || deleteName !== workspace.name}
                    className="rounded-[8px] bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50 active:scale-95">
                    {deleting ? "Deleting…" : "Delete workspace"}
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
