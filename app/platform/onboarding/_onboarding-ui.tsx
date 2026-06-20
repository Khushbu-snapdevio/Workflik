"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { completeOnboardingAction, type InviteEntry } from "@/app/actions/onboarding";
import { PRODUCT_NAME } from "@/config/platform";

/* ─── Question steps ────────────────────────────────────────────── */

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

/* ─── Templates ─────────────────────────────────────────────────── */

const TEMPLATES = [
  { key: "blank",            emoji: "📄", label: "Start blank",       desc: "A clean slate, just for you" },
  { key: "getting-started",  emoji: "👋", label: "Getting Started",   desc: "Intro guide for your workspace" },
  { key: "project-tracker",  emoji: "📋", label: "Project Tracker",   desc: "Tasks, milestones, and progress" },
  { key: "meeting-notes",    emoji: "📝", label: "Meeting Notes",     desc: "Capture agendas and action items" },
  { key: "personal-journal", emoji: "📓", label: "Personal Journal",  desc: "Daily reflections and ideas" },
];

/* ─── Step constants ─────────────────────────────────────────────── */

const PROFILE_STEP      = 0;
const Q_FIRST_STEP      = 1;
const Q_LAST_STEP       = 3;   // teamsize = 3rd question, overall index 3
const WORKSPACE_STEP    = 4;
const INVITE_STEP       = 5;   // team only — solo skips to template at step 5
const TEMPLATE_TEAM     = 6;
const TEMPLATE_SOLO     = 5;

const EMPTY_INVITE: InviteEntry = { email: "", role: "editor" };

/* ─── Avatar colour ──────────────────────────────────────────────── */

const AVATAR_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* ─── Component ─────────────────────────────────────────────────── */

interface Props { initialName: string }

