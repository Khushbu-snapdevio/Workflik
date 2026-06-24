"use client";

import { ArrowLeft, Bell, Lock, Settings, Shield, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettingsUser } from "./settings-user-context";

interface Props {
  workspaceSlug: string;
  workspaceName: string;
  workspaceIcon: string | null;
  isAdmin:       boolean;
}

const AVATAR_BG_CLASSES = [
  "bg-primary", "bg-destructive", "bg-success", "bg-warning",
  "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
];
function avatarBgClass(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]!;
}

export function SettingsNav({ workspaceSlug, workspaceName, workspaceIcon, isAdmin }: Props) {
  const pathname = usePathname();
  const base     = `/app/${workspaceSlug}/settings`;
  const { user } = useSettingsUser();

  function active(key: string) {
    if (key === "profile") return pathname === base || pathname.startsWith(`${base}/profile`);
    return pathname.startsWith(`${base}/${key}`);
  }

  const displayName = user.name || user.email;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const bg          = avatarBgClass(displayName);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-background">

      {/* Breadcrumb header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href={`/app/${workspaceSlug}`}
            className="flex items-center gap-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ArrowLeft size={13} />
            <span className="max-w-[100px] truncate">{workspaceName}</span>
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-semibold text-foreground">Settings</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-3">

        {/* Account */}
        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Account</p>
        <NavItem href={`${base}/profile`}       active={active("profile")}       icon={<User size={15} />}     label="My profile" />
        <NavItem href={`${base}/notifications`} active={active("notifications")} icon={<Bell size={15} />}     label="Notifications" />
        <NavItem href={`${base}/sessions`}      active={active("sessions")}      icon={<Shield size={15} />}   label="Security & sessions" />

        <div className="mx-2 my-3 h-px bg-border/50" />

        {/* Workspace */}
        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Workspace</p>
        {isAdmin
          ? <NavItem href={`${base}/general`} active={active("general")} icon={<Settings size={15} />} label="General" />
          : <LockedItem icon={<Settings size={15} />} label="General" />
        }
        <NavItem href={`${base}/members`} active={active("members")} icon={<Users size={15} />} label="Members" />
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          {user.image ? (
            <img src={user.image} alt={displayName} className="size-7 shrink-0 rounded-full object-cover" />
          ) : (
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${bg}`}>
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground leading-tight">{displayName}</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight">
              {workspaceIcon ? workspaceIcon + " " : ""}{workspaceName}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className={`group relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition-colors duration-150 ${
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {active && <span className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-[var(--radius-xs)] bg-primary" />}
      <span className={`shrink-0 ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function LockedItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-muted-foreground/40">
      <span className="shrink-0">{icon}</span>
      {label}
      <Lock size={11} className="ml-auto opacity-40" />
    </div>
  );
}
