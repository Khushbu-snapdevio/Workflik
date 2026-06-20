"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettingsUser } from "./settings-user-context";

interface Props {
  workspaceSlug: string;
  workspaceName: string;
  workspaceIcon: string | null;
  isAdmin:       boolean;
}

function avatarColor(s: string): string {
  const cols = ["#e07b54","#6fba9b","#8b7fd4","#e0a54f","#5b9bd4","#d4596e"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return cols[Math.abs(h) % cols.length]!;
}

export function SettingsNav({ workspaceSlug, workspaceName, workspaceIcon, isAdmin }: Props) {
  const pathname = usePathname();
  const base     = `/app/${workspaceSlug}/settings`;
  const { user } = useSettingsUser();   // live — updates when photo changes

  function active(key: string) {
    if (key === "profile") return pathname === base || pathname.startsWith(`${base}/profile`);
    return pathname.startsWith(`${base}/${key}`);
  }

  const displayName = user.name || user.email;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const bg          = avatarColor(displayName);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col overflow-y-auto border-r border-black/[0.06] bg-[#f9f8f7]">

      {/* Workspace header */}
      <div className="px-3 pb-3 pt-5 pr-11">
        <div className="flex items-center gap-3 rounded-[12px] border border-black/[0.07] bg-gradient-to-br from-[#f5f4f2] to-white px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <span className="flex size-[32px] shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#2383e2] to-[#60a5fa] text-[13px] font-bold text-white shadow-[0_2px_6px_rgba(35,131,226,0.35)]">
            {workspaceName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-[#1c1917] leading-tight">{workspaceName}</p>
            <p className="text-[10.5px] text-[#a8a29e] leading-tight">Workspace</p>
          </div>
        </div>
      </div>

      {/* User identity row */}
      <div className="px-3">
        <Link
          href={`${base}/profile`}
          className={`group flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 transition-all ${
            active("profile")
              ? "bg-white text-[#37352f] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)]"
              : "text-[#37352f] hover:bg-black/[0.04]"
          }`}
        >
          {user.image ? (
            <img src={user.image} alt={displayName} className="size-8 rounded-full object-cover shrink-0 ring-2 ring-white" />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white shadow-sm" style={{ background: bg }}>
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{displayName}</p>
            <p className="text-[11px] leading-tight text-[#9b9b9b]">My settings</p>
          </div>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`size-3.5 shrink-0 transition-opacity ${active("profile") ? "opacity-40" : "opacity-0 group-hover:opacity-30"}`}><path d="M5 3l4 4-4 4"/></svg>
        </Link>
      </div>

      <div className="mx-4 my-3 h-px bg-black/[0.06]" />

      {/* Account section */}
      <NavSection label="Account">
        <NavItem href={`${base}/profile`}       active={active("profile")}       icon={<UserIcon />}   label="My profile" />
        <NavItem href={`${base}/notifications`} active={active("notifications")} icon={<BellIcon />}   label="Notifications" />
        <NavItem href={`${base}/sessions`}      active={active("sessions")}      icon={<ShieldIcon />} label="Security & sessions" />
      </NavSection>

      <div className="mx-4 my-2 h-px bg-black/[0.06]" />

      {/* Workspace section */}
      <NavSection label="Workspace">
        {isAdmin
          ? <NavItem href={`${base}/general`} active={active("general")} icon={<GearIcon />}   label="General" />
          : <LockedItem icon={<GearIcon />} label="General" />
        }
        <NavItem href={`${base}/members`} active={active("members")} icon={<PeopleIcon />} label="Members" />
      </NavSection>

      {/* Bottom */}
      <div className="mt-auto px-5 pb-5 pt-4">
        <p className="text-[11px] text-[#c4c1bb]">Settings · Workflik</p>
      </div>
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1">
      <p className="mb-1 px-3 pt-1 text-[10.5px] font-bold uppercase tracking-widest text-[#c4c1bb]">{label}</p>
      {children}
    </div>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className={`group relative flex items-center gap-2.5 rounded-[8px] px-3 py-[7px] text-[13.5px] transition-all ${
        active
          ? "bg-white font-semibold text-[#37352f] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)]"
          : "text-[#5c5a55] hover:bg-black/[0.04] hover:text-[#37352f]"
      }`}
    >
      {active && <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-[#2383e2]" />}
      <span className={`shrink-0 transition-colors ${active ? "text-[#2383e2]" : "text-[#9b9995] group-hover:text-[#5c5a55]"}`}>{icon}</span>
      {label}
    </Link>
  );
}

function LockedItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-3 py-[7px] text-[13.5px] text-[#c4c1bb]">
      <span className="shrink-0">{icon}</span>
      {label}
      <LockIcon />
    </div>
  );
}

function UserIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><circle cx="8" cy="5.5" r="3"/><path d="M2 13.5c0-3 2.686-5 6-5s6 2 6 5"/></svg>;
}
function BellIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><path d="M8 1.5A4 4 0 004 5.5v4l-1.5 2h11L12 9.5v-4A4 4 0 008 1.5z"/><path d="M6.5 13.5a1.5 1.5 0 003 0"/></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><path d="M8 1.5L2.5 4v4c0 3 2.5 5.5 5.5 6.5 3-1 5.5-3.5 5.5-6.5V4L8 1.5z"/></svg>;
}
function GearIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><circle cx="8" cy="8" r="2"/><path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.7 3.3l-1.05 1.05M4.35 11.65L3.3 12.7M12.7 12.7l-1.05-1.05M4.35 4.35L3.3 3.3"/></svg>;
}
function PeopleIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><circle cx="5.5" cy="5" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5S10 11.5 10 14"/><path d="M11.5 2.5a2.5 2.5 0 010 5"/><path d="M13 10.5c1.5.5 2.5 1.8 2.5 3.5"/></svg>;
}
function LockIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-[11px] opacity-40"><rect x="2" y="5" width="8" height="6" rx="1"/><path d="M4 5V3.5a2 2 0 114 0V5"/></svg>;
}
