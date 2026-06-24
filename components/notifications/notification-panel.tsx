"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Settings, Bell, Check } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationCard, type NotificationItem } from "@/components/notifications/notification-card";

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
  const { panelOpen, closePanel, markRead, markAllRead, refreshCount } = useNotifications();

  const [filter, setFilter]   = useState<FilterKey>("all");
  const [items, setItems]     = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  function handleClick(notification: NotificationItem) {
    if (notification.pageShortId) {
      closePanel();
      router.push(`/app/${workspaceSlug}/${notification.pageShortId}`);
    }
  }

  const unread = items.filter((n) => !n.isRead).length;

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 599, pointerEvents: animIn ? "auto" : "none" }}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 flex h-full w-[460px] flex-col border-l border-border bg-card"
        style={{
          zIndex:     600,
          transform:  animIn ? "translateX(0)" : "translateX(20px)",
          opacity:    animIn ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
          willChange: "transform",
        }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-muted">
                  <Bell size={15} className="text-muted-foreground" />
                </div>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-[16px] items-center justify-center rounded-[var(--radius-xs)] bg-primary text-[9px] font-bold text-white leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground tracking-tight leading-none">Inbox</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {unread > 0 ? `${unread} unread notification${unread !== 1 ? "s" : ""}` : "You're all caught up"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                >
                  Mark all read
                </button>
              )}
              <a
                href={`/app/${workspaceSlug}/settings/notifications`}
                aria-label="Notification settings"
                className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <Settings size={14} />
              </a>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close notifications"
                className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter tabs — segmented control ── */}
        <div className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-0.5 rounded-[var(--radius-sm)] bg-muted/60 p-0.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`relative flex-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11.5px] font-medium transition-colors duration-150 ${
                  filter === key
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {key === "all" && unread > 0 && (
                  <span className="ml-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[var(--radius-xs)] bg-primary px-1 text-[9px] font-bold text-white leading-none">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
        <Bell size={24} className="text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-foreground">All caught up</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
        </p>
      </div>
    </div>
  );
}
