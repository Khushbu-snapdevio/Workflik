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
      {/* Back */}
      <Link href="/Orbit-admin/orbit/templates"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#a8a29e] transition hover:text-[#5c5a55]">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
          <path d="M8 2L4 6l4 4"/>
        </svg>
        Back to templates
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4f46e5] via-[#6366f1] to-[#818cf8] p-7 shadow-[0_8px_32px_rgba(79,70,229,0.25)]">
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Templates / Edit</p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-white">{tpl.name}</h1>
          <p className="mt-1 text-[13px] text-white/55">Update content, name, category, or publish status.</p>
        </div>
      </div>

      {/* Form */}
      <div className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <TemplateForm template={tpl as Parameters<typeof TemplateForm>[0]["template"] & { id: string; name: string; description: string | null; category: string }} />
      </div>
    </div>
  );
}
