"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <div className="w-full">
     <Tooltip>
      <TooltipTrigger asChild>
       <button
        type="button"
        onClick={toggle}
        className={`relative flex h-9 w-full items-center justify-center rounded-sm transition-colors duration-150 ${
         panelOpen
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
       >
        <Bell size={18} className={panelOpen ? "text-primary" : ""} />
        {badge && (
         <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-xs font-bold text-primary-foreground leading-none">
          {badge}
         </span>
        )}
       </button>
      </TooltipTrigger>
      <TooltipContent side="right" hidden={panelOpen}>Notifications</TooltipContent>
     </Tooltip>
    </div>
   ) : (
    <button
     type="button"
     onClick={toggle}
     className={`group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
      panelOpen
       ? "bg-sidebar-accent text-sidebar-accent-foreground"
       : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
     }`}
    >
     <span className="relative shrink-0 transition-colors duration-150">
      <Bell size={15} className={panelOpen ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"} />
      {badge && (
       // Anchored by `left`, not `right` — the badge's left edge stays fixed
       // at the icon's corner as content widens, so a 2-digit count ("10")
       // grows outward to the right instead of extending further left and
       // swallowing the 15px icon underneath it.
       <span className="absolute -top-1 left-2.25 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-2xs font-bold text-primary-foreground leading-none">
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
