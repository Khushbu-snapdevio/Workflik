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
  trash_warning:    "page being deleted",
};

// Color dot on avatar corner to indicate notification type at a glance
const TYPE_COLOR: Record<string, string> = {
  mention:          "#3b82f6",
  comment:          "#8b5cf6",
  reply:            "#6366f1",
  resolved:         "#10b981",
  reopened:         "#f59e0b",
  access_granted:   "#10b981",
  workspace_invite: "#6366f1",
  guest_accepted:   "#10b981",
  trash_warning:    "#ef4444",
};

interface Props {
  notification:  NotificationItem;
  workspaceSlug: string;
  onMarkRead:    (id: string) => void;
  onClick:       (notification: NotificationItem) => void;
}

export function NotificationCard({ notification, workspaceSlug, onMarkRead, onClick }: Props) {
  void workspaceSlug; // navigation handled by onClick → handleClick in panel
  const who      = notification.senderName ?? "System";
  const action   = TYPE_ACTION[notification.type] ?? "sent you a notification";
  const initials = who.slice(0, 2).toUpperCase();
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
      className={`group relative flex cursor-pointer gap-3 px-4 py-3.5 transition-colors duration-100 ${
        isUnread ? "bg-[#f4f7ff] hover:bg-[#edf2ff]" : "hover:bg-[#fafaf9]"
      }`}
    >
      {/* Unread left accent */}
      {isUnread && (
        <span className="absolute left-0 inset-y-3 w-[3px] rounded-r-sm bg-blue-500" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0 mt-0.5">
        {isSystem ? (
          <div className="flex size-[36px] items-center justify-center rounded-full bg-[#f3f4f6]">
            <svg viewBox="0 0 20 20" fill="#9ca3af" className="size-[15px]">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div
            className="flex size-[36px] items-center justify-center rounded-full text-[12px] font-bold text-white select-none"
            style={{ background: avatarColor(who) }}
          >
            {initials}
          </div>
        )}
        {/* Type-color indicator dot */}
        {dotColor && (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-[10px] rounded-full border-[2px] border-white"
            style={{ background: dotColor }}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Action + timestamp */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] leading-snug text-[#37352f]">
            {!isSystem && <span className="font-semibold">{who}</span>}
            {!isSystem && " "}
            <span className="text-[#6b6b6b]">{action}</span>
          </p>
          <span className="shrink-0 text-[11px] text-[#b0b0ab] whitespace-nowrap mt-px">
            {timeAgo}
          </span>
        </div>

        {/* Page breadcrumb */}
        {notification.pageTitle && (
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-[12px]" style={{ opacity: 0.65 }}>
              {notification.pageIcon ?? "📄"}
            </span>
            <span className="truncate text-[11.5px] text-[#a3a3a0]">
              {notification.pageTitle}
            </span>
          </div>
        )}

        {/* Content snippet */}
        {notification.contentSnippet && (
          <div className="mt-1.5 rounded-md border border-[#ebebea] bg-white px-2.5 py-1.5">
            <p className="text-[12px] leading-relaxed text-[#5c5c5c] line-clamp-2">
              {notification.contentSnippet}
            </p>
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="absolute right-3 top-2.5 hidden group-hover:flex items-center gap-0.5 rounded-md border border-[#e5e5e3] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-0.5">
        {isUnread && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            title="Mark as read"
            className="flex size-[26px] items-center justify-center rounded text-[#9b9b9b] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
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
          className="flex size-[26px] items-center justify-center rounded text-[#9b9b9b] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
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
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
