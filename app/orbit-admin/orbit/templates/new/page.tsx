import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { TemplateForm } from "@/components/orbit/template-form";

export const metadata = { title: "New Template – Orbit Admin" };

export default async function NewTemplatePage() {
 await requireAdmin();

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
    <span className="font-medium text-foreground">New template</span>
   </div>

   {/* Header */}
   <div>
    <h1 className="text-xl font-bold tracking-tight text-foreground">New Template</h1>
    <p className="mt-1 text-sm text-muted-foreground">Author a built-in template. Save as draft, then publish to make it visible to users.</p>
   </div>

   {/* Form */}
   <TemplateForm />
  </div>
 );
}
