"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Settings, Bell, Mail, CircleCheck, Trash2 } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationCard, type NotificationItem } from "@/components/notifications/notification-card";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Envelope with a checkmark badge cut into the corner — matches the
// "mark all as read" glyph style requested over the plain double-check.
function MailReadIcon() {
  return (
    <span className="relative inline-flex">
      <Mail size={14} />
      <span className="absolute -bottom-[3px] -right-[3px] flex size-[11px] items-center justify-center rounded-full bg-card">
        <CircleCheck size={11} strokeWidth={2.5} />
      </span>
    </span>
  );
}

type FilterKey = "all" | "mentions" | "comments" | "updates";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "mentions", label: "Mentions" },
  { key: "comments", label: "Comments" },
  { key: "updates",  label: "Updates"  },
];


interface Props {
  workspaceId:   string;
  workspaceSlug: string;
}

export function NotificationPanel({ workspaceId, workspaceSlug }: Props) {
  const router = useRouter();
  const { panelOpen, closePanel, markRead, markAllRead, clearAll, deleteNotification, refreshCount } = useNotifications();

  const [filter, setFilter]   = useState<FilterKey>("all");
  const [items, setItems]     = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [shouldRender, setShouldRender] = useState(false);
  const [animIn, setAnimIn]             = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (panelOpen) {
      setShouldRender(true);
      const id = requestAnimationFrame(() => setAnimIn(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setShouldRender(false), 220);
      return () => clearTimeout(t);
    }
  }, [panelOpen]);

  const fetchNotifications = useCallback(() => {
    if (!panelOpen) return;
    setLoading(true);
    fetch(`/api/notifications?workspaceId=${encodeURIComponent(workspaceId)}&filter=${filter}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.notifications) setItems(d.notifications); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [panelOpen, workspaceId, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!panelOpen) return;
    function h(e: KeyboardEvent) { if (e.key === "Escape") closePanel(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [panelOpen, closePanel]);

  function handleMarkRead(id: string) {
    markRead(id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  function handleMarkAllRead() {
    markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleClearAll() {
    clearAll();
    setItems([]);
    setConfirmClearAll(false);
  }

  function confirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    const notification = items.find((n) => n.id === id);
    deleteNotification(id, notification ? !notification.isRead : false);
    setItems((prev) => prev.filter((n) => n.id !== id));
    setConfirmDeleteId(null);
  }

  function handleClick(notification: NotificationItem) {
    closePanel();
    if (notification.type === "trash_warning") {
      router.push(`/app/${workspaceSlug}/trash`);
    } else if (notification.pageShortId) {
      router.push(`/app/${workspaceSlug}/${notification.pageShortId}`);
    }
  }

  const unread = items.filter((n) => !n.isRead).length;

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <>
      {/* Backdrop — dims whatever's underneath (matches the app's Sheet/Dialog
          overlay convention, bg-black/20) so content that sits in the same
          horizontal band as the panel, like the home page's topbar search
          bar, reads as "behind an overlay" instead of just abruptly
          clipped/half-hidden where the panel's left edge happens to fall. */}
      <div
        className="fixed inset-0 bg-black/20"
        style={{
          zIndex:     599,
          opacity:    animIn ? 1 : 0,
          transition: "opacity 0.18s ease",
          pointerEvents: animIn ? "auto" : "none",
        }}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 flex h-full w-full sm:w-[360px] flex-col border-l border-border bg-card"
        style={{
          zIndex:     600,
          transform:  animIn ? "translateX(0)" : "translateX(20px)",
          opacity:    animIn ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
          willChange: "transform",
        }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-border bg-card">
          {/* Top accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />

          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
            {/* Left: title + badge + subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell size={14} className="shrink-0 text-primary" />
                <h2 className="text-[15px] font-bold leading-none tracking-tight text-foreground">
                  Notifications
                </h2>
                {unread > 0 && (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {unread > 0
                  ? `${unread} unread notification${unread !== 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>

            {/* Right: icon actions + clear all */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-0.5">
                {unread > 0 && (
                  <IconTooltipButton
                    icon={<MailReadIcon />}
                    label="Mark all as read"
                    onClick={handleMarkAllRead}
                    className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  />
                )}
                <IconTooltipButton
                  icon={<Settings size={14} />}
                  label="Notification settings"
                  onClick={() => {
                    closePanel();
                    router.push(`/app/${workspaceSlug}/settings/notifications`);
                  }}
                  className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                />
                <IconTooltipButton
                  icon={<X size={14} />}
                  label="Close"
                  onClick={closePanel}
                  className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors duration-150 hover:bg-accent hover:text-foreground"
                />
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                >
                  <Trash2 size={11} />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="shrink-0 border-b border-border px-3 py-2">
          <div className="flex items-center gap-0.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  filter === key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {label}
                {key === "all" && unread > 0 && (
                  <span className={`inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
                    filter === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  workspaceSlug={workspaceSlug}
                  onMarkRead={handleMarkRead}
                  onClick={handleClick}
                  onDelete={setConfirmDeleteId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear all confirmation */}
      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent className="z-[900]" overlayClassName="z-[900]">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every notification in this workspace's inbox. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Clear all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete single notification confirmation */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent className="z-[900]" overlayClassName="z-[900]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This notification will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body,
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted/60" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" style={{ animationDelay: `${i * 0.06}s` }} />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/40" style={{ animationDelay: `${i * 0.06 + 0.05}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 py-20">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted/50">
        <Bell size={24} className="text-muted-foreground/70" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">All caught up</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
        </p>
      </div>
    </div>
  );
}
