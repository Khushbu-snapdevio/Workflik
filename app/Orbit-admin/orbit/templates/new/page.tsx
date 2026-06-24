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
     className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M7.5 2.5L4 6l3.5 3.5"/>
     </svg>
     Templates
    </Link>
    <span className="select-none text-[13px] font-light text-muted-foreground/30">/</span>
    <span className="text-[11.5px] font-semibold text-foreground">New template</span>
   </div>

   {/* Header */}
   <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
    <div className="p-6">
     <h1 className="text-[28px] font-bold tracking-tight text-foreground">New Template</h1>
     <p className="mt-1 text-[13px] text-muted-foreground">Author a built-in template. Save as draft, then publish to make it visible to users.</p>
    </div>
   </div>

   {/* Form */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <TemplateForm />
   </div>
  </div>
 );
}
