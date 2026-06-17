import { requireSession } from "@/lib/authz";
import { createWorkspaceAction } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = { title: `Create Workspace — ${PRODUCT_NAME}` };

type Props = { searchParams: Promise<{ kind?: string }> };

export default async function NewWorkspacePage({ searchParams }: Props) {
  await requireSession();
  const { kind } = await searchParams;
  const isTeam = kind === "team";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-4 py-16">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Logo mark */}
        <div className="mb-7 flex size-16 items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground text-xl shadow-lg shadow-primary/30">
          WF
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-center text-[1.75rem] font-black leading-tight tracking-tight text-foreground">
          {isTeam ? "Create your team workspace" : "Create your workspace"}
        </h1>
        <p className="mb-8 max-w-[22rem] text-center text-sm leading-relaxed text-muted-foreground">
          {isTeam
            ? "Set up a shared space for your team to organise, collaborate, and ship — all in one place."
            : "Your personal space to capture ideas, manage tasks, and stay organised."}
        </p>

        {/* Type badge */}
        <div className="mb-5 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-sm">
          <span className="text-base leading-none">{isTeam ? "👥" : "👤"}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {isTeam ? "Team workspace" : "Personal workspace"}
          </span>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border bg-card shadow-md">
          <form action={createWorkspaceAction} className="p-7">
            {/* Hidden kind field */}
            <input type="hidden" name="kind" value={isTeam ? "team" : "personal"} />

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-xs font-semibold uppercase tracking-ui text-muted-foreground"
              >
                {isTeam ? "Team name" : "Workspace name"}
              </label>
              <Input
                id="name"
                name="name"
                placeholder={isTeam ? "e.g. Acme Corp" : "e.g. My Projects"}
                required
                autoFocus
                maxLength={100}
                className="h-11 text-base"
              />
            </div>

            <Button type="submit" className="mt-5 w-full" size="default">
              {isTeam ? "Create team workspace" : "Create workspace"}
              <svg
                className="ml-1 size-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Button>
          </form>

          <div className="border-t border-border px-7 py-4">
            <p className="text-center text-xs leading-relaxed text-muted-foreground/60">
              You can rename or create more workspaces later in settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
