"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
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
  workspace_invite_accepted: "accepted your workspace invite",
  guest_accepted:   "accepted your invitation",
  trash_warning:    "page will be deleted soon",
  page_update:      "updated a page",
  page_created:     "created a new page",
  task_assigned:    "assigned you a task",
  reminder:         "has a reminder due",
};

export function NotificationToast({ notification, onDismiss, onView }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
      className="fixed bottom-5 right-5 z-[500] w-[360px] transition-[opacity,transform] duration-150"
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
        opacity:   visible ? 1 : 0,
      }}
    >
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
        {/* Progress bar */}
        <div
          className="h-0.5 bg-primary"
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
              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white select-none ${avatarBgClass(who)}`}
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
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <span>{notification.pageIcon ?? "📄"}</span>
                <span className="truncate">{notification.pageTitle}</span>
              </p>
            )}
            {notification.contentSnippet && (
              <p className="mt-1.5 line-clamp-2 rounded-[var(--radius-sm)] bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                {notification.contentSnippet}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="ml-1 flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-muted-foreground"
            >
              <X size={13} />
            </button>
            <button
              type="button"
              onClick={onView}
              className="whitespace-nowrap rounded-[var(--radius-sm)] bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
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

const AVATAR_BG_CLASSES = [
  "bg-primary",
  "bg-destructive",
  "bg-success",
  "bg-warning",
  "bg-muted-foreground",
  "bg-primary/70",
  "bg-destructive/70",
  "bg-success/70",
  "bg-warning/70",
];
function avatarBgClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_BG_CLASSES[h % AVATAR_BG_CLASSES.length]!;
}
