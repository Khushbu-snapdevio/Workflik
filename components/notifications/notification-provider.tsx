"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStream, type StreamNotification } from "@/lib/notifications/use-notification-stream";
import { NotificationToast } from "@/components/notifications/notification-toast";

interface NotificationContextValue {
  unreadCount:     number;
  workspaceId:     string;
  panelOpen:       boolean;
  openPanel:       () => void;
  closePanel:      () => void;
  markRead:        (id: string) => void;
  markAllRead:     () => void;
  clearAll:        () => void;
  deleteNotification: (id: string, wasUnread: boolean) => void;
  refreshCount:    () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

interface Props {
  children:      React.ReactNode;
  workspaceId:   string;
  workspaceSlug: string;
}

export function NotificationProvider({ children, workspaceId, workspaceSlug }: Props) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [toasts, setToasts]           = useState<StreamNotification[]>([]);

  // Ref so the SSE callback always reads the live panelOpen value (no stale closure)
  const panelOpenRef = useRef(false);
  panelOpenRef.current = panelOpen;

  // Notification ids already surfaced this session — guards against the same
  // row being re-delivered (SSE reconnect race, StrictMode double-mount, etc.)
  // and re-counted/re-toasted as if it were new.
  const seenNotificationIds = useRef<Set<string>>(new Set());

  const fetchCount = useCallback(() => {
    fetch(`/api/notifications?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.unreadCount != null) setUnreadCount(d.unreadCount); })
      .catch(() => {});
  }, [workspaceId]);

  // Initial count on mount
  useEffect(() => { fetchCount(); }, [fetchCount]);

  // Poll every 60s as fallback when SSE is unavailable
  useEffect(() => {
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // SSE — increments count + shows toast for each new notification
  useNotificationStream({
    workspaceId,
    onNotifications: (items) => {
      const freshItems = items.filter((n) => !seenNotificationIds.current.has(n.id));
      if (freshItems.length === 0) return;
      freshItems.forEach((n) => seenNotificationIds.current.add(n.id));

      setUnreadCount((c) => c + freshItems.length);
      // Use ref so we always read the current panelOpen (never a stale closure)
      if (!panelOpenRef.current) {
        setToasts((prev) => [...prev, ...freshItems].slice(-5)); // cap at 5 toasts
      }
    },
  });

  const openPanel  = useCallback(() => { setPanelOpen(true);  }, []);
  const closePanel = useCallback(() => { setPanelOpen(false); fetchCount(); }, [fetchCount]);

  const markRead = useCallback((id: string) => {
    fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(() => {
    fetch("/api/notifications/read-all", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ workspaceId }),
    }).catch(() => {});
    setUnreadCount(0);
  }, [workspaceId]);

  const clearAll = useCallback(() => {
    fetch("/api/notifications/clear-all", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ workspaceId }),
    }).catch(() => {});
    setUnreadCount(0);
  }, [workspaceId]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const deleteNotification = useCallback((id: string, wasUnread: boolean) => {
    fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, workspaceId, panelOpen, openPanel, closePanel, markRead, markAllRead, clearAll, deleteNotification, refreshCount: fetchCount }}
    >
      {children}
      {toasts.map((t) => (
        <NotificationToast
          key={t.id}
          notification={t}
          onDismiss={() => dismissToast(t.id)}
          onView={() => {
            dismissToast(t.id);
            if (t.pageShortId) {
              router.push(`/app/${workspaceSlug}/${t.pageShortId}`);
            } else {
              openPanel();
            }
          }}
        />
      ))}
    </NotificationContext.Provider>
  );
}
