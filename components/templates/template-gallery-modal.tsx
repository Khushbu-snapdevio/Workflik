"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon,
  XIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SquaresFourIcon,
  LightningIcon,
  ChartBarIcon,
  MegaphoneSimpleIcon,
  CodeIcon,
  CurrencyDollarIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";

type DbProp = { name: string; type: string; options?: { name: string; color: string }[]; multiple?: boolean };
type DbView = { name: string; type: string; isDefault?: boolean; groupBy?: string };

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
  workspaceId: string | null;
  createdBy: string | null;
  pageSnapshot: {
    title: string;
    icon: string | null;
    blocks: { type: string; content?: unknown }[];
    database_schema?: { properties: DbProp[]; views: DbView[]; sample_rows?: Record<string, string | number>[] } | null;
  };
};

type CategoryDef = {
  key: string;
  label: string;
  Icon: Icon;
};

const CATEGORIES: CategoryDef[] = [
  { key: "all",          label: "All Templates",       Icon: SquaresFourIcon      },
  { key: "productivity", label: "Productivity",         Icon: LightningIcon        },
  { key: "project_mgmt", label: "Project Management",  Icon: ChartBarIcon         },
  { key: "marketing",    label: "Marketing & Content",  Icon: MegaphoneSimpleIcon  },
  { key: "engineering",  label: "Engineering & Docs",   Icon: CodeIcon             },
  { key: "sales",        label: "Sales & Finance",      Icon: CurrencyDollarIcon   },
];

