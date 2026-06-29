"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeOnboardingAction, type InviteEntry } from "@/app/actions/onboarding";
import { PRODUCT_NAME } from "@/config/platform";

/* ─── Data ──────────────────────────────────────────────────────── */

const QUESTION_STEPS = [
 {
  question: "What best describes you?",
  subtitle: "We'll tailor your experience based on your role.",
  options: [
   { value: "student",      label: "Student",       description: "Learning and personal projects" },
   { value: "professional", label: "Professional",   description: "Individual work and productivity" },
   { value: "team_lead",    label: "Team Lead",      description: "Managing a team or department" },
   { value: "founder",      label: "Founder / Owner", description: "Running a startup or business" },
  ],
 },
 {
  question: "What will you use it for?",
  subtitle: "Pick the option that fits best — you can do more later.",
  options: [
   { value: "notes",         label: "Personal notes",    description: "Capture ideas and tasks" },
   { value: "projects",      label: "Project management", description: "Plan and track work" },
   { value: "knowledge",     label: "Knowledge base",     description: "Team docs and wikis" },
   { value: "collaboration", label: "Team collaboration", description: "Work together in real time" },
  ],
 },
 {
  question: "Who's joining you?",
  subtitle: "This helps us set up the right defaults for your workspace.",
  options: [
   { value: "solo",   label: "Just me",     description: "Personal workspace" },
   { value: "small",  label: "Small team",  description: "2–10 people" },
   { value: "medium", label: "Growing team", description: "11–50 people" },
   { value: "large",  label: "Large organization", description: "50+ people" },
  ],
 },
];

const TEMPLATES = [
 { key: "blank",           label: "Start blank",       desc: "A clean slate, just for you" },
 { key: "getting-started", label: "Getting Started",   desc: "Intro guide for your workspace" },
 { key: "project-tracker", label: "Project Tracker",   desc: "Tasks, milestones, and progress" },
 { key: "meeting-notes",   label: "Meeting Notes",     desc: "Capture agendas and action items" },
 { key: "personal-journal",label: "Personal Journal",  desc: "Daily reflections and ideas" },
];

/* ─── Step indices ──────────────────────────────────────────────── */

const PROFILE_STEP  = 0;
const Q_FIRST_STEP  = 1;
const Q_LAST_STEP   = 3;
const WORKSPACE_STEP = 4;
const INVITE_STEP   = 5;
const TEMPLATE_TEAM  = 6;
const TEMPLATE_SOLO  = 5;

const EMPTY_INVITE: InviteEntry = { email: "", role: "editor" };

/* ─── Component ─────────────────────────────────────────────────── */

interface Props { initialName: string }

