import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import dynamic from "next/dynamic";

const DatabasePage = dynamic(
 () => import("@/components/database/database-page").then((m) => m.DatabasePage),
 { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-[var(--radius-md)] bg-muted/30" /> }
);
import katex from "katex";

// ── Block type options ────────────────────────────────────────────────────────
const BLOCK_TYPE_OPTIONS = [
 { value: "paragraph", label: "Paragraph" },
 { value: "h1",        label: "Heading 1" },
 { value: "h2",        label: "Heading 2" },
 { value: "h3",        label: "Heading 3" },
 { value: "todo",      label: "To-do" },
 { value: "bullet",    label: "Bullet" },
] as const;

function BlockTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);
 const label = BLOCK_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? "Paragraph";

 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false);
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [open]);

 return (
  <div ref={ref} className="relative w-[120px] shrink-0">
   <button
    type="button"
    onClick={() => setOpen((p) => !p)}
    className={[
     "flex w-full items-center justify-between rounded-[var(--radius-sm)] border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors",
     open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-border/80",
    ].join(" ")}
   >
    <span>{label}</span>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}>
     <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
   </button>
   {open && (
    <div className="absolute left-0 top-[calc(100%+4px)] z-[200] min-w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover py-1">
     {BLOCK_TYPE_OPTIONS.map((opt) => (
      <button
       key={opt.value}
       type="button"
       onClick={() => { onChange(opt.value); setOpen(false); }}
       className={[
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent",
        opt.value === value ? "bg-accent font-semibold text-foreground" : "text-foreground",
       ].join(" ")}
      >
       {opt.value === value && <span className="text-primary">✓</span>}
       {opt.value !== value && <span className="w-3" />}
       {opt.label}
      </button>
     ))}
    </div>
   )}
  </div>
 );
}

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
  <div className="my-1 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5">
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
    className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1 text-sm font-medium transition-colors hover:bg-accent"
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

type TplBlock = { type: string; text: string };

