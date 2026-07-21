"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/auth/client";
import { File as FileIcon, ThumbsUp } from "lucide-react";
import { getOptionColor, formatNumber, formatDateValue } from "@/components/database/property-registry";
import type { NumberFormat } from "@/components/database/property-registry";
import type { DbProperty, FileItem, SelectOption } from "@/components/database/types";
import { UserHoverCard } from "@/components/database/user-hover-card";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { formatReactorNames } from "@/lib/comments/format-reaction-tooltip";
import { ImageLightbox } from "@/components/editor/comment-card";

interface CellDisplayProps {
  property: DbProperty;
  value: unknown;
  compact?: boolean;
  /** When set, a checkbox-display select/status property renders as a real
   *  button that toggles in place instead of plain read-only text — used by
   *  the calendar card so a checkbox-style property can be checked/unchecked
   *  right there, without opening the entry's own full page. */
  onToggleCheckbox?: () => void;
  /** Resolved by the caller (view-property-resolver.ts, per the active view's
   *  own propertyOverrides), NOT read from property.config directly here —
   *  CellDisplay itself has no notion of which view it's rendering inside, so
   *  the same Status property can render as a checkbox in Board and a badge
   *  in Table/Calendar/Gallery. Falls back to the property's own global
   *  config when the caller doesn't pass these (keeps older call sites working). */
  resolvedDisplayAs?: "select" | "checkbox";
  resolvedWrapContent?: boolean;
  /** Person/Created-by avatar chips show a Notion-style hover card (name,
   *  role, local time) when this is supplied — every call site already has
   *  it in scope, so omitting it is only ever a deliberate opt-out. */
  workspaceId?: string;
}

// Same custom rounded-square glyph the checkbox-type property already uses in
// entry-properties-panel.tsx — the app's actual checkbox design, rather than
// the generic lucide Square/SquareCheck icons.
function CheckboxGlyph({ checked }: { checked: boolean }) {
  return checked ? (
    <svg className="size-4 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="2" width="16" height="16" rx="4" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ) : (
    <svg className="size-4 shrink-0 text-muted-foreground/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
    </svg>
  );
}

