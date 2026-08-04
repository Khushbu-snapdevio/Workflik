"use client";

import { useState } from "react";
import { Eye, Loader2, Database, FileText, AlertCircle } from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";

interface SchemaProp {
  name: string;
  type: string;
  options?: { name: string; color: string }[];
}
interface SchemaView {
  name: string;
  type: string;
  isDefault?: boolean;
  groupBy?: string;
}
interface DatabaseSchema {
  properties: SchemaProp[];
  views: SchemaView[];
  sample_rows?: Record<string, string | number>[];
}
interface SnapshotBlock {
  id: string;
  type: string;
  content: unknown;
  children?: SnapshotBlock[];
}
interface TemplateDetail {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  pageSnapshot: {
    title: string;
    icon: string | null;
    blocks: SnapshotBlock[];
    database_schema?: DatabaseSchema | null;
  };
}

function blockText(content: unknown): string {
  const c = content as { text?: { text?: string }[] } | undefined;
  return (c?.text ?? []).map((t) => t.text ?? "").join("");
}

const BLOCK_LABELS: Record<string, string> = {
  paragraph: "Text", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  todo: "To-do", bulleted: "Bullet", numbered: "Numbered", toggle: "Toggle",
  quote: "Quote", callout: "Callout", divider: "Divider", code: "Code",
};

function BlockRow({ block, depth = 0 }: { block: SnapshotBlock; depth?: number }) {
  const text = blockText(block.content);
  const checked = (block.content as { checked?: boolean } | undefined)?.checked;
  return (
    <>
      <div className="flex items-start gap-2 py-1" style={{ paddingLeft: depth * 16 }}>
        <span className="mt-0.5 shrink-0 rounded-xs bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
          {block.type === "todo" && checked ? "✓ To-do" : BLOCK_LABELS[block.type] ?? block.type}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
          {text || <span className="italic text-muted-foreground-subtle">(empty)</span>}
        </span>
      </div>
      {block.children?.map((c) => <BlockRow block={c} depth={depth + 1} key={c.id} />)}
    </>
  );
}

function SchemaPreview({ schema }: { schema: DatabaseSchema }) {
  const propNames = schema.properties.map((p) => p.name);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties ({schema.properties.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {schema.properties.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/40 px-2 py-1 text-xs text-foreground/80">
              {p.name} <span className="text-muted-foreground-subtle">· {p.type}</span>
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Views ({schema.views.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {schema.views.map((v) => (
            <span key={v.name} className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {v.name} <span className="text-primary/60">· {v.type}</span>
              {v.isDefault && <span className="text-primary/60">(default)</span>}
            </span>
          ))}
        </div>
      </div>
      {schema.sample_rows && schema.sample_rows.length > 0 && (
        <div>
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sample rows ({schema.sample_rows.length})
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40">
                  {propNames.map((name) => (
                    <th key={name} className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold text-muted-foreground">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schema.sample_rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {propNames.map((name) => (
                      <td key={name} className="whitespace-nowrap px-2.5 py-1.5 text-foreground/80">{row[name] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplatePreviewButton({ templateId }: { templateId: string }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [data, setData]       = useState<TemplateDetail | null>(null);

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orbit/templates/${templateId}`);
      if (res.ok) setData(await res.json());
      else setError("Failed to load template");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <IconTooltipButton icon={<Eye size={14} />} label="Preview" onClick={openPreview} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(600px,88vh)] w-[min(680px,92vw)] max-w-[min(680px,92vw)] sm:max-w-[min(680px,92vw)] flex-col gap-0 overflow-hidden rounded-xl bg-background p-0 ring-0">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : error || !data ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <AlertCircle size={20} className="text-destructive" />
                <p className="text-sm text-muted-foreground">{error || "Template not found"}</p>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-5 pr-14">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      {data.pageSnapshot.icon
                        ? <PageIcon icon={data.pageSnapshot.icon} size={24} />
                        : <FileText size={20} className="text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-foreground">{data.name}</h2>
                      {data.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{data.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="rounded-xs bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">{data.category}</span>
                        <span className={`rounded-xs px-2 py-0.5 text-2xs font-semibold ${data.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {data.status}
                        </span>
                        {data.pageSnapshot.database_schema && (
                          <span className="flex items-center gap-1 rounded-xs bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                            <Database size={9} /> Database
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {data.pageSnapshot.database_schema ? (
                    <SchemaPreview schema={data.pageSnapshot.database_schema} />
                  ) : data.pageSnapshot.blocks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">This template has no content blocks.</p>
                  ) : (
                    <div>
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Content ({data.pageSnapshot.blocks.length} block{data.pageSnapshot.blocks.length === 1 ? "" : "s"})
                      </p>
                      <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                        {data.pageSnapshot.blocks.map((b) => <BlockRow block={b} key={b.id} />)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
