import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { TemplateForm } from "@/components/orbit/template-form";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Template – Orbit Admin" };

export default async function EditTemplatePage({ params }: Props) {
 await requireAdmin();
 const { id } = await params;

 const [tpl] = await db
  .select()
  .from(templates)
  .where(and(eq(templates.id, id), eq(templates.isBuiltIn, true), isNull(templates.workspaceId)))
  .limit(1);

 if (!tpl) notFound();

 return (
  <div className="space-y-6">
   {/* Breadcrumb navigation */}
   <div className="mb-4 flex items-center gap-2">
    <Link href="/orbit-admin/orbit/templates"
     className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M7.5 2.5L4 6l3.5 3.5"/>
     </svg>
     Templates
    </Link>
    <span className="select-none text-sm font-light text-muted-foreground/30">/</span>
    <span className="text-xs font-semibold text-foreground">Edit</span>
   </div>

   {/* Header */}
   <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
    <div className="p-6">
     <h1 className="text-3xl font-bold tracking-tight text-foreground">{tpl.name}</h1>
     <p className="mt-1 text-sm text-muted-foreground">Update content, name, category, or publish status.</p>
    </div>
   </div>

   {/* Form */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <TemplateForm template={tpl as Parameters<typeof TemplateForm>[0]["template"] & { id: string; name: string; description: string | null; category: string }} />
   </div>
  </div>
 );
}
