import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { TemplatePublishToggle } from "@/components/orbit/template-publish-toggle";
import { SeedTemplatesButton } from "@/components/orbit/seed-templates-button";

export const metadata = { title: "Templates – Orbit Admin" };

const CATEGORY_LABELS: Record<string, string> = {
 productivity: "Productivity",
 project_mgmt: "Project Mgmt",
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
   <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
     <div>
      <h1 className="text-[28px] font-bold tracking-tight text-foreground">Templates</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Author and publish built-in templates for the user-facing gallery.</p>
     </div>
     <div className="hidden shrink-0 items-center overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card sm:flex">
      {[
       { label: "Total",   value: list.length },
       { label: "Published", value: published },
       { label: "Drafts",  value: drafts },
      ].map((s, i) => (
       <div key={s.label} className="flex items-center">
        {i > 0 && <div className="h-8 w-px bg-border" />}
        <div className="px-6 py-4 text-center">
         <p className="text-[26px] font-bold leading-none text-foreground">{s.value}</p>
         <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">{s.label}</p>
        </div>
       </div>
      ))}
     </div>
    </div>
   </div>

   {/* Action bar */}
   <div className="flex items-center justify-between">
    <SeedTemplatesButton currentCount={list.length} />
    <Link href="/Orbit-admin/orbit/templates/new"
     className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)]">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M6 1v10M1 6h10"/>
     </svg>
     New template
    </Link>
   </div>

   {/* Table */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="border-b border-border px-5 py-4">
     <h2 className="text-[13.5px] font-bold text-foreground">Built-in templates</h2>
     <p className="text-[11px] text-muted-foreground">Only published templates appear in the user gallery</p>
    </div>

    {list.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-muted">
       <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-7 text-muted-foreground/50">
        <rect x="2" y="2" width="16" height="16" rx="2"/><path d="M2 7h16M7 7v11"/>
       </svg>
      </div>
      <p className="text-[13.5px] font-semibold text-muted-foreground">No templates yet</p>
      <p className="mt-1 text-[12px] text-muted-foreground/60">
       Click <strong className="text-primary">+ New template</strong> or seed defaults above.
      </p>
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="bg-muted/40">
         {["Template", "Category", "Status", "Updated", "Actions"].map(h => (
          <th key={h} className="px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {list.map(tpl => {
         const catCls = CATEGORY_CLS[tpl.category] ?? "bg-muted text-muted-foreground";
         const isPublished = tpl.status === "published";
         return (
          <tr key={tpl.id} className="group transition-colors hover:bg-accent/40">
           <td className="px-5 py-3.5">
            <p className="text-[13px] font-semibold text-foreground">{tpl.name}</p>
            {tpl.description && (
             <p className="mt-0.5 max-w-sm truncate text-[11px] text-muted-foreground">{tpl.description}</p>
            )}
           </td>
           <td className="px-5 py-3.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${catCls}`}>
             {CATEGORY_LABELS[tpl.category] ?? tpl.category}
            </span>
           </td>
           <td className="px-5 py-3.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
             isPublished ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
             <span className={`size-1.5 rounded-full ${isPublished ? "bg-success" : "bg-muted-foreground/40"}`} />
             {tpl.status}
            </span>
           </td>
           <td className="px-5 py-3.5 text-[11.5px] text-muted-foreground">
            {tpl.updatedAt
             ? new Date(tpl.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
             : "—"}
           </td>
           <td className="px-5 py-3.5">
            <div className="flex items-center gap-2">
             <Link href={`/Orbit-admin/orbit/templates/${tpl.id}/edit`}
              className="rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
              Edit
             </Link>
             <TemplatePublishToggle templateId={tpl.id} currentStatus={tpl.status} />
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
  </div>
 );
}
