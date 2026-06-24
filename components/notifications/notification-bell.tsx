"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationPanel } from "@/components/notifications/notification-panel";

interface Props {
 workspaceSlug: string;
 workspaceId:  string;
 collapsed?:  boolean;
}

export function NotificationBell({ workspaceSlug, workspaceId, collapsed = false }: Props) {
 const { unreadCount, panelOpen, openPanel, closePanel } = useNotifications();
 const badge = unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null;

 function toggle() { panelOpen ? closePanel() : openPanel(); }

 return (
  <>
   {collapsed ? (
    <div className="group relative w-full">
     <button
      type="button"
      onClick={toggle}
      className={`relative flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 ${
       panelOpen ? "bg-primary/[0.10] text-primary" : "text-sidebar-foreground/50 hover:bg-primary/[0.05] hover:text-sidebar-foreground"
      }`}
     >
      <Bell size={18} />
      {badge && (
       <span className="absolute top-1 right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white leading-none">
        {badge}
       </span>
      )}
     </button>
     {/* Tooltip */}
     <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
      <p className="text-xs font-semibold text-popover-foreground">Notifications</p>
     </div>
    </div>
   ) : (
    <button
     type="button"
     onClick={toggle}
     className={`relative flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
      panelOpen
       ? "bg-primary/[0.08] text-foreground font-semibold"
       : "text-sidebar-foreground/65 hover:bg-primary/[0.04] hover:text-sidebar-foreground"
     }`}
    >
     <span className={`relative shrink-0 transition-colors ${panelOpen ? "text-primary" : "text-sidebar-foreground/40"}`}>
      <Bell size={15} />
      {badge && (
       <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white leading-none">
        {badge}
       </span>
      )}
     </span>
     <span className="flex-1 text-left">Notifications</span>
    </button>
   )}

   <NotificationPanel workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
  </>
 );
}
