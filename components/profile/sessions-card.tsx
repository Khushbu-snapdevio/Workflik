import {
  revokeSessionAction,
  signOutOtherSessionsAction,
} from "@/app/actions/profile";
import { formatDateTime } from "@/lib/utils";

export interface SessionRow {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  userAgent: string | null;
}

export function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">

      {/* Header */}
      <div className="border-b border-border/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
            <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-foreground">Active Sessions</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {sessions.length}
          </span>
          {otherSessionCount > 0 && (
            <form action={signOutOtherSessionsAction} className="ml-auto">
              <button
                className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-border px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="submit"
              >
                Sign out other sessions
              </button>
            </form>
          )}
        </div>
        <p className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-muted-foreground">
          Review signed-in devices and revoke anything you do not recognize.
        </p>
      </div>

      {/* Table — horizontally scrollable on narrow screens */}
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">

          {/* Column headers */}
          <div className="grid grid-cols-[minmax(0,1fr)_140px_152px_152px_80px] gap-3 border-b border-border/40 px-5 py-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Session</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">IP</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Created</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Expires</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/40">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="grid grid-cols-[minmax(0,1fr)_140px_152px_152px_80px] items-center gap-3 px-5 py-3 transition-colors hover:bg-primary/[0.025]"
              >
                {/* Session device info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {session.userAgent
                        ? describeUserAgent(session.userAgent)
                        : "Unknown device"}
                    </span>
                    {session.isCurrent && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <span className="size-1.5 rounded-full bg-success" />
                        Current
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground/50">
                    {session.userAgent ?? "No user agent recorded"}
                  </span>
                </div>

                {/* IP — truncated so long IPv6 doesn't overflow */}
                <div className="min-w-0 overflow-hidden">
                  <span className="block truncate font-mono text-[11.5px] text-muted-foreground" title={session.ipAddress ?? undefined}>
                    {session.ipAddress ?? "—"}
                  </span>
                </div>

                {/* Created */}
                <span className="text-[12px] text-muted-foreground">
                  {formatDateTime(session.createdAt)}
                </span>

                {/* Expires */}
                <span className="text-[12px] text-muted-foreground">
                  {formatDateTime(session.expiresAt)}
                </span>

                {/* Action */}
                <div>
                  {session.isCurrent ? (
                    <span className="text-[12px] text-muted-foreground/50">Protected</span>
                  ) : (
                    <form action={revokeSessionAction}>
                      <input name="sessionId" type="hidden" value={session.id} />
                      <button
                        className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-border px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        type="submit"
                      >
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

function describeUserAgent(userAgent: string) {
  const browser = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(userAgent)
      ? "macOS"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Android/i.test(userAgent)
          ? "Android"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "";

  return os ? `${browser} on ${os}` : browser;
}
