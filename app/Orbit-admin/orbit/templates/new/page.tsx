import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { TemplateForm } from "@/components/orbit/template-form";

export const metadata = { title: "New Template – Orbit Admin" };

export default async function NewTemplatePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Link href="/Orbit-admin/orbit/templates"
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:bg-sky-50 hover:text-primary">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
            <path d="M7.5 2.5L4 6l3.5 3.5"/>
          </svg>
          Templates
        </Link>
        <span className="select-none text-[13px] font-light text-muted-foreground/30">/</span>
        <span className="text-[11.5px] font-semibold text-foreground">New template</span>
      </div>

      {/* Header */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="p-6">
          <h1 className="text-[28px] font-black tracking-tight text-foreground">New Template</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Author a built-in template. Save as draft, then publish to make it visible to users.</p>
        </div>
      </div>

      {/* Form */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
        <TemplateForm />
      </div>
    </div>
  );
}
