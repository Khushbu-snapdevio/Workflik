"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import type { StreamNotification } from "@/lib/notifications/use-notification-stream";

interface Props {
  notification: StreamNotification;
  onDismiss:    () => void;
  onView:       () => void;
}

const TYPE_LABEL: Record<string, string> = {
  mention:          "mentioned you",
  comment:          "commented on your page",
  reply:            "replied to your comment",
  resolved:         "resolved a thread",
  reopened:         "reopened a thread",
  access_granted:   "granted you page access",
  workspace_invite: "added you to a workspace",
  guest_accepted:   "accepted your invitation",
  trash_warning:    "page will be deleted soon",
};

export function NotificationToast({ notification, onDismiss, onView }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enter = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 250);
    }, 5000);
    return () => { cancelAnimationFrame(enter); clearTimeout(timer); };
  }, [onDismiss]);

  const who      = notification.senderName ?? "System";
  const label    = TYPE_LABEL[notification.type] ?? "sent you a notification";
  const initials = who.slice(0, 2).toUpperCase();
  const isSystem = !notification.senderId;

  return (
    <div
      className="fixed bottom-5 right-5 w-[360px] transition-all duration-250"
      style={{
        zIndex:    500,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
        opacity:   visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background:   "var(--card)",
          border:       "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow:    "var(--shadow-float)",
          overflow:     "hidden",
        }}
      >
        {/* Progress bar */}
        <div
          className="h-[2px] bg-primary"
          style={{
            animation:       "toast-shrink 5s linear forwards",
            transformOrigin: "left",
          }}
        />

        <div className="flex items-start gap-3 px-4 py-3.5">
          {/* Avatar */}
          {isSystem ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M8 16A8 8 0 108 0a8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L5.03 7.03a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 10-1.06-1.06L8.75 9.34V4.75z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white select-none"
              style={{ background: avatarColor(who) }}
            >
              {initials}
            </div>
          )}

          {/* Body */}
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-foreground">
              {!isSystem && <span className="font-semibold">{who} </span>}
              <span className="text-muted-foreground">{label}</span>
            </p>
            {notification.pageTitle && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                <span>{notification.pageIcon ?? "📄"}</span>
                <span className="truncate">{notification.pageTitle}</span>
              </p>
            )}
            {notification.contentSnippet && (
              <p className="mt-1.5 rounded-[var(--radius-sm)] bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground line-clamp-2">
                {notification.contentSnippet}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col items-end gap-2 ml-1">
            <button
              type="button"
              onClick={onDismiss}
              className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground transition-colors"
            >
              <XIcon size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={onView}
              className="rounded-[var(--radius-sm)] bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
            >
              View
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes toast-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

const COLORS = [
  "#0284C7", "#0369A1", "#0EA5E9", "#0891B2",
  "#10B981", "#F59E0B", "#EF4444", "#14B8A6", "#F97316",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
