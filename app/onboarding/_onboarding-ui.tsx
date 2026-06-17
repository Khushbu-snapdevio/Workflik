"use client";

import { useRef, useState, useTransition } from "react";
import { completeOnboardingAction, type InviteEntry } from "@/app/actions/onboarding";
import { PRODUCT_NAME } from "@/config/platform";

/* ─── Question steps (0-2) ─────────────────────────────────────── */

const QUESTION_STEPS = [
  {
    question: "What best describes you?",
    subtitle: "We'll personalise your experience based on your role.",
    options: [
      { value: "student",      emoji: "🎓", label: "Student",         description: "Learning and personal projects" },
      { value: "professional", emoji: "💼", label: "Professional",    description: "Individual work and productivity" },
      { value: "team_lead",    emoji: "👥", label: "Team Lead",       description: "Managing a team or department" },
      { value: "founder",      emoji: "🚀", label: "Founder / Owner", description: "Running a startup or business" },
    ],
  },
  {
    question: "What will you use it for?",
    subtitle: "Pick the option that fits best — you can do more later.",
    options: [
      { value: "notes",         emoji: "📝", label: "Personal notes",      description: "Capture ideas and tasks" },
      { value: "projects",      emoji: "📋", label: "Project management",  description: "Plan and track work" },
      { value: "knowledge",     emoji: "📚", label: "Knowledge base",      description: "Team docs and wikis" },
      { value: "collaboration", emoji: "🤝", label: "Team collaboration",  description: "Work together in real time" },
    ],
  },
  {
    question: "Who's joining you?",
    subtitle: "This helps us set up the right defaults for your workspace.",
    options: [
      { value: "solo",   emoji: "👤", label: "Just me",      description: "Personal workspace" },
      { value: "small",  emoji: "👥", label: "Small team",   description: "2–10 people" },
      { value: "medium", emoji: "🏢", label: "Growing team", description: "11–50 people" },
      { value: "large",  emoji: "🌐", label: "Large org",    description: "50+ people" },
    ],
  },
];

const TEAM_SIZE_STEP = 2;
const WORKSPACE_NAME_STEP = 3;
const INVITE_STEP = 4;
const EMPTY_INVITE: InviteEntry = { email: "", role: "editor" };

/* ─── Component ─────────────────────────────────────────────────── */

