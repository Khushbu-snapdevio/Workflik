import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

type Props = { params: Promise<{ workspace: string }> };

export async function generateMetadata({ params }: Props) {
  const { workspace: slug } = await params;
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return { title: ws?.name ?? "Workspace" };
}

export default async function WorkspacePage({ params }: Props) {
  const { workspace: slug } = await params;
  await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="grid size-16 place-items-center bg-muted text-2xl">
        📄
      </div>
      <h1 className="font-semibold text-foreground text-lg">{ws.name}</h1>
      <p className="max-w-sm text-muted-foreground text-sm">
        Select a page from the sidebar to get started, or create a new one.
      </p>
    </div>
  );
}
