"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { XIcon, GearIcon, FlaskIcon } from "@phosphor-icons/react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationCard, type NotificationItem } from "@/components/notifications/notification-card";

type FilterKey = "all" | "mentions" | "comments" | "updates";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "mentions", label: "Mentions" },
  { key: "comments", label: "Comments" },
  { key: "updates",  label: "Updates"  },
];

const IS_DEV = process.env.NODE_ENV !== "production";

interface Props {
  workspaceId:   string;
  workspaceSlug: string;
}

export function NotificationPanel({ workspaceId, workspaceSlug }: Props) {
  const router = useRouter();
  const { panelOpen, closePanel, markRead, markAllRead, refreshCount } = useNotifications();

  const [filter, setFilter]         = useState<FilterKey>("all");
  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [seeding, setSeeding]       = useState(false);
  const [mounted, setMounted]       = useState(false);

  // Animation states: shouldRender keeps panel in DOM during exit, animIn drives CSS
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
      // Has a page → navigate there and close the panel
      closePanel();
      router.push(`/app/${workspaceSlug}/${notification.pageShortId}`);
    }
    // No page (workspace_invite, etc.) → just mark read, keep panel open
  }

  async function handleSeedTest() {
    setSeeding(true);
    try {
      await fetch(`/api/notifications/test?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: "POST",
      });
      fetchNotifications();
      refreshCount();
    } catch { /* no-op */ }
    finally { setSeeding(false); }
  }

  async function handleClearTest() {
    setSeeding(true);
    try {
      await fetch(`/api/notifications/test?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: "DELETE",
      });
      setItems([]);
      refreshCount();
    } catch { /* no-op */ }
    finally { setSeeding(false); }
  }

  const unread = items.filter((n) => !n.isRead).length;

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <>
      {/* Invisible click-outside backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex:        190,
          pointerEvents: animIn ? "auto" : "none",
        }}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full flex flex-col"
        style={{
          width:      480,
          zIndex:     191,
          background: "#ffffff",
          boxShadow:  "-8px 0 32px rgba(0,0,0,0.10), -1px 0 0 #e8e8e5",
          transform:  animIn ? "translateX(0)" : "translateX(24px)",
          opacity:    animIn ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between shrink-0 px-5"
          style={{ height: 52, borderBottom: "1px solid #f0f0ee" }}
        >
          <span className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">
            Inbox
          </span>

          <div className="flex items-center gap-0.5">
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="mr-1 rounded-md px-2.5 py-1 text-[12px] font-medium text-[#9b9b9b] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors"
              >
                Mark all read
              </button>
            )}
            <a
              href={`/app/${workspaceSlug}/settings/notifications`}
              title="Notification settings"
              className="flex size-7 items-center justify-center rounded-md text-[#b0b0ab] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors"
            >
              <GearIcon size={15} />
            </a>
            <button
              type="button"
              onClick={closePanel}
              className="flex size-7 items-center justify-center rounded-md text-[#b0b0ab] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors"
            >
              <XIcon size={15} weight="bold" />
            </button>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div
          className="flex items-center gap-0.5 shrink-0 px-3"
          style={{ height: 44, borderBottom: "1px solid #f0f0ee" }}
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`relative rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                filter === key
                  ? "bg-[#f0f0ee] text-[#1a1a1a]"
                  : "text-[#9b9b9b] hover:bg-[#f7f7f5] hover:text-[#37352f]"
              }`}
            >
              {label}
              {key === "all" && unread > 0 && (
                <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── DEV test bar ── */}
        {IS_DEV && (
          <div
            className="flex items-center justify-between shrink-0 px-4 py-2"
            style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
              <FlaskIcon size={12} />
              Dev only
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedTest}
                className="rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {seeding ? "…" : "Seed notifications"}
              </button>
              <button
                type="button"
                disabled={seeding}
                onClick={handleClearTest}
                className="rounded-md border border-amber-300 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-[#d4d4d0] animate-bounce"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          ) : items.length === 0 ? (
            <EmptyState filter={filter} onSeed={handleSeedTest} seeding={seeding} />
          ) : (
            <div className="divide-y divide-[#f5f5f3]">
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

function EmptyState({
  filter,
  onSeed,
  seeding,
}: {
  filter: FilterKey;
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-5">
      <div className="relative flex size-20 items-center justify-center rounded-2xl bg-[#f7f7f5] border border-[#ebebea]">
        <svg viewBox="0 0 48 48" fill="none" className="size-11">
          <rect x="6" y="12" width="36" height="26" rx="4" fill="#eaeae7" />
          <rect x="6" y="12" width="36" height="10" rx="4" fill="#d9d9d5" />
          <path d="M16 28h16M16 34h10" stroke="#b0b0ab" strokeWidth="2" strokeLinecap="round" />
          <circle cx="35" cy="14" r="7" fill="#22c55e" />
          <path d="M32 14l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#37352f]">All caught up</p>
        <p className="mt-1 text-[13px] text-[#9b9b9b]">
          {filter === "all"
            ? "No notifications yet"
            : `No ${filter} notifications`}
        </p>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={onSeed}
            disabled={seeding}
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5 text-[12px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {seeding ? "Seeding…" : "Seed test notifications"}
          </button>
        )}
      </div>
    </div>
  );
}
