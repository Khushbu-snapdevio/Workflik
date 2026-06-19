import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { TemplateForm } from "@/components/orbit/template-form";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Template — Orbit" };

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
    <div>
      <OrbitPageHeader
        eyebrow="Templates"
        title={`Edit: ${tpl.name}`}
        description="Update this template's content, name, or category."
      />
      <TemplateForm template={tpl as Parameters<typeof TemplateForm>[0]["template"] & { id: string; name: string; description: string | null; category: string }} />
    </div>
  );
}
