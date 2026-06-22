"use client";

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
  mention:          "mentioned you",
  comment:          "left a comment",
  reply:            "replied to you",
  resolved:         "resolved a thread",
  reopened:         "reopened a thread",
  access_granted:   "granted you access",
  workspace_invite: "added you to workspace",
  guest_accepted:   "accepted your invite",
  trash_warning:    "moved a page to Trash",
  page_update:      "edited a page",
  task_assigned:    "assigned you a task",
};

const TYPE_COLOR: Record<string, string> = {
  mention:          "#0284C7",
  comment:          "#0ea5e9",
  reply:            "#0369a1",
  resolved:         "#0891b2",
  reopened:         "#f59e0b",
  access_granted:   "#06b6d4",
  workspace_invite: "#0284C7",
  guest_accepted:   "#0ea5e9",
  trash_warning:    "#ef4444",
  page_update:      "#7c3aed",
  task_assigned:    "#059669",
};

interface Props {
  notification:  NotificationItem;
  workspaceSlug: string;
  onMarkRead:    (id: string) => void;
  onClick:       (notification: NotificationItem) => void;
}

export function NotificationCard({ notification, workspaceSlug, onMarkRead, onClick }: Props) {
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
  const dotColor = !isSystem ? TYPE_COLOR[notification.type] : undefined;

  function handleCardClick() {
    if (isUnread) onMarkRead(notification.id);
    onClick(notification);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex cursor-pointer gap-3 px-4 py-3.5 transition-colors ${
        isUnread ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/25"
      }`}
    >
      {/* Unread left accent */}
      {isUnread && (
        <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r bg-primary" />
      )}

      {/* Avatar */}
      <div className="relative mt-0.5 shrink-0">
        {isSystem ? (
          <div className="flex size-9 items-center justify-center rounded-full bg-muted/70 ring-2 ring-border/40">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-muted-foreground/60">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
        ) : notification.senderImage ? (
          <img
            src={notification.senderImage}
            alt={who}
            className="size-9 rounded-full object-cover ring-2 ring-white shadow-sm select-none"
          />
        ) : (
          <div
            className="flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm ring-2 ring-white select-none"
            style={{ background: avatarColor(who) }}
          >
            {initials}
          </div>
        )}
        {dotColor && (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-[11px] rounded-full border-[2px] border-white shadow-sm"
            style={{ background: dotColor }}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] leading-snug">
            {!isSystem && <span className="font-semibold text-foreground">{who}</span>}
            {!isSystem && " "}
            <span className="text-muted-foreground">{action}</span>
          </p>
          <span className="mt-px shrink-0 whitespace-nowrap text-[10.5px] text-muted-foreground/50">
            {timeAgo}
          </span>
        </div>

        {/* Page breadcrumb */}
        {notification.pageTitle && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[11px] opacity-60">
              {notification.pageIcon ?? "📄"}
            </span>
            <span className="truncate text-[11px] font-medium text-muted-foreground/60">
              {notification.pageTitle}
            </span>
          </div>
        )}

        {/* Content snippet */}
        {notification.contentSnippet && (
          <div className="mt-1.5 rounded-[var(--radius-sm)] border border-border/50 bg-muted/30 px-2.5 py-1.5">
            <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
              {notification.contentSnippet}
            </p>
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="absolute right-3 top-3 hidden items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-card p-0.5 shadow-[var(--shadow-raised)] group-hover:flex">
        {isUnread && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            title="Mark as read"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[10px]">
              <path d="M2 8l4 4 8-8" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isUnread) onMarkRead(notification.id);
            onClick(notification);
          }}
          title="Open page"
          className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[10px]">
            <path d="M4 8h8M9 5l3 3-3 3" />
          </svg>
        </button>
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

const COLORS = [
  "#0284C7", "#0369a1", "#0ea5e9", "#0891b2",
  "#06b6d4", "#075985", "#0e7490", "#1d4ed8", "#2563eb",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