function TemplateButtonView({ node, updateAttributes, getPos, editor }: NodeViewProps) {
 const label     = (node.attrs.label     as string) || "New Entry";
 const insertLocation = (node.attrs.insertLocation as string) || "below_button";
 const templateBlocks = (node.attrs.templateBlocks as TplBlock[]) || [{ type: "paragraph", text: "" }];

 const [editing, setEditing]  = useState(false);
 const [draftLabel, setDraftLabel]    = useState(label);
 const [draftLocation, setDraftLocation] = useState(insertLocation);
 const [draftBlocks, setDraftBlocks]   = useState<TplBlock[]>(templateBlocks);

 const saveEdit = useCallback(() => {
  updateAttributes({
   label:     draftLabel.trim() || "New Entry",
   insertLocation: draftLocation,
   templateBlocks: draftBlocks,
  });
  setEditing(false);
 }, [draftLabel, draftLocation, draftBlocks, updateAttributes]);

 const cancelEdit = useCallback(() => {
  setDraftLabel(label);
  setDraftLocation(insertLocation);
  setDraftBlocks(templateBlocks);
  setEditing(false);
 }, [label, insertLocation, templateBlocks]);

 function handleClick() {
  if (editing) return;
  const pos   = typeof getPos === "function" ? getPos() : null;
  if (pos == null) return;

  const schema = editor.schema;
  const nodesToInsert = templateBlocks.map((b) => {
   const nodeType = schema.nodes[b.type === "todo" ? "taskItem" : b.type === "bullet" ? "listItem" : "paragraph"] ?? schema.nodes.paragraph;
   const textNode = b.text ? schema.text(b.text) : null;
   return nodeType.create({}, textNode ? [textNode] : []);
  });

  const tr = editor.view.state.tr;
  if (insertLocation === "below_button") {
   const insertPos = pos + node.nodeSize;
   for (let i = nodesToInsert.length - 1; i >= 0; i--) {
    tr.insert(insertPos, nodesToInsert[i]);
   }
  } else {
   // bottom of page
   const docSize = editor.view.state.doc.content.size;
   for (let i = nodesToInsert.length - 1; i >= 0; i--) {
    tr.insert(docSize - 1, nodesToInsert[i]);
   }
  }
  editor.view.dispatch(tr);
 }

 if (editing) {
  return (
   <NodeViewWrapper contentEditable={false}>
    <div className="my-2 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
     <p className="mb-3 text-xs font-semibold tracking-wide text-primary/60">
      ⚡ Template Button — Edit
     </p>

     {/* Label */}
     <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-foreground/70">Button label</label>
      <input
       type="text"
       value={draftLabel}
       onChange={(e) => setDraftLabel(e.target.value)}
       placeholder="e.g. + Add Today's Log"
       // biome-ignore lint/a11y/noAutofocus: intentional — edit panel just opened
       autoFocus
       className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
     </div>

     {/* Insert location */}
     <div className="mb-3">
      <label className="mb-1.5 block text-xs font-medium text-foreground/70">Insert location</label>
      <div className="flex gap-2">
       {([
        { key: "below_button", label: "Below button" },
        { key: "bottom_of_page", label: "Bottom of page" },
       ] as const).map((opt) => (
        <button
         key={opt.key}
         type="button"
         onClick={() => setDraftLocation(opt.key)}
         className={[
          "rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium transition-colors",
          draftLocation === opt.key
           ? "border-primary bg-primary/10 text-primary"
           : "border-border text-muted-foreground hover:bg-accent",
         ].join(" ")}
        >
         {opt.label}
        </button>
       ))}
      </div>
     </div>

     {/* Template blocks */}
     <div className="mb-3">
      <label className="mb-1.5 block text-xs font-medium text-foreground/70">Template content</label>
      <div className="flex flex-col gap-1.5">
       {draftBlocks.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
         <BlockTypeSelect
          value={b.type}
          onChange={(v) => {
           const next = [...draftBlocks];
           next[i] = { ...next[i], type: v };
           setDraftBlocks(next);
          }}
         />
         <input
          type="text"
          value={b.text}
          onChange={(e) => {
           const next = [...draftBlocks];
           next[i] = { ...next[i], text: e.target.value };
           setDraftBlocks(next);
          }}
          placeholder="Block text…"
          className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
         />
         <button
          type="button"
          onClick={() => setDraftBlocks(draftBlocks.filter((_, j) => j !== i))}
          className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
         >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
           <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
         </button>
        </div>
       ))}
       <button
        type="button"
        onClick={() => setDraftBlocks([...draftBlocks, { type: "paragraph", text: "" }])}
        className="mt-0.5 self-start rounded-[var(--radius-sm)] border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground/60 hover:border-primary/30 hover:text-primary"
       >
        + Add block
       </button>
      </div>
     </div>

     {/* Actions */}
     <div className="flex items-center gap-2">
      <button
       type="button"
       onMouseDown={(e) => e.preventDefault()}
       onClick={saveEdit}
       className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
       Save ↵
      </button>
      <button
       type="button"
       onMouseDown={(e) => e.preventDefault()}
       onClick={cancelEdit}
       className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
      >
       Cancel
      </button>
     </div>
    </div>
   </NodeViewWrapper>
  );
 }

 return (
  <NodeViewWrapper contentEditable={false}>
   <div className="my-0.5 flex items-center gap-2">
    <button
     type="button"
     onMouseDown={(e) => e.preventDefault()}
     onClick={handleClick}
     className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
    >
     <span>⚡</span>
     <span>{label}</span>
    </button>
    <button
     type="button"
     onMouseDown={(e) => e.preventDefault()}
     onClick={() => { setDraftLabel(label); setDraftLocation(insertLocation); setDraftBlocks(templateBlocks); setEditing(true); }}
     className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground/70 hover:bg-accent hover:text-muted-foreground"
    >
     Edit
    </button>
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
    <div className="my-2 flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-muted p-3">
     <span className="text-xs font-semibold tracking-wide text-muted-foreground">
      ∑ Equation — LaTeX
     </span>
     <div className="flex gap-2">
      <input
       type="text"
       className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
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
       className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
      "my-2 cursor-pointer rounded-[var(--radius-sm)] border p-4 text-center transition-colors",
      selected
       ? "border-primary bg-primary/5"
       : "border-transparent hover:border-border hover:bg-accent",
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
   blockId:  { default: null },
   expression: { default: "" },
  };
 },

 parseHTML() { return [{ tag: "div[data-type='mathBlock']" }]; },
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
   pageId: { default: "" },
  };
 },

 parseHTML() { return [{ tag: "div[data-type='linkedPage']" }]; },
 renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
  return ["div", mergeAttributes(HTMLAttributes, { "data-type": "linkedPage" })];
 },

 addNodeView() {
  return ReactNodeViewRenderer(LinkedPageView);
 },
});

