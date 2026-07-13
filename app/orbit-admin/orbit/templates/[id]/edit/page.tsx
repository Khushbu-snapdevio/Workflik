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
  <div className="space-y-5">
   {/* Breadcrumb */}
   <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Link href="/orbit-admin/orbit/templates"
     className="flex items-center gap-1 transition-colors hover:text-foreground">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M7.5 2.5L4 6l3.5 3.5"/>
     </svg>
     Templates
    </Link>
    <span className="text-border">/</span>
    <span className="font-medium text-foreground">{tpl.name}</span>
   </div>

   {/* Header */}
   <div>
    <h1 className="text-xl font-bold tracking-tight text-foreground">{tpl.name}</h1>
    <p className="mt-1 text-sm text-muted-foreground">Update content, name, category, or publish status.</p>
   </div>

   {/* Form */}
   <TemplateForm template={tpl as Parameters<typeof TemplateForm>[0]["template"] & { id: string; name: string; description: string | null; categoryId: string }} />
  </div>
 );
}