export function OnboardingUI({ initialName }: Props) {
 const [step,          setStep]         = useState(PROFILE_STEP);
 const [displayName,   setDisplayName]  = useState(initialName);
 const [jobTitle,      setJobTitle]     = useState("");
 const [selections,    setSelections]   = useState(["", "", ""]);
 const [workspaceName, setWorkspaceName]= useState("");
 const [invites,       setInvites]      = useState<InviteEntry[]>([
  { ...EMPTY_INVITE }, { ...EMPTY_INVITE }, { ...EMPTY_INVITE },
 ]);
 const [templateKey,   setTemplateKey]  = useState("blank");
 const [pending, startTransition]       = useTransition();

 const nameInputRef   = useRef<HTMLInputElement>(null);
 const profileNameRef = useRef<HTMLInputElement>(null);

 useEffect(() => { profileNameRef.current?.focus(); }, []);

 const isTeam = selections[2] !== "solo" && selections[2] !== "";

 const totalSteps    = isTeam ? 7 : 6;
 const progressTotal = selections[2] ? totalSteps : 6;

 const isProfileStep  = step === PROFILE_STEP;
 const isQuestionStep = step >= Q_FIRST_STEP && step <= Q_LAST_STEP;
 const isNameStep     = step === WORKSPACE_STEP;
 const isInviteStep   = isTeam && step === INVITE_STEP;
 const isTemplateStep = isTeam ? step === TEMPLATE_TEAM : step === TEMPLATE_SOLO;
 const isLast         = isTemplateStep;

 function selectOption(value: string) {
  setSelections((prev) => {
   const next = [...prev];
   next[step - 1] = value;
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

 function handleContinue() {
  if (isProfileStep) { setStep(Q_FIRST_STEP); return; }
  if (isQuestionStep) {
   const next = step + 1;
   setStep(next);
   if (next === WORKSPACE_STEP) setTimeout(() => nameInputRef.current?.focus(), 50);
   return;
  }
  if (isNameStep) { setStep(isTeam ? INVITE_STEP : TEMPLATE_SOLO); return; }
  if (isInviteStep) { setStep(TEMPLATE_TEAM); return; }
  if (isTemplateStep) { finish(); }
 }

 function handleSkip() {
  if (isProfileStep) { setStep(Q_FIRST_STEP); return; }
  if (isQuestionStep) {
   const next = step + 1;
   setStep(next);
   if (next === WORKSPACE_STEP) setTimeout(() => nameInputRef.current?.focus(), 50);
   return;
  }
  if (isNameStep) { setStep(isTeam ? INVITE_STEP : TEMPLATE_SOLO); return; }
  if (isInviteStep) { setStep(TEMPLATE_TEAM); return; }
  if (isTemplateStep) { finish("blank"); }
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
    displayName: displayName.trim(),
    jobTitle:    jobTitle.trim(),
    timezone,
    templateKey: overrideTemplate ?? templateKey,
   })
  );
 }

 const canContinue = (() => {
  if (isProfileStep)  return displayName.trim().length > 0;
  if (isQuestionStep) return !!selections[step - 1];
  if (isNameStep)     return workspaceName.trim().length > 0;
  return true;
 })();

 const btnLabel = pending
  ? "Setting up…"
  : isInviteStep
  ? "Send invites & open workspace"
  : isLast
  ? `Start using ${PRODUCT_NAME}`
  : "Continue";

 /* ─── Render ──────────────────────────────────────────────────── */

 return (
  <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-16">
   <div className="flex w-full max-w-md flex-col items-center">

    {/* Logo */}
    <div className="mb-8">
     <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={180} height={45} className="h-10 w-auto" />
    </div>

    {/* Progress bar */}
    <div className="mb-8 flex w-full items-center gap-1">
     {Array.from({ length: progressTotal }).map((_, i) => (
      <div
       key={i}
       className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
        i <= step ? "bg-primary" : "bg-border"
       }`}
      />
     ))}
    </div>

    {/* Step label */}
    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground/60">
     {isInviteStep ? "Invite your team" : `Step ${step + 1} of ${progressTotal}`}
    </p>

    {/* ── Profile step ──────────────────────────────────── */}
    {isProfileStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       First, what&rsquo;s your name?
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
       This is how you&rsquo;ll appear to teammates.
      </p>

      <div className="mb-6 w-full space-y-3">
       <input
        ref={profileNameRef}
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
        placeholder="Your full name"
        maxLength={80}
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
       <input
        type="text"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
        placeholder="Job title (optional)"
        maxLength={80}
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
      </div>
     </>
    )}

    {/* ── Question steps ────────────────────────────────── */}
    {isQuestionStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       {QUESTION_STEPS[step - 1].question}
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
       {QUESTION_STEPS[step - 1].subtitle}
      </p>

      <div className="mb-6 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {QUESTION_STEPS[step - 1].options.map((opt, idx) => {
        const isSelected = selections[step - 1] === opt.value;
        return (
         <button
          key={opt.value}
          type="button"
          onClick={() => selectOption(opt.value)}
          className={`relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 ${
           idx > 0 ? "border-t border-border" : ""
          } ${isSelected ? "bg-primary/5" : "hover:bg-accent"}`}
         >
          {isSelected && (
           <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-primary" />
          )}
          <div className="flex-1 min-w-0 pl-1">
           <p className={`text-[14.5px] font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
            {opt.label}
           </p>
           <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
          </div>
          <div className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
           isSelected ? "border-primary bg-primary" : "border-border"
          }`}>
           {isSelected && <span className="size-[6px] rounded-full bg-white" />}
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
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       {isTeam ? "Name your team workspace" : "Name your workspace"}
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
       {isTeam
        ? "This is your shared space — you can rename it any time."
        : "A place just for you. Keep it simple and memorable."}
      </p>

      <div className="mb-6 w-full">
       <input
        ref={nameInputRef}
        type="text"
        value={workspaceName}
        onChange={(e) => setWorkspaceName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
        placeholder={isTeam ? "e.g. Acme Corp" : "e.g. My Projects"}
        maxLength={100}
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
       <p className="mt-2 text-xs text-muted-foreground/50">
        You can rename or create more workspaces later in settings.
       </p>
      </div>
     </>
    )}

    {/* ── Invite step ───────────────────────────────────── */}
    {isInviteStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       Invite your team to{" "}
       <span className="text-primary">{workspaceName || "your workspace"}</span>
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
       They&rsquo;ll get an email invite and can join straight away.
      </p>

      <div className="mb-3 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {invites.map((inv, i) => (
        <div key={i} className={`flex items-center gap-0 ${i > 0 ? "border-t border-border" : ""}`}>
         <input
          type="text"
          inputMode="email"
          autoComplete="new-password"
          name={`invite_member_${i}`}
          placeholder={`teammate${i + 1}@company.com`}
          value={inv.email}
          onChange={(e) => updateInviteEmail(i, e.target.value)}
          className="h-11 flex-1 bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
         />
         <div className="h-6 w-px bg-border" />
         <button
          type="button"
          onClick={() => updateInviteRole(i, inv.role === "editor" ? "viewer" : "editor")}
          className="flex h-11 items-center gap-1 px-3.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
         >
          {inv.role === "editor" ? "Editor" : "Viewer"}
          <svg className="size-3 opacity-50" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
           <path d="M6 9l6 6 6-6" />
          </svg>
         </button>
        </div>
       ))}
      </div>

      {invites.length < 8 && (
       <button
        type="button"
        onClick={addInviteRow}
        className="mb-5 flex items-center gap-1.5 text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
       >
        <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
         <path d="M12 5v14M5 12h14" />
        </svg>
        Add another
       </button>
      )}

      <p className="mb-5 text-xs text-muted-foreground/50">
       Invites are valid for 7 days. You can invite more teammates from workspace settings at any time.
      </p>
     </>
    )}

    {/* ── Template step ─────────────────────────────────── */}
    {isTemplateStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       Choose a starting point
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
       Pick a template or start blank — you can always add more later.
      </p>

      <div className="mb-6 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {TEMPLATES.map((tpl, idx) => {
        const isSelected = templateKey === tpl.key;
        return (
         <button
          key={tpl.key}
          type="button"
          onClick={() => setTemplateKey(tpl.key)}
          className={`relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 ${
           idx > 0 ? "border-t border-border" : ""
          } ${isSelected ? "bg-primary/5" : "hover:bg-accent"}`}
         >
          {isSelected && (
           <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-primary" />
          )}
          <div className="flex-1 min-w-0 pl-1">
           <p className={`text-[14.5px] font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
            {tpl.label}
           </p>
           <p className="mt-0.5 text-xs text-muted-foreground">{tpl.desc}</p>
          </div>
          <div className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
           isSelected ? "border-primary bg-primary" : "border-border"
          }`}>
           {isSelected && <span className="size-[6px] rounded-full bg-white" />}
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
     className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
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
     className="mt-3 text-xs text-muted-foreground/50 transition-colors duration-150 hover:text-muted-foreground"
    >
     {isInviteStep ? "Skip for now" : isLast ? "Start blank instead" : "Skip this step"}
    </button>

   </div>
  </div>
 );
}
