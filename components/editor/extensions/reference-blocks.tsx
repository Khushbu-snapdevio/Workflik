import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import dynamic from "next/dynamic";

const DatabasePage = dynamic(
  () => import("@/components/database/database-page").then((m) => m.DatabasePage),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/30" /> }
);
import katex from "katex";

// ── Shared inline-editor row used by LinkedPage and TemplateButton ─────────────
function InlineEditorRow({
  icon,
  iconClass,
  value,
  onChange,
  placeholder,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  icon: string;
  iconClass?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="my-1 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 shadow-sm">
      <span className={iconClass ?? "text-muted-foreground"}>{icon}</span>
      <input
        type="text"
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // biome-ignore lint/a11y/noAutofocus: intentional — inline editor just opened
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onConfirm}
        className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground"
      >
        {confirmLabel} ↵
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

// ── Linked Page ────────────────────────────────────────────────────────────────
function LinkedPageView({ node, updateAttributes }: NodeViewProps) {
  const pageId = (node.attrs.pageId as string) || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pageId);

  const confirm = useCallback(() => {
    updateAttributes({ pageId: draft.trim() });
    setEditing(false);
  }, [draft, updateAttributes]);

  const cancel = useCallback(() => {
    setDraft(pageId);
    setEditing(false);
  }, [pageId]);

  if (editing) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <InlineEditorRow
          icon="↗"
          iconClass="font-semibold text-primary"
          value={draft}
          onChange={setDraft}
          placeholder="Paste a page link or type a page name…"
          confirmLabel="Link"
          onConfirm={confirm}
          onCancel={cancel}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { setDraft(pageId); setEditing(true); }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-sm font-medium transition-colors hover:bg-muted"
      >
        <span className="text-primary">↗</span>
        <span className={pageId ? "text-foreground" : "text-muted-foreground"}>
          {pageId || "Link to Page"}
        </span>
      </button>
    </NodeViewWrapper>
  );
}

// ── Template Button ────────────────────────────────────────────────────────────
function TemplateButtonView({ node, updateAttributes }: NodeViewProps) {
  const label = (node.attrs.label as string) || "Template";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const confirm = useCallback(() => {
    updateAttributes({ label: draft.trim() || "Template" });
    setEditing(false);
  }, [draft, updateAttributes]);

  const cancel = useCallback(() => {
    setDraft(label);
    setEditing(false);
  }, [label]);

  if (editing) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <InlineEditorRow
          icon="⚡"
          value={draft}
          onChange={setDraft}
          placeholder="Button label…"
          confirmLabel="Save"
          onConfirm={confirm}
          onCancel={cancel}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="my-0.5 flex items-center gap-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setDraft(label); setEditing(true); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <span>⚡</span>
          <span>{label}</span>
        </button>
        <span className="text-[10px] text-muted-foreground/50">click to edit label</span>
      </div>
    </NodeViewWrapper>
  );
}

// ── Math block ────────────────────────────────────────────────────────────────
function MathBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const expression = (node.attrs.expression as string) || "";
  const [editing, setEditing] = useState(!expression);
  const [draft, setDraft] = useState(expression);

  const rendered = useMemo(() => {
    if (!draft) return null;
    try {
      return katex.renderToString(draft, { displayMode: true, throwOnError: false });
    } catch {
      return null;
    }
  }, [draft]);

  const commit = useCallback(() => {
    updateAttributes({ expression: draft });
    setEditing(false);
  }, [draft, updateAttributes]);

  return (
    <NodeViewWrapper contentEditable={false}>
      {editing ? (
        <div className="my-2 flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            ∑ Equation — LaTeX
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="E = mc^2"
              // biome-ignore lint/a11y/noAutofocus: intentional — block was just inserted
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape" && expression) setEditing(false);
              }}
            />
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              onClick={commit}
            >
              Done ↵
            </button>
          </div>
          {rendered && (
            <div
              className="border-t border-border pt-2 text-center"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          )}
        </div>
      ) : (
        <div
          className={[
            "my-2 cursor-pointer rounded-md border p-4 text-center transition-colors",
            selected
              ? "border-primary bg-primary/5"
              : "border-transparent hover:border-border hover:bg-muted",
          ].join(" ")}
          onClick={() => setEditing(true)}
        >
          {rendered ? (
            <div dangerouslySetInnerHTML={{ __html: rendered }} />
          ) : (
            <span className="text-sm italic text-muted-foreground">Click to add equation…</span>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      blockId:    { default: null },
      expression: { default: "" },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='mathBlock']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "mathBlock" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },
});

// ── Stub blocks — visible placeholder cards via CSS ───────────────────────────

export const LinkedPage = Node.create({
  name: "linkedPage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      pageId:  { default: "" },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='linkedPage']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "linkedPage" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkedPageView);
  },
});

// ── Inline Database ────────────────────────────────────────────────────────────

interface InlineDatabaseOptions {
  workspaceId:   string;
  workspaceSlug: string;
  isEditor:      boolean;
}

