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
  marketing:    "Marketing",
  engineering:  "Engineering",
  sales:        "Sales",
};

const CATEGORY_COLOR: Record<string, { color: string; bg: string }> = {
  productivity: { color: "#2383e2", bg: "#eff6ff" },
  project_mgmt: { color: "#7c3aed", bg: "#faf5ff" },
  marketing:    { color: "#f59e0b", bg: "#fffbeb" },
  engineering:  { color: "#0891b2", bg: "#f0f9ff" },
  sales:        { color: "#059669", bg: "#f0fdf4" },
};

export default async function OrbitTemplatesPage() {
  await requireAdmin();

  const list = await db
    .select()
    .from(templates)
    .where(and(eq(templates.isBuiltIn, true), isNull(templates.workspaceId)))
    .orderBy(desc(templates.updatedAt));

  const published = list.filter(t => t.status === "published").length;
  const drafts    = list.filter(t => t.status !== "published").length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4f46e5] via-[#6366f1] to-[#818cf8] p-8 shadow-[0_8px_32px_rgba(79,70,229,0.25)]">
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-indigo-300/20 blur-[80px]" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Orbit Admin</p>
            <h1 className="mt-1 text-[32px] font-black tracking-tight text-white">Templates</h1>
            <p className="mt-1 text-[13px] text-white/55">Author and publish built-in templates for the user-facing gallery.</p>
          </div>
          <div className="hidden shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.12] bg-white/[0.07] px-6 py-4 sm:flex">
            {[
              { label: "Total",     value: list.length },
              { label: "Published", value: published },
              { label: "Drafts",    value: drafts },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                {i > 0 && <div className="mx-4 h-8 w-px bg-white/15" />}
                <div className="text-center">
                  <p className="text-[26px] font-black leading-none text-white">{s.value}</p>
                  <p className="mt-1 text-[9.5px] font-bold uppercase tracking-widest text-white/50">{s.label}</p>
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
          className="flex items-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#4338ca]">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="M6 1v10M1 6h10"/>
          </svg>
          New template
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="border-b border-black/[0.05] px-5 py-4">
          <h2 className="text-[13.5px] font-bold text-[#1c1917]">Built-in templates</h2>
          <p className="text-[11px] text-[#a8a29e]">Only published templates appear in the user gallery</p>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-[14px] bg-[#f5f4f2]">
              <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-7">
                <rect x="2" y="2" width="16" height="16" rx="2"/><path d="M2 7h16M7 7v11"/>
              </svg>
            </div>
            <p className="text-[13.5px] font-semibold text-[#a8a29e]">No templates yet</p>
            <p className="mt-1 text-[12px] text-[#c4c1bb]">
              Click <strong className="text-[#4f46e5]">+ New template</strong> or seed defaults above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9f8f7]">
                  {["Template", "Category", "Status", "Updated", "Actions"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {list.map(tpl => {
                  const catStyle  = CATEGORY_COLOR[tpl.category] ?? { color: "#787774", bg: "#f5f4f2" };
                  const isPublished = tpl.status === "published";
                  return (
                    <tr key={tpl.id} className="group transition-colors hover:bg-[#faf9f8]">
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-semibold text-[#1c1917]">{tpl.name}</p>
                        {tpl.description && (
                          <p className="mt-0.5 max-w-sm truncate text-[11px] text-[#a8a29e]">{tpl.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
                          style={{ color: catStyle.color, background: catStyle.bg }}>
                          {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                          isPublished ? "bg-emerald-50 text-emerald-700" : "bg-[#f5f4f2] text-[#787774]"
                        }`}>
                          <span className={`size-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-[#c4c1bb]"}`} />
                          {tpl.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11.5px] text-[#a8a29e]">
                        {tpl.updatedAt
                          ? new Date(tpl.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/Orbit-admin/orbit/templates/${tpl.id}/edit`}
                            className="rounded-[7px] bg-[#f5f4f2] px-2.5 py-1 text-[11px] font-semibold text-[#5c5a55] transition hover:bg-[#e8e8e6] hover:text-[#37352f]">
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
