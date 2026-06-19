import { requireAdmin } from "@/lib/authz";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { TemplateForm } from "@/components/orbit/template-form";

export const metadata = { title: "New Template — Orbit" };

export default async function NewTemplatePage() {
  await requireAdmin();

  return (
    <div>
      <OrbitPageHeader
        eyebrow="Templates"
        title="New Template"
        description="Author a new built-in template. Save as draft, then publish to make it visible to users."
      />
      <TemplateForm />
    </div>
  );
}
