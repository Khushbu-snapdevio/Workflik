import { requireSession } from "@/lib/authz";
import { createWorkspaceAction } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = {
  title: "Create Workspace",
};

export default async function NewWorkspacePage() {
  await requireSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center bg-primary text-primary-foreground font-black text-sm">
            WF
          </div>
          <h1 className="font-black text-2xl text-foreground tracking-tight">
            Create your workspace
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            A workspace is where your team collaborates in {PRODUCT_NAME}.
          </p>
        </div>

        <form action={createWorkspaceAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-xs font-semibold uppercase tracking-ui text-muted-foreground"
            >
              Workspace name
            </label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Acme Corp"
              required
              autoFocus
              maxLength={100}
            />
          </div>

          <Button type="submit" className="w-full">
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