const CATEGORY_COLORS: Record<string, { from: string; to: string; badge: string; accent: string }> = {
  productivity: { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" },
  project_mgmt: { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" },
  marketing:    { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" },
  engineering:  { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" },
  sales:        { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" },
};

const DEFAULT_COLOR = { from: "from-primary/[0.05]", to: "to-primary/[0.1]", badge: "bg-primary/10 text-primary", accent: "#0284C7" };

const OPTION_COLORS: Record<string, { dot: string; badge: string }> = {
  gray:   { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300"         },
  red:    { dot: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"             },
  blue:   { dot: "bg-[#0284C7]",  badge: "bg-primary/10 text-primary"                                              },
  green:  { dot: "bg-emerald-500",badge: "bg-emerald-50 text-emerald-700"                                           },
  orange: { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700"                                               },
  purple: { dot: "bg-[#0284C7]",  badge: "bg-primary/10 text-primary"                                              },
  yellow: { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700"                                               },
  pink:   { dot: "bg-[#0369a1]",  badge: "bg-primary/10 text-primary"                                              },
};
const DEFAULT_OPT = { dot: "bg-muted-foreground/40", badge: "bg-muted/60 text-muted-foreground" };

interface Props {
  workspaceId:      string;
  workspaceSlug:    string;
  parentId?:        string | null;
  initialCategory?: string;
  onClose:          () => void;
}

export function TemplateGalleryModal({ workspaceId, workspaceSlug, parentId, initialCategory, onClose }: Props) {
  const router = useRouter();
  const [builtIn, setBuiltIn]     = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState<string>(initialCategory ?? "all");
  const [step, setStep]           = useState<"gallery" | "detail">("gallery");
  const [selected, setSelected]   = useState<Template | null>(null);
  const [applying, setApplying]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/workspaces/${workspaceId}/templates`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([bi, ws]) => {
        setBuiltIn(Array.isArray(bi) ? bi : []);
        setWorkspace(Array.isArray(ws) ? ws : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    setTimeout(() => searchRef.current?.focus(), 80);
  }, [workspaceId]);

  const q = search.toLowerCase().trim();
  const matches = (t: Template) =>
    (!q || t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) &&
    (activeTab === "all" || t.category === activeTab);

  const filteredBuiltIn   = builtIn.filter(matches);
  const filteredWorkspace = workspace.filter(matches);
  const total = builtIn.length + workspace.length;

  function countForTab(key: string) {
    if (key === "all") return total;
    return [...builtIn, ...workspace].filter((t) => t.category === key).length;
  }

  function handleSelectTemplate(tpl: Template) {
    setSelected(tpl);
    setStep("detail");
  }

  function handleBack() {
    setStep("gallery");
    setSelected(null);
  }

  async function applyTemplate(tpl: Template) {
    setApplying(true);
    try {
      const res = await fetch(`/api/templates/${tpl.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, parentId: parentId ?? null }),
      });
      if (res.ok) {
        const data = (await res.json()) as { shortId: string; kind: string };
        onClose();
        // Database templates open in the template view; regular pages open normally
        if (data.kind === "database") {
          router.push(`/app/${workspaceSlug}/t/${data.shortId}`);
        } else {
          router.push(`/app/${workspaceSlug}/${data.shortId}`);
        }
      }
    } finally {
      setApplying(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex h-[88vh] w-full max-w-[980px] overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-background shadow-[0_32px_64px_rgba(0,0,0,0.25)]">

        {/* ── GALLERY STEP ── */}
        {step === "gallery" && (
          <>
            {/* Left sidebar */}
            <div className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-muted/30">
              <div className="px-5 pb-3 pt-5">
                <h2 className="text-base font-bold tracking-tight text-foreground">Templates</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Pick a starting point</p>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 pb-3">
                {CATEGORIES.map((cat) => {
                  const cnt      = countForTab(cat.key);
                  const isActive = activeTab === cat.key;
                  const CatIcon  = cat.Icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveTab(cat.key)}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      <CatIcon size={14} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                      <span className="flex-1 text-xs font-medium">{cat.label}</span>
                      {cnt > 0 && (
                        <span className={[
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          isActive ? "bg-white/20 text-white" : "bg-muted-foreground/10 text-muted-foreground",
                        ].join(" ")}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Search */}
              <div className="border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/40 px-3.5 py-2.5">
                  <MagnifyingGlassIcon size={15} className="shrink-0 text-muted-foreground/60" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/40 hover:text-muted-foreground">
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loading ? (
                  <LoadingSkeleton />
                ) : filteredBuiltIn.length === 0 && filteredWorkspace.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-6">
                    {filteredBuiltIn.length > 0 && (
                      <section>
                        <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          WorkFlik Templates
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {filteredBuiltIn.map((tpl) => (
                            <TemplateCard
                              key={tpl.id}
                              template={tpl}
                              onSelect={() => handleSelectTemplate(tpl)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {filteredWorkspace.length > 0 && (
                      <section>
                        <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          Workspace Templates
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {filteredWorkspace.map((tpl) => (
                            <TemplateCard
                              key={tpl.id}
                              template={tpl}
                              onSelect={() => handleSelectTemplate(tpl)}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── DETAIL STEP ── */}
        {step === "detail" && selected && (() => {
          const colors   = CATEGORY_COLORS[selected.category] ?? DEFAULT_COLOR;
          const catDef   = CATEGORIES.find((c) => c.key === selected.category);
          const CatIcon  = catDef?.Icon ?? SquaresFourIcon;
          const blocks   = selected.pageSnapshot.blocks ?? [];

          return (
            <div className="flex h-full w-full">
              {/* Left panel */}
              <div className="flex w-[380px] shrink-0 flex-col border-r border-border/60 bg-background">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeftIcon size={14} weight="bold" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Templates</p>
                    <h3 className="truncate text-sm font-bold text-foreground">{selected.name}</h3>
                  </div>
                </div>

                {/* Info + block list */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {/* Category + description */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${colors.badge}`}>
                    <CatIcon size={10} weight="fill" />
                    {catDef?.label}
                  </span>

                  {selected.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {selected.description}
                    </p>
                  )}

                  {/* DB schema preview or block list */}
                  {selected.pageSnapshot.database_schema ? (
                    <DbSchemaPreview schema={selected.pageSnapshot.database_schema} />
                  ) : blocks.length > 0 ? (
                    <div className="mt-5">
                      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Included in this template
                      </p>
                      <div className="space-y-1.5 rounded-[var(--radius-md)] border border-border/50 bg-muted/20 p-3">
                        {blocks.slice(0, 12).map((b, i) => (
                          <BlockPreview key={i} block={b as { type: string; content?: unknown }} />
                        ))}
                        {blocks.length > 12 && (
                          <p className="text-[10px] text-muted-foreground/40">
                            + {blocks.length - 12} more blocks…
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Continue CTA */}
                <div className="border-t border-border/60 p-5">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => applyTemplate(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                  >
                    {applying ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating page…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRightIcon size={14} weight="bold" />
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[10.5px] text-muted-foreground/50">
                    Creates an independent copy of this template
                  </p>
                </div>
              </div>

              {/* Right panel — page preview */}
              <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
                <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
                  <div className="w-full max-w-[580px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-background shadow-[var(--shadow-raised)]">
                    {/* Gradient cover */}
                    <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to}`}>
                      <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "radial-gradient(circle, #0284C7 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-primary/10 to-transparent" />
                      {selected.pageSnapshot.icon ? (
                        <span className="relative z-10 text-5xl">{selected.pageSnapshot.icon}</span>
                      ) : (
                        <CatIcon size={48} weight="duotone" className="relative z-10 text-primary" />
                      )}
                    </div>

                    {/* Page content preview */}
                    <div className="px-6 py-5">
                      <h1 className="mb-1 text-xl font-bold text-foreground">
                        {selected.pageSnapshot.title || selected.name}
                      </h1>
                      {blocks[0] && (() => {
                        const c = blocks[0].content as { text?: { text: string }[] } | null;
                        const txt = c?.text?.map((t) => t.text).join("") ?? "";
                        return txt ? (
                          <p className="mb-4 text-xs text-muted-foreground">{txt}</p>
                        ) : null;
                      })()}

                      {selected.pageSnapshot.database_schema ? (
                        <DatabasePreview schema={selected.pageSnapshot.database_schema} />
                      ) : (
                        <div className="space-y-2">
                          {blocks.slice(1, 14).map((b, i) => (
                            <PageBlockPreview key={i} block={b as { type: string; content?: unknown }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-background/80 text-muted-foreground shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          style={{ zIndex: 10 }}
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  const colors  = CATEGORY_COLORS[template.category] ?? DEFAULT_COLOR;
  const catDef  = CATEGORIES.find((c) => c.key === template.category);
  const CatIcon = catDef?.Icon ?? SquaresFourIcon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]"
    >
      {/* Color cover */}
      <div className={`relative flex h-[80px] items-center justify-center bg-gradient-to-br ${colors.from} ${colors.to} overflow-hidden`}>
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "radial-gradient(circle, #0284C7 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-primary/10 to-transparent" />
        {template.pageSnapshot.icon ? (
          <span className="relative z-10 text-[30px] transition-transform duration-200 group-hover:scale-110">
            {template.pageSnapshot.icon}
          </span>
        ) : (
          <CatIcon
            size={30}
            weight="duotone"
            className="relative z-10 text-primary transition-transform duration-200 group-hover:scale-110"
          />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[12.5px] font-semibold leading-snug text-foreground">{template.name}</p>
        {template.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/65">
            {template.description}
          </p>
        )}
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${colors.badge}`}>
            <CatIcon size={9} weight="fill" />
            {catDef?.label ?? template.category}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Block preview (compact, for left panel list) ───────────────────────────────

const BLOCK_ICONS: Record<string, string> = {
  h1: "H1", h2: "H2", h3: "H3", paragraph: "¶",
  bullet: "•", numbered: "#", todo: "☐", quote: "❝",
  callout: "💡", divider: "—", table: "⊞", code: "</>",
};

function BlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const icon = BLOCK_ICONS[block.type] ?? "·";
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map((t) => t.text).join("") ?? "";
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px w-5 shrink-0 text-center text-[9px] font-bold text-muted-foreground/30">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/60">
        {text || <span className="italic text-muted-foreground/30">{block.type}</span>}
      </span>
    </div>
  );
}

// ── Page block preview (right panel, looks like a real doc) ────────────────────

function PageBlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map((t) => t.text).join("") ?? "";

  if (block.type === "divider") {
    return <hr className="border-border/40" />;
  }

  const classMap: Record<string, string> = {
    h1:        "text-base font-bold text-foreground mt-3 first:mt-0",
    h2:        "text-sm font-bold text-foreground mt-2.5 first:mt-0",
    h3:        "text-sm font-semibold text-foreground mt-2",
    paragraph: "text-xs text-muted-foreground leading-relaxed",
    bullet:    "text-xs text-muted-foreground leading-relaxed pl-3 before:content-['•'] before:mr-2 before:text-muted-foreground/40",
    numbered:  "text-xs text-muted-foreground leading-relaxed pl-3",
    todo:      "text-xs text-muted-foreground leading-relaxed pl-3 line-through opacity-50",
    quote:     "text-xs italic text-muted-foreground border-l-2 border-border pl-3",
    code:      "text-xs font-mono text-foreground bg-muted rounded px-1.5 py-0.5",
  };

  const cls = classMap[block.type] ?? "text-xs text-muted-foreground/50";

  return (
    <p className={cls}>
      {text || <span className="opacity-30">—</span>}
    </p>
  );
}

// ── DB schema preview (left panel — property list) ─────────────────────────────

const PROP_TYPE_ICON: Record<string, string> = {
  title: "Aa", text: "Aa", number: "#", select: "≡", multi_select: "≡",
  date: "📅", checkbox: "☐", url: "🔗", email: "✉", phone: "☎",
  person: "👤", relation: "↗", created_by: "👤", created_time: "🕐",
  last_edited_by: "👤", last_edited_time: "🕐",
};

function DbSchemaPreview({ schema }: { schema: { properties: DbProp[]; views: DbView[] } }) {
  return (
    <div className="mt-5 space-y-4">
      {/* Views */}
      <div>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Views
        </p>
        <div className="flex flex-wrap gap-1.5">
          {schema.views.map((v) => (
            <span
              key={v.name}
              className={[
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-medium",
                v.isDefault
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground",
              ].join(" ")}
            >
              {v.type === "board" ? "⊞" : v.type === "calendar" ? "📅" : "☰"} {v.name}
            </span>
          ))}
        </div>
      </div>

      {/* Properties */}
      <div>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties ({schema.properties.length})
        </p>
        <div className="divide-y divide-border/40 rounded-[var(--radius-md)] border border-border/50 bg-muted/20">
          {schema.properties.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-5 shrink-0 text-center text-[9px] font-bold text-muted-foreground/40">
                {PROP_TYPE_ICON[p.type] ?? "·"}
              </span>
              <span className="flex-1 text-xs text-foreground/80">{p.name}</span>
              {p.options && p.options.length > 0 && (
                <div className="flex gap-1">
                  {p.options.slice(0, 3).map((o) => (
                    <span key={o.name} className="rounded px-1 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground">
                      {o.name}
                    </span>
                  ))}
                  {p.options.length > 3 && (
                    <span className="text-[9px] text-muted-foreground/40">+{p.options.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared type + shared subcomponents ────────────────────────────────────────

type SchemaForPreview = { properties: DbProp[]; views: DbView[]; sample_rows?: Record<string, string | number>[] };

function ViewTabs({ views, defaultName }: { views: DbView[]; defaultName: string }) {
  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-2">
      {views.map((v) => (
        <span
          key={v.name}
          className={[
            "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium",
            v.name === defaultName ? "bg-primary/10 text-primary" : "text-muted-foreground/50",
          ].join(" ")}
        >
          {v.name}
        </span>
      ))}
    </div>
  );
}

// ── DB table preview ────────────────────────────────────────────────────────────

function DbTablePreview({ schema }: { schema: SchemaForPreview }) {
  const visibleProps = schema.properties.filter((p) => p.type !== "created_by" && p.type !== "created_time" && p.type !== "last_edited_by" && p.type !== "last_edited_time").slice(0, 5);
  const defaultView  = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  const rows         = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        {/* Header */}
        <div className="flex border-b border-border/40 bg-muted/30">
          {visibleProps.map((p) => (
            <div key={p.name} className="flex-1 min-w-0 px-2 py-1.5 text-[9.5px] font-semibold text-muted-foreground/60 truncate">
              <span className="mr-1 opacity-50">{PROP_TYPE_ICON[p.type] ?? "·"}</span>
              {p.name}
            </div>
          ))}
        </div>
        {/* Sample rows */}
        {rows.slice(0, 3).map((row, ri) => (
          <div key={ri} className="flex border-b border-border/30 last:border-0 hover:bg-muted/20">
            {visibleProps.map((p, pi) => {
              const val = row[p.name];
              const opt = p.options?.find((o) => o.name === val);
              return (
                <div key={pi} className="flex-1 min-w-0 px-2 py-1.5 text-[10px] text-foreground/80">
                  {opt ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-medium ${(OPTION_COLORS[opt.color] ?? DEFAULT_OPT).badge}`}>{val}</span>
                  ) : val !== undefined ? (
                    <span className="truncate block">{String(val)}</span>
                  ) : (
                    <span className="text-muted-foreground/20">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground/30">
            No sample data
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board (kanban) preview ─────────────────────────────────────────────────────

function BoardPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  const groupByName = defaultView?.groupBy;
  const groupByProp = schema.properties.find((p) => p.name === groupByName)
    ?? schema.properties.find((p) => p.type === "select");
  const titleProp   = schema.properties.find((p) => p.type === "title");
  const tagProp     = schema.properties.find((p) => p.type === "select" && p !== groupByProp);
  const columns     = (groupByProp?.options ?? []).slice(0, 5);
  const rows        = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {columns.map((col) => {
          const colRows = groupByProp
            ? rows.filter((r) => r[groupByProp.name] === col.name)
            : [];
          const clr = OPTION_COLORS[col.color] ?? DEFAULT_OPT;
          return (
            <div key={col.name} className="min-w-[130px] flex-shrink-0">
              <div className="mb-2 flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${clr.dot}`} />
                <span className="flex-1 truncate text-[10px] font-semibold text-foreground/70">{col.name}</span>
                {colRows.length > 0 && (
                  <span className="text-[9px] text-muted-foreground/30 tabular-nums">{colRows.length}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {colRows.map((row, i) => {
                  const title  = titleProp ? String(row[titleProp.name] ?? "") : "";
                  const tagVal = tagProp ? String(row[tagProp.name] ?? "") : "";
                  const tagOpt = tagProp?.options?.find((o) => o.name === tagVal);
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-border/50 bg-background p-2 shadow-[var(--shadow-card)]">
                      <p className="text-[10.5px] font-medium leading-snug text-foreground">{title}</p>
                      {tagOpt && (
                        <span className={`mt-1 inline-flex rounded px-1 py-0.5 text-[9px] font-medium ${(OPTION_COLORS[tagOpt.color] ?? DEFAULT_OPT).badge}`}>
                          {tagVal}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-[var(--radius-sm)] border border-dashed border-border/30 p-2">
                  <span className="text-[9px] text-muted-foreground/25">+ New</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar preview ───────────────────────────────────────────────────────────

const CAL_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_WEEKS = [
  [1,  2,  3,  4,  5,  6,  7 ],
  [8,  9,  10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 0,  0,  0,  0,  0 ],
];

function CalendarPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <span className="text-[10.5px] font-semibold text-foreground/70">June 2026</span>
          <div className="flex gap-2 text-[9px] text-muted-foreground/30">
            <span>‹</span>
            <span>›</span>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border/40 bg-muted/10">
          {CAL_DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[8.5px] font-semibold text-muted-foreground/40">
              {d}
            </div>
          ))}
        </div>
        {CAL_WEEKS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-0">
            {week.map((date, di) => (
              <div key={di} className="h-9 border-r border-border/20 p-1 last:border-0">
                {date > 0 && (
                  <span className={
                    date === 19
                      ? "flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground"
                      : "text-[9px] text-muted-foreground/40"
                  }>
                    {date}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DatabasePreview — picks the right view type ────────────────────────────────

function DatabasePreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  if (defaultView?.type === "board")    return <BoardPreview schema={schema} />;
  if (defaultView?.type === "calendar") return <CalendarPreview schema={schema} />;
  return <DbTablePreview schema={schema} />;
}

// ── States ────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-border/40">
          <div className="h-[76px] animate-pulse bg-muted/60" />
          <div className="space-y-1.5 bg-background p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-full animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
        <SquaresFourIcon size={28} weight="duotone" className="text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">No templates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Templates are added by the WorkFlik team via Orbit Admin.
        </p>
      </div>
    </div>
  );
}
