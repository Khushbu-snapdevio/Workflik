"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/* ─── Step definitions ──────────────────────────────────────────── */

const PERSONAL_STEPS = [
  {
    key: "use_case",
    question: "What will you use this space for?",
    subtitle: "Pick the one that fits best — you can always change later.",
    options: [
      { value: "notes",       emoji: "📝", label: "Personal notes",    description: "Ideas, journaling, quick captures" },
      { value: "tasks",       emoji: "✅", label: "Task management",   description: "To-dos, goals, habits" },
      { value: "knowledge",   emoji: "📚", label: "Knowledge base",    description: "Reference docs and research" },
      { value: "planning",    emoji: "🗓️", label: "Planning",          description: "Roadmaps, schedules, projects" },
    ],
  },
];

const TEAM_STEPS = [
  {
    key: "focus",
    question: "What does your team work on?",
    subtitle: "We'll suggest the best defaults for your teamspace.",
    options: [
      { value: "product",    emoji: "💻", label: "Product & Engineering", description: "Sprints, roadmaps, tech docs" },
      { value: "design",     emoji: "🎨", label: "Design & Creative",     description: "Briefs, assets, feedback" },
      { value: "marketing",  emoji: "📣", label: "Marketing & Growth",    description: "Campaigns, content, analytics" },
      { value: "operations", emoji: "⚙️", label: "Operations & HR",       description: "Processes, policies, SOPs" },
    ],
  },
];

/* ─── Invite row component ──────────────────────────────────────── */

function InviteRow({
  index,
  value,
  role,
  onChange,
  onRoleChange,
}: {
  index: number;
  value: string;
  role: string;
  onChange: (v: string) => void;
  onRoleChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        placeholder={`teammate${index + 1}@company.com`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-2 text-xs font-medium text-muted-foreground focus:border-primary focus:outline-none"
      >
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

type Props = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceKind: string;
};

const EMPTY_INVITE = { email: "", role: "editor" };

export function WorkspaceSetup({ workspaceId, workspaceName, workspaceSlug, workspaceKind }: Props) {
  const router = useRouter();
  const isTeam = workspaceKind === "team";

  const steps = isTeam ? TEAM_STEPS : PERSONAL_STEPS;
  const totalSteps = isTeam ? steps.length + 1 : steps.length; // +1 for invite step

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<string[]>(steps.map(() => ""));
  const [invites, setInvites] = useState([
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
  ]);
  const [inviteError, setInviteError] = useState("");
  const [pending, startTransition] = useTransition();

  const isInviteStep = isTeam && step === steps.length;
  const isLastStep = step === totalSteps - 1;
  const currentStep = !isInviteStep ? steps[step] : null;
  const selected = !isInviteStep ? selections[step] : "skip";

  function selectOption(value: string) {
    setSelections((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  function updateInvite(i: number, email: string) {
    setInvites((prev) => prev.map((inv, idx) => idx === i ? { ...inv, email } : inv));
  }

  function updateRole(i: number, role: string) {
    setInvites((prev) => prev.map((inv, idx) => idx === i ? { ...inv, role } : inv));
  }

  function addInviteRow() {
    if (invites.length < 8) setInvites((prev) => [...prev, { ...EMPTY_INVITE }]);
  }

  async function sendInvites() {
    const toSend = invites.filter((inv) => inv.email.trim() && inv.email.includes("@"));
    for (const inv of toSend) {
      await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inv.email.trim().toLowerCase(), role: inv.role }),
      });
    }
  }

  function handleContinue() {
    if (isInviteStep) {
      startTransition(async () => {
        setInviteError("");
        await sendInvites();
        router.push(`/app/${workspaceSlug}`);
      });
    } else if (isLastStep) {
      router.push(`/app/${workspaceSlug}`);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    if (isLastStep || isInviteStep) {
      router.push(`/app/${workspaceSlug}`);
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-4 py-16">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">

        {/* Logo */}
        <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground text-lg shadow-lg shadow-primary/25">
          WF
        </div>

        {/* Progress dots */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">
          {isInviteStep ? "Invite your team" : `Step ${step + 1} of ${totalSteps}`}
        </p>

        {/* ── Question step ── */}
        {!isInviteStep && currentStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              {currentStep.question}
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              {currentStep.subtitle}
            </p>

            <div className="mb-6 grid w-full grid-cols-2 gap-3">
              {currentStep.options.map((opt) => {
                const isSelected = selections[step] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectOption(opt.value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-secondary shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
                    }`}
                  >
                    <span className="text-2xl leading-none">{opt.emoji}</span>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Invite step (teamspace only) ── */}
        {isInviteStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              Invite your team to{" "}
              <span className="text-primary">{workspaceName}</span>
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              They'll get an email invite and can join right away.
            </p>

            <div className="mb-3 w-full space-y-2.5">
              {invites.map((inv, i) => (
                <InviteRow
                  key={i}
                  index={i}
                  value={inv.email}
                  role={inv.role}
                  onChange={(v) => updateInvite(i, v)}
                  onRoleChange={(v) => updateRole(i, v)}
                />
              ))}
            </div>

            {invites.length < 8 && (
              <button
                type="button"
                onClick={addInviteRow}
                className="mb-6 flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another
              </button>
            )}

            {inviteError && (
              <p className="mb-4 text-xs text-destructive">{inviteError}</p>
            )}

            <div className="mb-6 w-full rounded-xl border border-border bg-muted/40 p-3.5">
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Invites are valid for <strong>7 days</strong>. You can also invite more teammates from workspace settings after setup.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={(!isInviteStep && !selected) || pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending
            ? "Setting up…"
            : isInviteStep
            ? "Send invites & continue"
            : isLastStep
            ? `Open ${workspaceName}`
            : "Continue"}
          {!pending && !isLastStep && !isInviteStep && (
            <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={pending}
          className="mt-3 text-xs text-muted-foreground/60 underline-offset-2 hover:text-muted-foreground hover:underline"
        >
          {isInviteStep ? "Skip for now" : "Skip this step"}
        </button>
      </div>
    </div>
  );
}
