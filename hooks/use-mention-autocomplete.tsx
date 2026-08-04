"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveDisplayName } from "@/lib/users/display-name";

interface MentionUser {
  id: string;
  image: string | null;
  label: string;
}

// Plain-text "@name" autocomplete for the database cell comment popover's
// three text inputs (new comment, edit, reply) — those store comments as
// plain strings, unlike the page editor's rich-text comments (which already
// have a real TipTap mention node + dropdown, see
// components/editor/extensions/mention-extension.ts). This mirrors that
// dropdown's UX (type "@", see matching members, arrow keys + Enter to pick)
// without needing a rich-text content model: picking a suggestion just
// splices "@Display Name " into the plain string in place of the typed query.
export function useMentionAutocomplete({
  workspaceId,
  getText,
  setText,
  inputRef,
}: {
  workspaceId: string;
  getText: () => string;
  setText: (next: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [matchStart, setMatchStart] = useState(0);
  const [items, setItems] = useState<MentionUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const requestIdRef = useRef(0);

  // Call from onChange with the input's new value (e.target.value) — NOT
  // getText()'s current closure, which is still the pre-keystroke value at
  // that point since the setText() call earlier in the same handler hasn't
  // been committed to state yet. Looks at the text up to the caret, not the
  // whole value, so a "@" earlier in an already-finished mention doesn't
  // re-trigger the dropdown.
  function onTextChanged(currentText: string) {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    const pos = el.selectionStart ?? currentText.length;
    const before = currentText.slice(0, pos);
    const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
    if (!match) {
      setQuery(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left });
    setMatchStart(pos - match[1]!.length - 1);
    setQuery(match[1]!);
  }

  useEffect(() => {
    if (query === null) {
      setItems([]);
      return;
    }
    const myRequestId = ++requestIdRef.current;
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (myRequestId !== requestIdRef.current || !data) {
          return;
        }
        const members: Array<{
          userId?: string | null;
          status?: string;
          userName?: string | null;
          userEmail?: string | null;
          userImage?: string | null;
        }> = data.members ?? data ?? [];
        const q = query.trim().toLowerCase();
        const filtered: MentionUser[] = [];
        for (const m of members) {
          if (filtered.length >= 6) {
            break;
          }
          if (m.status !== "active" || !m.userId) {
            continue;
          }
          const label = resolveDisplayName(m.userName, m.userEmail);
          if (!label) {
            continue;
          }
          if (q && !label.toLowerCase().includes(q)) {
            continue;
          }
          filtered.push({ id: m.userId, label, image: m.userImage ?? null });
        }
        setItems(filtered);
        setActiveIndex(0);
      })
      .catch(() => {});
  }, [query, workspaceId]);

  function selectItem(item: MentionUser) {
    const el = inputRef.current;
    const text = getText();
    const pos = el?.selectionStart ?? text.length;
    const before = text.slice(0, matchStart);
    const after = text.slice(pos);
    const insertion = `@${item.label} `;
    setText(before + insertion + after);
    setQuery(null);
    setTimeout(() => {
      el?.focus();
      const cursor = matchStart + insertion.length;
      el?.setSelectionRange(cursor, cursor);
    }, 0);
  }

  // Returns true when the key was consumed by the dropdown — callers should
  // skip their own handling (e.g. Enter-to-submit) in that case.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): boolean {
    if (query === null || items.length === 0) {
      return false;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectItem(items[activeIndex]!);
      return true;
    }
    if (e.key === "Escape") {
      setQuery(null);
      return true;
    }
    return false;
  }

  // Portaled to <body>, so it isn't a DOM descendant of CellCommentPopover's
  // own popoverRef — its outside-click handler already checks for
  // `[data-comment-exempt]` (the same convention comment-card.tsx uses for
  // its nested portals), so without this attribute here, clicking a
  // suggestion registered as an "outside click" on the whole comment popover
  // and closed it before selectItem's own click handler ever ran.
  const dropdown =
    query !== null &&
    items.length > 0 &&
    rect &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            className="w-56 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg"
            data-comment-exempt
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              zIndex: 500,
            }}
          >
            {items.map((item, i) => (
              <button
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-accent text-foreground"
                    : "text-foreground/90 hover:bg-accent"
                }`}
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                type="button"
              >
                {item.image ? (
                  <img
                    alt=""
                    className="size-5 shrink-0 rounded-full object-cover"
                    src={item.image}
                  />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-semibold text-muted-foreground">
                    {item.label.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return { onTextChanged, handleKeyDown, dropdown, isActive: query !== null };
}
