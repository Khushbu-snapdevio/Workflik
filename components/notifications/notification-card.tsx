"use client";

import { Check, X } from "lucide-react";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";

export interface NotificationItem {
  id:             string;
  type:           string;
  isRead:         boolean;
  createdAt:      string;
  contentSnippet: string | null;
  pageId:         string | null;
  sourceId:       string | null;
  senderId:       string | null;
  senderName:     string | null;
  senderEmail:    string | null;
  senderImage:    string | null;
  pageTitle:      string | null;
  pageIcon:       string | null;
  pageShortId:    string | null;
}

const TYPE_ACTION: Record<string, string> = {
  mention:          "mentioned you in a comment",
  comment:          "commented on a page",
  reply:           "replied to your comment",
  resolved:         "resolved a comment thread",
  reopened:         "reopened a comment thread",
  access_granted:   "granted you access",
  workspace_invite: "invited you to a workspace",
  workspace_invite_accepted: "accepted your workspace invitation",
  guest_accepted:   "accepted your workspace invitation",
  trash_warning:    "has a page that will be permanently deleted from Trash",
  page_update:      "updated a page",
  page_created:     "created a new page",
  task_assigned:    "assigned you a task",
  reminder:         "has a reminder due",
};

const TYPE_DOT_CLASS: Record<string, string> = {
  mention:          "bg-primary",
  comment:          "bg-primary",
  reply:            "bg-primary",
  resolved:         "bg-muted-foreground",
  reopened:         "bg-warning",
  access_granted:   "bg-success",
  workspace_invite: "bg-primary",
  workspace_invite_accepted: "bg-success",
  guest_accepted:   "bg-success",
  trash_warning:    "bg-destructive",
  page_update:      "bg-muted-foreground",
  page_created:     "bg-primary",
  task_assigned:    "bg-success",
  reminder:         "bg-warning",
};

interface Props {
  notification:  NotificationItem;
  workspaceSlug: string;
  onMarkRead:    (id: string) => void;
  onClick:       (notification: NotificationItem) => void;
  onDelete:      (id: string) => void;
}

export function NotificationCard({ notification, workspaceSlug, onMarkRead, onClick, onDelete }: Props) {
  void workspaceSlug;
  const who      = notification.senderName?.trim()
                || notification.senderEmail?.split("@")[0]?.trim()
                || "Unknown";
  const action   = TYPE_ACTION[notification.type] ?? "sent you a notification";
  const words    = who.split(/[\s._\-]+/).filter(Boolean);
  const initials = (words.length >= 2
    ? words[0][0]! + words[words.length - 1][0]!
    : who.slice(0, 2)
  ).toUpperCase();
  const timeAgo  = relativeTime(notification.createdAt);
  const isSystem = !notification.senderId;
  const isUnread = !notification.isRead;
  const dotClass = !isSystem ? TYPE_DOT_CLASS[notification.type] : undefined;

  function handleCardClick() {
    if (isUnread) onMarkRead(notification.id);
    onClick(notification);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex cursor-pointer gap-3 px-4 py-3.5 transition-colors duration-150 ${
        isUnread ? "bg-primary/[0.06] hover:bg-primary/[0.13]" : "bg-card hover:bg-accent"
      }`}
    >
      {/* Unread left accent */}
      {isUnread && (
        <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r bg-primary" />
      )}

      {/* Avatar */}
      <div className="relative mt-0.5 shrink-0 self-start">
        {isSystem ? (
          <div className="flex size-9 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/40">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-muted-foreground/60">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
        ) : notification.senderImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notification.senderImage}
            alt={who}
            className="block size-9 rounded-full object-cover ring-1 ring-border/40 select-none"
          />
        ) : (
          <div
            className={`flex size-9 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-border/40 select-none ${avatarBgClass(who)}`}
          >
            {initials}
          </div>
        )}
        {dotClass && (
          <span
            className={`absolute bottom-0 right-0 size-2.5 rounded-full border border-card ${dotClass}`}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs leading-snug">
            {!isSystem && <span className="font-semibold text-foreground">{who}</span>}
            {!isSystem && " "}
            <span className="text-muted-foreground">{action}</span>
          </p>
          <span className="mt-px shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>

        {/* Page breadcrumb */}
        {notification.pageTitle && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs opacity-60">
              {notification.pageIcon ?? "📄"}
            </span>
            <span className="truncate text-xs font-medium text-muted-foreground/60">
              {notification.pageTitle}
            </span>
          </div>
        )}

        {/* Content snippet */}
        {notification.contentSnippet && (
          <div className="mt-1.5 rounded-[var(--radius-sm)] border border-border/50 bg-muted/30 px-2.5 py-1.5">
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {notification.contentSnippet}
            </p>
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 hidden items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-card p-0.5 group-hover:flex"
      >
        {isUnread && (
          <IconTooltipButton
            icon={<Check size={10} />}
            label="Mark as read"
            onClick={() => onMarkRead(notification.id)}
            placement="below"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-primary/10 hover:text-primary"
          />
        )}
        <IconTooltipButton
          icon={<X size={10} />}
          label="Delete notification"
          onClick={() => onDelete(notification.id)}
          placement="below"
          className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
        />
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d === 1) return "Yesterday";
    if (d < 7)  return `${d}d`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
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
];
function avatarBgClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_BG_CLASSES[h % AVATAR_BG_CLASSES.length]!;
}