export function CellDisplay({ property, value, compact, onToggleCheckbox, resolvedDisplayAs, resolvedWrapContent, workspaceId }: CellDisplayProps) {
  const v = value as Record<string, unknown> | null;
  const displayAs = resolvedDisplayAs ?? property.config?.displayAs;
  const wrapContent = resolvedWrapContent ?? property.config?.wrapContent;
  const { data: session } = useSession();
  const [hoveredUser, setHoveredUser] = useState<{ userId: string; rect: DOMRect } | null>(null);
  const [voterTooltip, setVoterTooltip] = useState<{ label: string; rect: DOMRect } | null>(null);
  const [lightboxFile, setLightboxFile] = useState<FileItem | null>(null);

  switch (property.type) {
    case "text": {
      const text = (v as { text?: string } | null)?.text ?? "";
      if (!text) return null;
      return <span className="block min-w-0 truncate text-xs text-foreground">{text}</span>;
    }

    case "number": {
      const n = (v as { number?: number | null } | null)?.number ?? null;
      return (
        <span className="truncate text-xs tabular-nums text-foreground">
          {formatNumber(n, (property.config?.format as NumberFormat) ?? "number")}
        </span>
      );
    }

    case "select":
    case "status": {
      const optionId = (v as { optionId?: string | null } | null)?.optionId ?? null;
      if (displayAs === "checkbox") {
        const icon = <CheckboxGlyph checked={!!optionId} />;
        if (onToggleCheckbox) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCheckbox(); }}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground"
            >
              {icon}
              {property.name}
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            {icon}
            {property.name}
          </span>
        );
      }
      if (!optionId) return null;
      const options = (property.config?.options ?? []) as SelectOption[];
      const opt = options.find((o) => o.id === optionId);
      if (!opt) return null;
      const wrapCls = wrapContent ? "whitespace-normal break-words" : "truncate";
      const color = getOptionColor(opt.color);
      return (
        <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
          <span className={wrapCls}>{opt.name}</span>
        </span>
      );
    }

    case "multi_select": {
      const optionIds = (v as { optionIds?: string[] } | null)?.optionIds ?? [];
      const options   = (property.config?.options ?? []) as SelectOption[];
      const selected  = optionIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as SelectOption[];
      if (displayAs === "checkbox") {
        const icon = <CheckboxGlyph checked={selected.length > 0} />;
        if (onToggleCheckbox) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCheckbox(); }}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground"
            >
              {icon}
              {property.name}
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            {icon}
            {property.name}
          </span>
        );
      }
      if (!selected.length) return null;
      const shown = compact ? selected.slice(0, 2) : selected;
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((opt) => {
            const color = getOptionColor(opt.color);
            return (
              <span key={opt.id} className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
                {opt.name}
              </span>
            );
          })}
          {compact && selected.length > 2 && (
            <span className="text-xs text-muted-foreground">+{selected.length - 2}</span>
          )}
        </div>
      );
    }

    case "date": {
      if (!(v as { date?: string | null } | null)?.date) return null;
      return <span className="block min-w-0 truncate text-xs text-foreground">{formatDateValue(v)}</span>;
    }

    case "checkbox": {
      const checked = (v as { checked?: boolean } | null)?.checked ?? false;
      return (
        <span className="flex items-center">
          <CheckboxGlyph checked={checked} />
        </span>
      );
    }

    case "url": {
      const url = (v as { url?: string } | null)?.url ?? "";
      if (!url) return null;
      return (
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-primary hover:underline"
        >
          {url.replace(/^https?:\/\//, "")}
        </a>
      );
    }

    case "email": {
      const email = (v as { email?: string } | null)?.email ?? "";
      if (!email) return null;
      return (
        <a
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-primary hover:underline"
        >
          {email}
        </a>
      );
    }

    case "phone": {
      const phone = (v as { phone?: string } | null)?.phone ?? "";
      if (!phone) return null;
      return (
        <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-foreground">
          {phone}
        </a>
      );
    }

    // "created_by" is computed server-side from the entry's own createdBy
    // column (see app/api/databases/[id]/entries/route.ts) into the exact
    // same { userIds, _members } shape "person" values are saved with, so it
    // can share this rendering — it's just always a single, read-only user.
    case "person":
    case "created_by": {
      const userIds       = (v as { userIds?: string[] } | null)?.userIds ?? [];
      const cachedMembers = (v as { _members?: { id: string; name: string; email: string }[] } | null)?._members ?? [];

      // Vote-mode: a thumbs-up + count instead of the editable avatar list —
      // the count is always userIds.length (never a separately-stored
      // number), and the fill state reflects whether *this* viewer has voted.
      // No onClick here — the click that toggles a vote is handled by each
      // view's own cell-activation logic (table-view.tsx's activateCell and
      // its equivalents), which calls back into this same person value; this
      // component only ever renders what the current value looks like.
      if (property.type === "person" && property.config?.voteMode) {
        const hasVoted = !!session?.user?.id && userIds.includes(session.user.id);
        // Voter names come straight from the value's own `_members` cache —
        // no extra fetch. Reuses the comment-reaction name formatter
        // ("Smit and S28", "X, Y, and N others") so "who voted" reads the
        // same everywhere. `You` is substituted for the current user, since
        // the badge is a self-service vote.
        const nameById = Object.fromEntries(cachedMembers.map((m) => [m.id, m.name || m.email]));
        const voterLabel = userIds.length
          ? formatReactorNames(
              userIds,
              Object.fromEntries(userIds.map((id) => [id, id === session?.user?.id ? "You" : nameById[id] || "Former Member"])),
            )
          : "";
        return (
          <>
            <span
              onMouseEnter={userIds.length ? (e) => setVoterTooltip({ label: voterLabel, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
              onMouseLeave={userIds.length ? () => setVoterTooltip(null) : undefined}
              className={`inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                hasVoted
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <ThumbsUp size={12} fill={hasVoted ? "currentColor" : "none"} />
              {userIds.length}
            </span>
            {voterTooltip && typeof document !== "undefined" && createPortal(
              <IconTooltip rect={voterTooltip.rect} label={voterTooltip.label} />,
              document.body,
            )}
          </>
        );
      }

      if (!userIds.length) return null;
      const shown = userIds.slice(0, compact ? 2 : 3);
      return (
        <div className="flex flex-wrap items-center gap-1">
          {shown.map((id) => {
            const member  = cachedMembers.find((m) => m.id === id);
            // `||`, not `??` — a cached member with a genuinely empty-string
            // name/email (old data saved before that was fixed) would leak
            // through as a blank label/initial otherwise.
            const label   = member?.name || member?.email || id;
            const initial = label.slice(0, 1).toUpperCase();
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-muted pl-0.5 pr-2 py-0.5"
                onMouseEnter={workspaceId ? (e) => setHoveredUser({ userId: id, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
                onMouseLeave={workspaceId ? () => setHoveredUser((cur) => (cur?.userId === id ? null : cur)) : undefined}
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-[80px] truncate text-xs font-medium text-foreground">
                  {label}
                </span>
                {workspaceId && hoveredUser?.userId === id && (
                  <UserHoverCard
                    userId={id}
                    workspaceId={workspaceId}
                    currentUserId={session?.user?.id}
                    cachedName={member?.name}
                    cachedEmail={member?.email}
                    rect={hoveredUser.rect}
                  />
                )}
              </span>
            );
          })}
          {userIds.length > (compact ? 2 : 3) && (
            <span className="text-xs text-muted-foreground">+{userIds.length - (compact ? 2 : 3)}</span>
          )}
        </div>
      );
    }

    case "relation": {
      const entryIds = (v as { entryIds?: string[] } | null)?.entryIds ?? [];
      if (!entryIds.length) return null;
      return (
        <span className="text-xs text-muted-foreground">
          {entryIds.length} {entryIds.length === 1 ? "entry" : "entries"}
        </span>
      );
    }

    case "files": {
      const files = (v as { files?: FileItem[] } | null)?.files ?? [];
      if (!files.length) return null;
      const shown = compact ? files.slice(0, 4) : files;
      return (
        <div className={`flex items-center gap-1.5 py-1 ${compact ? "flex-nowrap overflow-hidden" : "flex-wrap"}`}>
          {shown.map((f) => {
            const isImage = f.mimeType.startsWith("image/");
            return isImage ? (
              <img
                key={f.id}
                src={f.url}
                alt={f.name}
                onClick={(e) => { e.stopPropagation(); setLightboxFile(f); }}
                className="h-12 w-[76px] shrink-0 cursor-zoom-in rounded-[var(--radius-sm)] border border-border object-cover"
              />
            ) : (
              <span
                key={f.id}
                title={f.name}
                className="flex h-12 w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-1"
              >
                <FileIcon size={16} className="shrink-0 text-muted-foreground" />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">{f.name}</span>
              </span>
            );
          })}
          {compact && files.length > 4 && (
            <span className="text-xs text-muted-foreground">+{files.length - 4}</span>
          )}
          {lightboxFile && (
            <ImageLightbox src={lightboxFile.url} alt={lightboxFile.name} onClose={() => setLightboxFile(null)} />
          )}
        </div>
      );
    }

    // Computed server-side (app/api/databases/[id]/entries/route.ts and
    // lib/formula/) — read-only, pre-formatted text, never edited from here.
    case "rollup":
    case "formula": {
      const display = (v as { display?: string | null } | null)?.display ?? null;
      if (!display) return null;
      return <span className="truncate text-xs text-muted-foreground">{display}</span>;
    }

    default:
      return null;
  }
}
