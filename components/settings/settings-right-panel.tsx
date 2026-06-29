"use client";

import { Bell, Settings, Shield, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Section {
  key:       string;
  label:     string;
  icon:      React.ReactNode;
  group:     "account" | "workspace";
  adminOnly?: boolean;
}

const SECTIONS: Section[] = [
  { key: "profile",       label: "My profile",          icon: <User     size={14} />, group: "account"              },
  { key: "notifications", label: "Notifications",       icon: <Bell     size={14} />, group: "account"              },
  { key: "sessions",      label: "Security & sessions", icon: <Shield   size={14} />, group: "account"              },
  { key: "general",       label: "General",             icon: <Settings size={14} />, group: "workspace", adminOnly: true },
  { key: "members",       label: "Members",             icon: <Users    size={14} />, group: "workspace"            },
];

interface Props {
  workspaceSlug: string;
  isAdmin:       boolean;
}

export function SettingsRightPanel({ workspaceSlug, isAdmin }: Props) {
  const pathname = usePathname();
  const base     = `/app/${workspaceSlug}/settings`;

  function isActive(key: string) {
    if (key === "profile") return pathname === base || pathname.startsWith(`${base}/profile`);
    return pathname.startsWith(`${base}/${key}`);
  }

  const visibleSections   = SECTIONS.filter(s => !s.adminOnly || isAdmin);
  const activeSection     = visibleSections.find(s => isActive(s.key)) ?? visibleSections[0];
  const accountSections   = visibleSections.filter(s => s.group === "account");
  const workspaceSections = visibleSections.filter(s => s.group === "workspace");

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/60 bg-sidebar">

      {/* Header */}
      <div className="border-b border-border/60 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Categories</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* Active section card — matches "All templates" card style */}
        <Link
          href={`${base}/${activeSection.key}`}
          className="group mb-3 flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-primary/25 bg-primary/10 px-3.5 py-3 text-left text-primary transition-all duration-150 hover:bg-primary/10"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary">
            {activeSection.icon}
          </span>
          <span className="flex-1 text-sm font-semibold">{activeSection.label}</span>
        </Link>

        {/* Account group */}
        <div className="mb-2.5 mt-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Account</p>
        </div>
        <div className="space-y-0.5">
          {accountSections.map((s) => (
            <SectionRow
              key={s.key}
              href={`${base}/${s.key}`}
              icon={s.icon}
              label={s.label}
              active={isActive(s.key)}
            />
          ))}
        </div>

        {/* Workspace group */}
        <div className="mb-2.5 mt-4 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Workspace</p>
        </div>
        <div className="space-y-0.5">
          {workspaceSections.map((s) => (
            <SectionRow
              key={s.key}
              href={`${base}/${s.key}`}
              icon={s.icon}
              label={s.label}
              active={isActive(s.key)}
            />
          ))}
        </div>

      </div>
    </aside>
  );
}

function SectionRow({
  href, icon, label, active,
}: {
  href:   string;
  icon:   React.ReactNode;
  label:  string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-all duration-150 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/70 hover:bg-accent hover:text-foreground"
      }`}
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 ${
        active
          ? "bg-primary/15 text-primary"
          : "bg-muted/70 text-muted-foreground group-hover:bg-accent-foreground/10 group-hover:text-foreground"
      }`}>
        {icon}
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm ${active ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </Link>
  );
}