export function OnboardingUI({ initialName }: Props) {
  const [step,         setStep]        = useState(PROFILE_STEP);
  const [displayName,  setDisplayName] = useState(initialName);
  const [jobTitle,     setJobTitle]    = useState("");
  const [selections,   setSelections]  = useState(["", "", ""]);  // role, usecase, teamsize
  const [workspaceName,setWorkspaceName] = useState("");
  const [invites,      setInvites]     = useState<InviteEntry[]>([
    { ...EMPTY_INVITE }, { ...EMPTY_INVITE }, { ...EMPTY_INVITE },
  ]);
  const [templateKey,  setTemplateKey] = useState("blank");
  const [pending, startTransition]     = useTransition();

  const nameInputRef   = useRef<HTMLInputElement>(null);
  const profileNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus profile name on mount
  useEffect(() => { profileNameRef.current?.focus(); }, []);

  const isTeam = selections[2] !== "solo" && selections[2] !== "";

  const totalSteps     = isTeam ? 7 : 6;
  const progressTotal  = selections[2] ? totalSteps : 6;  // known after teamsize selection

  const isProfileStep  = step === PROFILE_STEP;
  const isQuestionStep = step >= Q_FIRST_STEP && step <= Q_LAST_STEP;
  const isNameStep     = step === WORKSPACE_STEP;
  const isInviteStep   = isTeam && step === INVITE_STEP;
  const isTemplateStep = isTeam ? step === TEMPLATE_TEAM : step === TEMPLATE_SOLO;
  const isLast         = isTemplateStep;

  /* ─── helpers ─────────────────────────────────────────────────── */

  function selectOption(value: string) {
    setSelections((prev) => {
      const next = [...prev];
      next[step - 1] = value;  // question index = step - 1
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

  /* ─── navigation ─────────────────────────────────────────────── */

  function handleContinue() {
    if (isProfileStep) {
      setStep(Q_FIRST_STEP);
      return;
    }
    if (isQuestionStep) {
      const next = step + 1;
      setStep(next);
      if (next === WORKSPACE_STEP) setTimeout(() => nameInputRef.current?.focus(), 50);
      return;
    }
    if (isNameStep) {
      if (isTeam) { setStep(INVITE_STEP); }
      else { setStep(TEMPLATE_SOLO); }
      return;
    }
    if (isInviteStep) {
      setStep(TEMPLATE_TEAM);
      return;
    }
    if (isTemplateStep) {
      finish(); // uses selected templateKey
    }
  }

  function handleSkip() {
    if (isProfileStep) {
      setStep(Q_FIRST_STEP);
      return;
    }
    if (isQuestionStep) {
      const next = step + 1;
      setStep(next);
      if (next === WORKSPACE_STEP) setTimeout(() => nameInputRef.current?.focus(), 50);
      return;
    }
    if (isNameStep) {
      if (isTeam) { setStep(INVITE_STEP); }
      else { setStep(TEMPLATE_SOLO); }
      return;
    }
    if (isInviteStep) {
      setStep(TEMPLATE_TEAM);
      return;
    }
    if (isTemplateStep) {
      finish("blank"); // "Start blank instead" always resets
    }
  }

  function finish(overrideTemplate?: string) {
    const kind = isTeam ? "team" : "personal";
    const timezone = typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
    startTransition(() =>
      completeOnboardingAction({
        kind,
        workspaceName,
        invites: isTeam ? invites : [],
        displayName:  displayName.trim(),
        jobTitle:     jobTitle.trim(),
        timezone,
        templateKey:  overrideTemplate ?? templateKey,
      })
    );
  }

  /* ─── button state ────────────────────────────────────────────── */

  const canContinue = (() => {
    if (isProfileStep)  return displayName.trim().length > 0;
    if (isQuestionStep) return !!selections[step - 1];
    if (isNameStep)     return workspaceName.trim().length > 0;
    if (isInviteStep)   return true;
    if (isTemplateStep) return true;
    return false;
  })();

  const btnLabel = (() => {
    if (pending)       return "Setting up…";
    if (isInviteStep)  return "Send invites & open workspace";
    if (isLast)        return `Start using ${PRODUCT_NAME}`;
    return "Continue";
  })();

  /* ─── Avatar preview ──────────────────────────────────────────── */

  const avatarLetter = displayName.trim()[0]?.toUpperCase() ?? "?";
  const color        = displayName.trim() ? avatarColor(displayName.trim()) : "#94a3b8";

  /* ─── Render ──────────────────────────────────────────────────── */

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

        {/* Step label */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">
          {isInviteStep ? "Invite your team" : `Step ${step + 1} of ${progressTotal}`}
        </p>

        {/* ── Profile step ──────────────────────────────────── */}
        {isProfileStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              First, what's your name?
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              This is how you'll appear to teammates.
            </p>

            {/* Avatar preview */}
            <div
              className="mb-6 flex size-[72px] items-center justify-center rounded-full text-2xl font-black text-white shadow-md select-none transition-colors duration-200"
              style={{ background: color }}
            >
              {avatarLetter}
            </div>

            <div className="mb-6 w-full space-y-3">
              <input
                ref={profileNameRef}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
                placeholder="Your full name"
                maxLength={80}
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
                placeholder="Job title (optional)"
                maxLength={80}
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </>
        )}

        {/* ── Question steps ────────────────────────────────── */}
        {isQuestionStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              {QUESTION_STEPS[step - 1].question}
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              {QUESTION_STEPS[step - 1].subtitle}
            </p>

            <div className="mb-6 grid w-full grid-cols-2 gap-3">
              {QUESTION_STEPS[step - 1].options.map((opt) => {
                const isSelected = selections[step - 1] === opt.value;
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

        {/* ── Workspace name step ───────────────────────────── */}
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

        {/* ── Invite step (team only) ───────────────────────── */}
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

        {/* ── Template step ─────────────────────────────────── */}
        {isTemplateStep && (
          <>
            <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
              Choose a starting point
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Pick a template or start with a blank workspace. You can always add more later.
            </p>

            <div className="mb-6 grid w-full grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => {
                const isSelected = templateKey === tpl.key;
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setTemplateKey(tpl.key)}
                    className={`relative flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-secondary shadow-sm ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex size-[18px] items-center justify-center rounded-full bg-primary">
                        <svg viewBox="0 0 12 12" fill="white" className="size-[10px]">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </span>
                    )}
                    <span className="text-2xl leading-none">{tpl.emoji}</span>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {tpl.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Actions ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || pending}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {btnLabel}
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
          {isInviteStep ? "Skip for now" : isLast ? "Start blank instead" : "Skip this step"}
        </button>
      </div>
    </div>
  );
}