// ── Inline Database ────────────────────────────────────────────────────────────

interface InlineDatabaseOptions {
 workspaceId:  string;
 workspaceSlug: string;
 isEditor:   boolean;
}

function InlineDatabaseView({ node, updateAttributes, extension, deleteNode, getPos, editor }: NodeViewProps) {
 const databaseId  = (node.attrs.databaseId as string) || "";
 const shortId    = (node.attrs.shortId  as string) || "";
 const { workspaceId, workspaceSlug, isEditor } = extension.options as InlineDatabaseOptions;

 const [creating, setCreating]  = useState(false);
 const [searching, setSearching] = useState(false);
 const [query, setQuery]     = useState("");
 const [results, setResults]   = useState<{ id: string; shortId: string; title: string | null }[]>([]);
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
     <div className="my-1 rounded-[var(--radius-md)] border border-border bg-background p-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground/60">Link an existing database</p>
      <input
       ref={inputRef}
       autoFocus
       value={query}
       onChange={(e) => setQuery(e.target.value)}
       placeholder="Search databases…"
       className="w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      {searchLoading && (
       <p className="mt-2 text-xs text-muted-foreground">Searching…</p>
      )}
      {results.length > 0 && (
       <div className="mt-2 flex flex-col gap-0.5">
        {results.map((r) => (
         <button
          key={r.id}
          onClick={() => handleLink(r.id, r.shortId)}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
         >
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
       <p className="mt-2 text-xs text-muted-foreground/70">No databases found</p>
      )}
      <button
       onClick={() => { setSearching(false); setQuery(""); setResults([]); }}
       className="mt-3 text-xs text-muted-foreground hover:text-muted-foreground"
      >
       ← Back
      </button>
     </div>
    </NodeViewWrapper>
   );
  }

  return (
   <NodeViewWrapper contentEditable={false}>
    <div className="my-1 flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border bg-muted/20 p-4">
     <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/50">
      <svg viewBox="0 0 16 16" className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5}>
       <rect x="1" y="1" width="14" height="14" rx="2"/>
       <line x1="1" y1="5" x2="15" y2="5"/>
       <line x1="5" y1="5" x2="5" y2="15"/>
      </svg>
     </div>
     <div className="flex-1">
      <p className="text-sm font-medium text-foreground/70">Add a database</p>
      <p className="text-xs text-muted-foreground">Create a new database or embed an existing one</p>
     </div>
     {isEditor && (
      <div className="flex items-center gap-2">
       <button
        onClick={handleCreateNew}
        disabled={creating}
        className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
       >
        {creating ? "Creating…" : "New database"}
       </button>
       <button
        onClick={() => { setSearching(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
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
   <div className="my-3 overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-background">
    {/* Inline header bar */}
    <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
     <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="1" width="14" height="14" rx="2"/>
      <line x1="1" y1="5" x2="15" y2="5"/>
      <line x1="5" y1="5" x2="5" y2="15"/>
     </svg>
     <span className="text-xs font-semibold text-muted-foreground tracking-wide">Inline database</span>
     <div className="ml-auto flex items-center gap-0.5">
      {isEditor && (
       <>
        <button
         title="Duplicate block"
         onMouseDown={handleDuplicate}
         className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground"
        >
         <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="5" y="5" width="9" height="9" rx="1.5"/>
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>
         </svg>
        </button>
        <button
         title="Delete block"
         onMouseDown={handleDelete}
         className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
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
        className="ml-1 flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-xs text-muted-foreground/70 transition-colors hover:bg-accent hover:text-primary"
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
   blockId:    { default: null },
   databaseId:  { default: "" },
   shortId:    { default: "" },
   defaultViewId: { default: "" },
  };
 },

 parseHTML() { return [{ tag: "div[data-type='inlineDatabase']" }]; },
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
   blockId:    { default: null },
   label:     { default: "New Entry" },
   insertLocation: { default: "below_button" },
   templateBlocks: { default: [{ type: "paragraph", text: "" }] },
  };
 },

 parseHTML() { return [{ tag: "div[data-type='templateButton']" }]; },
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

 parseHTML() { return [{ tag: "div[data-type='toc']" }]; },
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
   blockId:   { default: null },
   columnCount: { default: 2 },
  };
 },

 parseHTML() { return [{ tag: "div[data-type='columns']" }]; },
 renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
  return ["div", mergeAttributes(HTMLAttributes, { "data-type": "columns" }), 0];
 },
});
