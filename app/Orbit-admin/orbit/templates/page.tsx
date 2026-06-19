import { desc, eq, and, isNull } from "drizzle-orm";
import Link from "next/link";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { TemplatePublishToggle } from "@/components/orbit/template-publish-toggle";
import { SeedTemplatesButton } from "@/components/orbit/seed-templates-button";

export const metadata = { title: "Templates — Orbit" };

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity",
  project_mgmt: "Project Mgmt",
  marketing:    "Marketing & Content",
  engineering:  "Engineering & Docs",
  sales:        "Sales & Finance",
};

export default async function OrbitTemplatesPage() {
  await requireAdmin();

  const list = await db
    .select()
    .from(templates)
    .where(and(eq(templates.isBuiltIn, true), isNull(templates.workspaceId)))
    .orderBy(desc(templates.updatedAt));

  return (
    <div>
      <OrbitPageHeader
        eyebrow="Admin"
        title="Built-in Templates"
        description="Author and publish templates that appear in the user-facing gallery."
      />

      <div className="mb-4 flex items-center justify-between">
        <SeedTemplatesButton currentCount={list.length} />
        <Link
          href="/Orbit-admin/orbit/templates/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          + New Template
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Built-in Templates</CardTitle>
          <CardDescription>
            {list.length} template{list.length !== 1 ? "s" : ""}. Only published templates appear in the user-facing gallery.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No templates yet. Click <strong>+ New Template</strong> to create one.
                  </TableCell>
                </TableRow>
              )}
              {list.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell>
                    <div className="font-semibold">{tpl.name}</div>
                    {tpl.description && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">
                        {tpl.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tpl.status === "published" ? "default" : "secondary"}
                      className={tpl.status === "published" ? "text-emerald-600" : ""}
                    >
                      {tpl.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/Orbit-admin/orbit/templates/${tpl.id}/edit`}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Edit
                      </Link>
                      <TemplatePublishToggle
                        templateId={tpl.id}
                        currentStatus={tpl.status}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