export function OnboardingUI() {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState(["", "", ""]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [invites, setInvites] = useState<InviteEntry[]>([
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
  ]);
  const [pending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isTeam = selections[TEAM_SIZE_STEP] !== "solo" && selections[TEAM_SIZE_STEP] !== "";
  const totalSteps = isTeam ? 5 : 4;
  const isQuestionStep = step < QUESTION_STEPS.length;
  const isNameStep = step === WORKSPACE_NAME_STEP;
  const isInviteStep = step === INVITE_STEP;

  // Progress: show total known steps, defaulting to 4 until team is chosen
  const knownTotal = step <= TEAM_SIZE_STEP
    ? 4 // show 4 dots until we know; adjusts after step 2
    : totalSteps;

  /* selection helpers */
  function selectOption(value: string) {
    setSelections((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  function updateInviteEmail(i: number, email: string) {
    setInvites((prev) => prev.map((inv, idx) => idx === i ? { ...inv, email } : inv));
  }

  function updateInviteRole(i: number, role: "editor" | "viewer") {
    setInvites((prev) => prev.map((inv, idx) => idx === i ? { ...inv, role } : inv));
  }

  function addInviteRow() {
    if (invites.length < 8) setInvites((prev) => [...prev, { ...EMPTY_INVITE }]);
  }

  /* navigation */
  function handleContinue() {
    if (isQuestionStep) {
      // After team-size step we know the full total
      setStep((s) => s + 1);
      if (step + 1 === WORKSPACE_NAME_STEP) {
        setTimeout(() => nameInputRef.current?.focus(), 50);
      }
      return;
    }

    if (isNameStep) {
      if (isTeam) {
        setStep(INVITE_STEP);
      } else {
        // Personal — create workspace immediately
        finish();
      }
      return;
    }

    if (isInviteStep) {
      finish();
    }
  }

  function handleSkip() {
    if (isInviteStep) {
      finish();
      return;
    }
    if (isNameStep) {
      if (isTeam) {
        setStep(INVITE_STEP);
      } else {
        finish();
      }
      return;
    }
    setStep((s) => s + 1);
    if (step + 1 === WORKSPACE_NAME_STEP) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }

  function finish() {
    const kind = isTeam ? "team" : "personal";
    startTransition(() =>
      completeOnboardingAction(kind, workspaceName, isTeam ? invites : [])
    );
  }

  /* button state */
  const canContinue = (() => {
    if (isQuestionStep) return !!selections[step];
    if (isNameStep) return workspaceName.trim().length > 0;
    if (isInviteStep) return true; // invite is always skippable
    return false;
  })();

  const isLast = isInviteStep || (!isTeam && isNameStep);

  /* progress dot count */
  const progressTotal = step <= TEAM_SIZE_STEP ? 4 : totalSteps;

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
          {Array.from({ length: progressTotal }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                  ? "w-3 bg-primary/40"
                  : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">
          {isInviteStep ? "Invite your team" : `Step ${step + 1} of ${progressTotal}`}
        </p>

        {/* ── Question step ─────────────────────────────── */}
        {isQuestionStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              {QUESTION_STEPS[step].question}
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              {QUESTION_STEPS[step].subtitle}
            </p>

            <div className="mb-6 grid w-full grid-cols-2 gap-3">
              {QUESTION_STEPS[step].options.map((opt) => {
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

        {/* ── Workspace name step ───────────────────────── */}
        {isNameStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              {isTeam ? "Name your team workspace" : "Name your workspace"}
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              {isTeam
                ? "This is your shared space — you can rename it any time."
                : "A place just for you. Keep it simple and memorable."}
            </p>

            <div className="mb-6 w-full">
              {/* Kind badge */}
              <div className="mb-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <span>{isTeam ? "👥" : "👤"}</span>
                  {isTeam ? "Team workspace" : "Personal workspace"}
                </span>
              </div>

              <input
                ref={nameInputRef}
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
                placeholder={isTeam ? "e.g. Acme Corp" : "e.g. My Projects"}
                maxLength={100}
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-2 text-xs text-muted-foreground/60">
                You can rename or create more workspaces later in settings.
              </p>
            </div>
          </>
        )}

        {/* ── Invite step (team only) ───────────────────── */}
        {isInviteStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              Invite your team to{" "}
              <span className="text-primary">{workspaceName || "your workspace"}</span>
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              They'll get an email invite and can join straight away.
            </p>

            <div className="mb-3 w-full space-y-2.5">
              {invites.map((inv, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder={`teammate${i + 1}@company.com`}
                    value={inv.email}
                    onChange={(e) => updateInviteEmail(i, e.target.value)}
                    className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <select
                    value={inv.role}
                    onChange={(e) => updateInviteRole(i, e.target.value as "editor" | "viewer")}
                    className="h-10 rounded-lg border border-border bg-card px-2 text-xs font-medium text-muted-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              ))}
            </div>

            {invites.length < 8 && (
              <button
                type="button"
                onClick={addInviteRow}
                className="mb-5 flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another
              </button>
            )}

            <div className="mb-5 w-full rounded-xl border border-border bg-muted/40 p-3.5">
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

        {/* ── Actions ───────────────────────────────────── */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || pending}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending
            ? "Setting up…"
            : isInviteStep
            ? "Send invites & open workspace"
            : isLast
            ? `Get started with ${PRODUCT_NAME}`
            : "Continue"}
          {!pending && !isLast && !isInviteStep && (
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
