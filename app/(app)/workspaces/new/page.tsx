import { requireSession } from "@/lib/authz";
import { NewWorkspaceForm } from "@/components/workspace/new-workspace-form";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = { title: `Create Workspace — ${PRODUCT_NAME}` };

export default async function NewWorkspacePage() {
  await requireSession();
  return <NewWorkspaceForm />;
}
