import { Extension } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";

export type MentionItem =
  | { mentionType: "user"; id: string; label: string; image?: string | null }
  | { mentionType: "page"; id: string; label: string; icon?: string | null }
  | { mentionType: "date"; id: string; label: string };

export type MentionSuggestionProps = SuggestionProps<MentionItem>;

export interface MentionOptions {
  workspaceId: string;
  onUpdate:    (props: MentionSuggestionProps | null) => void;
  onKeyDown:   (event: KeyboardEvent) => boolean;
}

async function fetchMentionItems(query: string, workspaceId: string): Promise<MentionItem[]> {
  const q = query.trim().toLowerCase();
  const items: MentionItem[] = [];

  // People
  try {
    const res = await fetch(`/api/workspaces/${workspaceId}/members?q=${encodeURIComponent(query)}&limit=5`);
    if (res.ok) {
      const data = await res.json();
      const members: Array<{ userId?: string; id?: string; name?: string | null; image?: string | null }> =
        data.members ?? data ?? [];
      for (const m of members.slice(0, 5)) {
        const id = m.userId ?? m.id;
        if (id && m.name) {
          items.push({ mentionType: "user", id, label: m.name, image: m.image });
        }
      }
    }
  } catch { /* ignore */ }

  // Pages (use search API from Phase 10)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&workspace=${workspaceId}&type=page&limit=5`);
    if (res.ok) {
      const data = await res.json();
      const results: Array<{ id?: string; pageId?: string; title?: string; icon?: string | null }> =
        data.results ?? data.comments ?? [];
      for (const r of results.slice(0, 5)) {
        const id = r.pageId ?? r.id;
        const title = r.title;
        if (id && title) {
          items.push({ mentionType: "page", id, label: title, icon: r.icon });
        }
      }
    }
  } catch { /* ignore */ }

  // Dates (always include)
  items.push(...generateDateItems(q).slice(0, 5));

  return items.slice(0, 10);
}

function generateDateItems(query: string): MentionItem[] {
  const now = new Date();
  const candidates = [
    { label: "Today",     date: addDays(now, 0) },
    { label: "Tomorrow",  date: addDays(now, 1) },
    { label: "Yesterday", date: addDays(now, -1) },
    { label: "Next Monday",    date: nextWeekdayDate(1) },
    { label: "Next Wednesday", date: nextWeekdayDate(3) },
    { label: "Next Friday",    date: nextWeekdayDate(5) },
  ];

  return candidates
    .filter(({ label }) => !query || label.toLowerCase().startsWith(query))
    .map(({ label, date }) => ({
      mentionType: "date" as const,
      id:    date.toISOString().split("T")[0],
      label: label,
    }));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function nextWeekdayDate(targetDay: number): Date {
  const today = new Date();
  const diff = (targetDay + 7 - today.getDay()) % 7 || 7;
  return addDays(today, diff);
}

/**
 * TipTap extension for @mention — uses the same callback pattern as SlashCommands
 * so the UI renders in the editor's React tree (no tippy.js needed).
 */
export const MentionCommands = Extension.create<MentionOptions>({
  name: "mentionCommands",

  addOptions() {
    return {
      workspaceId: "",
      onUpdate:    () => {},
      onKeyDown:   () => false,
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;

    return [
      Suggestion<MentionItem>({
        pluginKey: new PluginKey("mentionCommands"),
        editor:        this.editor,
        char:          "@",
        startOfLine:   false,
        allowSpaces:   false,

        items: ({ query }) => fetchMentionItems(query, opts.workspaceId),

        command: ({ editor, range, props: item }) => {
          // Delete the "@query" text and insert a mention node
          // Since we're using a plain Extension (not Node extension),
          // we insert styled text as a workaround until a Node type is registered.
          // Full Node implementation: use @tiptap/extension-mention Node directly.
          editor
            .chain()
            .deleteRange(range)
            .insertContent({
              type: "mention",
              attrs: {
                mentionType: item.mentionType,
                id:          item.id,
                label:       item.label,
              },
            })
            .run();
        },

        render: () => {
          return {
            onStart: (props: MentionSuggestionProps) => opts.onUpdate(props),
            onUpdate: (props: MentionSuggestionProps) => opts.onUpdate(props),
            onKeyDown: (props: SuggestionKeyDownProps) => opts.onKeyDown(props.event),
            onExit: () => opts.onUpdate(null),
          };
        },
      }),
    ];
  },
});

export function getMentionClass(mentionType: string): string {
  if (mentionType === "user") return "text-primary font-medium bg-primary/[0.06] rounded px-0.5 not-prose cursor-pointer";
  if (mentionType === "page") return "text-foreground underline decoration-dotted not-prose cursor-pointer";
  return "text-accent-foreground font-medium not-prose cursor-pointer";
}