function InlineDatabaseView({ node, updateAttributes, extension, deleteNode, getPos, editor }: NodeViewProps) {
  const databaseId    = (node.attrs.databaseId as string) || "";
  const shortId       = (node.attrs.shortId    as string) || "";
  const { workspaceId, workspaceSlug, isEditor } = extension.options as InlineDatabaseOptions;

  const [creating, setCreating]   = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<{ id: string; shortId: string; title: string | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;
    const newNode = editor.schema.nodes.inlineDatabase.create(node.attrs);
    editor.view.dispatch(editor.view.state.tr.insert(pos + node.nodeSize, newNode));
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }

  // Search existing databases when query changes
  useEffect(() => {
    if (!searching || !workspaceId) return;
    if (!query.trim()) { setResults([]); return; }
    const controller = new AbortController();
    setSearchLoading(true);
    fetch(`/api/workspaces/${workspaceId}/databases?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; shortId: string; title: string | null }[]) => { setResults(data); setSearchLoading(false); })
      .catch(() => setSearchLoading(false));
    return () => controller.abort();
  }, [query, searching, workspaceId]);

  async function handleCreateNew() {
    if (!workspaceId || creating) return;
    setCreating(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/databases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Database" }),
    });
    if (res.ok) {
      const db = await res.json() as { id: string; shortId: string; defaultViewId?: string };
      updateAttributes({ databaseId: db.id, shortId: db.shortId ?? "", defaultViewId: db.defaultViewId ?? "" });
    }
    setCreating(false);
  }

  function handleLink(id: string, sid: string) {
    updateAttributes({ databaseId: id, shortId: sid });
    setSearching(false);
  }

  // Setup picker — shown when no databaseId yet
  if (!databaseId) {
    if (searching) {
      return (
        <NodeViewWrapper contentEditable={false}>
          <div className="my-1 rounded-xl border border-border bg-background p-4 shadow-sm">
            <p className="mb-2 text-[12px] font-semibold text-muted-foreground/60">Link an existing database</p>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search databases…"
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {searchLoading && (
              <p className="mt-2 text-[12px] text-muted-foreground/50">Searching…</p>
            )}
            {results.length > 0 && (
              <div className="mt-2 flex flex-col gap-0.5">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleLink(r.id, r.shortId)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-foreground hover:bg-accent"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="1" y="1" width="14" height="14" rx="2"/>
                      <line x1="1" y1="5" x2="15" y2="5"/>
                      <line x1="5" y1="5" x2="5" y2="15"/>
                    </svg>
                    {r.title || "Untitled Database"}
                  </button>
                ))}
              </div>
            )}
            {!searchLoading && query && results.length === 0 && (
              <p className="mt-2 text-[12px] text-muted-foreground/40">No databases found</p>
            )}
            <button
              onClick={() => { setSearching(false); setQuery(""); setResults([]); }}
              className="mt-3 text-[12px] text-muted-foreground/50 hover:text-muted-foreground"
            >
              ← Back
            </button>
          </div>
        </NodeViewWrapper>
      );
    }

    return (
      <NodeViewWrapper contentEditable={false}>
        <div className="my-1 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            <svg viewBox="0 0 16 16" className="size-4 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="1" y="1" width="14" height="14" rx="2"/>
              <line x1="1" y1="5" x2="15" y2="5"/>
              <line x1="5" y1="5" x2="5" y2="15"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-foreground/70">Add a database</p>
            <p className="text-[11px] text-muted-foreground/50">Create a new database or embed an existing one</p>
          </div>
          {isEditor && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNew}
                disabled={creating}
                className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {creating ? "Creating…" : "New database"}
              </button>
              <button
                onClick={() => { setSearching(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                Link existing
              </button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // Render the embedded database
  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="my-3 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {/* Inline header bar */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="1" y="1" width="14" height="14" rx="2"/>
            <line x1="1" y1="5" x2="15" y2="5"/>
            <line x1="5" y1="5" x2="5" y2="15"/>
          </svg>
          <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wide">Inline database</span>
          <div className="ml-auto flex items-center gap-0.5">
            {isEditor && (
              <>
                <button
                  title="Duplicate block"
                  onMouseDown={handleDuplicate}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>
                  </svg>
                </button>
                <button
                  title="Delete block"
                  onMouseDown={handleDelete}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2 4h12"/>
                    <path d="M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4"/>
                    <path d="M6 7v4M10 7v4"/>
                    <path d="M3 4l.8 9.2a.8.8 0 0 0 .8.8h6.8a.8.8 0 0 0 .8-.8L13 4"/>
                  </svg>
                </button>
              </>
            )}
            {workspaceSlug && shortId && (
              <a
                href={`/app/${workspaceSlug}/${shortId}`}
                className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground/40 transition-colors hover:bg-muted hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                Open
                <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M2 10L10 2M10 2H5M10 2v5"/>
                </svg>
              </a>
            )}
          </div>
        </div>
        <div style={{ height: 420, overflow: "hidden" }}>
          <DatabasePage
            databaseId={databaseId}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            isEditor={isEditor}
            initialTitle={null}
            initialIcon={null}
            isLocked={false}
            isDeleted={false}
            pageShortId=""
            inline
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const InlineDatabase = Node.create<InlineDatabaseOptions>({
  name: "inlineDatabase",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { workspaceId: "", workspaceSlug: "", isEditor: false };
  },

  addAttributes() {
    return {
      blockId:       { default: null },
      databaseId:    { default: "" },
      shortId:       { default: "" },
      defaultViewId: { default: "" },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='inlineDatabase']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "inlineDatabase" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDatabaseView);
  },
});

export const TemplateButton = Node.create({
  name: "templateButton",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      label:   { default: "Template" },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='templateButton']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "templateButton" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateButtonView);
  },
});

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,

  addAttributes() {
    return { blockId: { default: null } };
  },

  parseHTML()  { return [{ tag: "div[data-type='toc']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toc" })];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      blockId:     { default: null },
      columnCount: { default: 2 },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='columns']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "columns" })];
  },
});
