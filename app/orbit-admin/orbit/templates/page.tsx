import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { TemplatePublishToggle } from "@/components/orbit/template-publish-toggle";
import { SeedTemplatesButton } from "@/components/orbit/seed-templates-button";
import { TemplateDeleteButton } from "@/components/orbit/template-delete-button";
import { TemplatePreviewButton } from "@/components/orbit/template-preview-modal";
import { IconTooltipButton } from "@/components/orbit/icon-tooltip-button";
import { BackToTopButton } from "@/components/orbit/back-to-top-button";

export const metadata = { title: "Templates – Orbit Admin" };

const CATEGORY_LABELS: Record<string, string> = {
 productivity: "Productivity",
 project_mgmt: "Project Management",
 marketing:  "Marketing",
 engineering: "Engineering",
 sales:    "Sales",
};

const CATEGORY_CLS: Record<string, string> = {
 productivity: "bg-primary/10 text-primary",
 project_mgmt: "bg-secondary text-secondary-foreground",
 marketing:   "bg-destructive/10 text-destructive",
 engineering:  "bg-success/10 text-success",
 sales:       "bg-warning/10 text-warning",
};

export default async function OrbitTemplatesPage() {
 await requireAdmin();

 const list = await db
  .select()
  .from(templates)
  .where(and(eq(templates.isBuiltIn, true), isNull(templates.workspaceId)))
  .orderBy(desc(templates.updatedAt));

 const published = list.filter(t => t.status === "published").length;
 const drafts  = list.filter(t => t.status !== "published").length;

 return (
  <div className="space-y-6">

   {/* Header */}
   <div className="flex items-start justify-between gap-4">
    <div>
     <h1 className="text-xl font-bold tracking-tight text-foreground">Templates</h1>
     <p className="mt-1 text-sm text-muted-foreground">Author and publish built-in templates for the user-facing gallery.</p>
     <div className="mt-3 flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
       <strong className="font-bold text-foreground">{list.length}</strong> total
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
       <strong className="font-bold">{published}</strong> published
      </span>
      {drafts > 0 && (
       <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <strong className="font-bold text-foreground">{drafts}</strong> drafts
       </span>
      )}
     </div>
    </div>
   </div>

   {/* Action bar */}
   <div className="flex items-center justify-between">
    <SeedTemplatesButton currentCount={list.length} />
    <Link href="/orbit-admin/orbit/templates/new"
     className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M6 1v10M1 6h10"/>
     </svg>
     New template
    </Link>
   </div>

   {/* Table */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="border-b border-border/60 bg-muted/20 px-5 py-3.5">
     <h2 className="text-sm font-semibold text-foreground">Built-in templates</h2>
     <p className="text-xs text-muted-foreground">Only published templates appear in the user gallery</p>
    </div>

    {list.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-muted">
       <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-7 text-muted-foreground/50">
        <rect x="2" y="2" width="16" height="16" rx="2"/><path d="M2 7h16M7 7v11"/>
       </svg>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">No templates yet</p>
      <p className="mt-1 text-xs text-muted-foreground/60">
       Click <strong className="text-primary">+ New template</strong> or seed defaults above.
      </p>
     </div>
    ) : (
     <div>
      <table className="w-full">
       <thead className="sticky top-0 z-10 bg-card">
        <tr className="bg-muted/40">
         {["Template", "Category", "Status", "Updated", "Actions"].map(h => (
          <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {list.map(tpl => {
         const catCls = CATEGORY_CLS[tpl.category] ?? "bg-muted text-muted-foreground";
         const isPublished = tpl.status === "published";
         return (
          <tr key={tpl.id} className="group transition-colors hover:bg-accent">
           <td className="px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
            {tpl.description && (
             <p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">{tpl.description}</p>
            )}
           </td>
           <td className="px-5 py-3.5">
            <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${catCls}`}>
             {CATEGORY_LABELS[tpl.category] ?? tpl.category}
            </span>
           </td>
           <td className="px-5 py-3.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
             isPublished ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
             <span className={`size-1.5 rounded-full ${isPublished ? "bg-success" : "bg-muted-foreground/40"}`} />
             {tpl.status}
            </span>
           </td>
           <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted-foreground">
            {tpl.updatedAt
             ? new Date(tpl.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
             : "—"}
           </td>
           <td className="px-5 py-3.5">
            <div className="flex items-center gap-1">
             <TemplatePreviewButton templateId={tpl.id} />
             <IconTooltipButton
              icon={<Pencil size={14} />}
              label="Edit"
              href={`/orbit-admin/orbit/templates/${tpl.id}/edit`}
             />
             <TemplatePublishToggle templateId={tpl.id} templateName={tpl.name} currentStatus={tpl.status} />
             <TemplateDeleteButton templateId={tpl.id} templateName={tpl.name} />
            </div>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}
   </div>

   <BackToTopButton />
  </div>
 );
}
