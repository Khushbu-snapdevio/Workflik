import { useState, useMemo, useCallback } from "react";
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
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

export const InlineDatabase = Node.create({
  name: "inlineDatabase",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      blockId:       { default: null },
      databaseId:    { default: "" },
      defaultViewId: { default: "" },
    };
  },

  parseHTML()  { return [{ tag: "div[data-type='inlineDatabase']" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "inlineDatabase" })];
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
