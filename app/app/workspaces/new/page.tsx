import Image from "next/image";
import { requireSession } from "@/lib/authz";
import { createWorkspaceAction } from "@/app/actions/workspaces";
import { PRODUCT_NAME } from "@/config/platform";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateWorkspaceSubmitButton } from "./submit-button";

export const metadata = { title: `Create Workspace — ${PRODUCT_NAME}` };

type Props = { searchParams: Promise<{ kind?: string; error?: string }> };

export default async function NewWorkspacePage({ searchParams }: Props) {
 await requireSession();
 const { kind, error } = await searchParams;
 const isTeam = kind === "team";

 return (
  <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-16">
   <div className="flex w-full max-w-sm flex-col items-center">

    {/* Logo */}
    <div className="mb-8">
     <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-9 w-auto" />
    </div>

    {/* Heading */}
    <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
     {isTeam ? "Create your team workspace" : "Create your workspace"}
    </h1>
    <p className="mb-8 text-center text-sm text-muted-foreground">
     {isTeam
      ? "A shared space for your team to organise, write, and ship."
      : "Your personal space to capture ideas and stay organised."}
    </p>

    {/* Form card */}
    <div className="w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
     <form action={createWorkspaceAction} className="px-7 pt-7 pb-5">
      <input type="hidden" name="kind" value={isTeam ? "team" : "personal"} />

      <div className="space-y-1.5">
       <Label
        htmlFor="name"
        className="text-sm font-medium text-foreground"
       >
        {isTeam ? "Team name" : "Workspace name"}
       </Label>
       <Input
        id="name"
        name="name"
        type="text"
        placeholder={isTeam ? "e.g. Acme Corp" : "e.g. My Projects"}
        required
        autoFocus
        maxLength={100}
        className="w-full focus-visible:border-primary"
       />
       {error === "empty-name" && (
        <p className="text-xs text-destructive">Please enter a name for your workspace.</p>
       )}
      </div>

      <CreateWorkspaceSubmitButton label={isTeam ? "Create team workspace" : "Create workspace"} />
     </form>

     <div className="border-t border-border px-7 py-4">
      <p className="text-center text-xs text-muted-foreground/50">
       You can rename or create more workspaces later in settings.
      </p>
     </div>
    </div>

   </div>
  </div>
 );
}
