"use client";

import { Bell, Lock, Settings, Shield, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  workspaceSlug: string;
  workspaceName: string;
  workspaceIcon: string | null;
  isAdmin:       boolean;
}

export function SettingsNav({ workspaceSlug, workspaceName, workspaceIcon: _workspaceIcon, isAdmin }: Props) {
  const pathname = usePathname();
  const base     = `/app/${workspaceSlug}/settings`;

  function active(key: string) {
    if (key === "profile") return pathname === base || pathname.startsWith(`${base}/profile`);
    return pathname.startsWith(`${base}/${key}`);
  }

  return (
    <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3">

        {/* Account */}
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-primary/60">
          Account
        </p>
        <div className="space-y-0.5">
          <NavItem href={`${base}/profile`}       active={active("profile")}       icon={<User size={14} />}    label="My profile" />
          <NavItem href={`${base}/notifications`} active={active("notifications")} icon={<Bell size={14} />}    label="Notifications" />
          <NavItem href={`${base}/sessions`}      active={active("sessions")}      icon={<Shield size={14} />}  label="Security & sessions" />
        </div>

        <div className="mx-1 my-3 h-px bg-border" />

        {/* Workspace */}
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-primary/60">
          Workspace
        </p>
        <div className="space-y-0.5">
          {isAdmin
            ? <NavItem href={`${base}/general`} active={active("general")} icon={<Settings size={14} />} label="General" />
            : <LockedItem icon={<Settings size={14} />} label="General" />
          }
          <NavItem href={`${base}/members`} active={active("members")} icon={<Users size={14} />} label="Members" />
        </div>
      </div>

    </aside>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary"
      }`}
    >
      <span className={`shrink-0 transition-colors duration-150 ${
        active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
      }`}>
        {icon}
      </span>
      <span className={active ? "font-semibold" : ""}>{label}</span>
    </Link>
  );
}

function LockedItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70">
      <span className="shrink-0 text-sidebar-foreground/60">{icon}</span>
      <span>{label}</span>
      <Lock size={11} className="ml-auto text-muted-foreground" />
    </div>
  );
}
