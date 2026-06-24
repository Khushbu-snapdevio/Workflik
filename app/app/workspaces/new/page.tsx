import Image from "next/image";
import { requireSession } from "@/lib/authz";
import { createWorkspaceAction } from "@/app/actions/workspaces";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = { title: `Create Workspace — ${PRODUCT_NAME}` };

type Props = { searchParams: Promise<{ kind?: string }> };

export default async function NewWorkspacePage({ searchParams }: Props) {
 await requireSession();
 const { kind } = await searchParams;
 const isTeam = kind === "team";

 return (
  <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-16">
   <div className="flex w-full max-w-sm flex-col items-center">

    {/* Logo */}
    <div className="mb-8">
     <Image src="/workflik-logo.png" alt="Workflik" width={160} height={40} className="h-9 w-auto" />
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
       <label
        htmlFor="name"
        className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground/60"
       >
        {isTeam ? "Team name" : "Workspace name"}
       </label>
       <input
        id="name"
        name="name"
        type="text"
        placeholder={isTeam ? "e.g. Acme Corp" : "e.g. My Projects"}
        required
        autoFocus
        maxLength={100}
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-page px-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
      </div>

      <button
       type="submit"
       className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)]"
      >
       {isTeam ? "Create team workspace" : "Create workspace"}
       <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7" />
       </svg>
      </button>
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
