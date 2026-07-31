"use client";

import { Logo } from "@/components/ui/logo";
import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeOnboardingAction, type InviteEntry } from "@/app/actions/onboarding";
import { PRODUCT_NAME } from "@/config/platform";
import { RoleSelect } from "@/components/ui/role-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const INVITE_ROLE_OPTIONS = [
 { value: "admin",  label: "Admin" },
 { value: "editor", label: "Member" },
 { value: "viewer", label: "Viewer" },
] as const;

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isInviteEmailInvalid(email: string) {
 const trimmed = email.trim();
 return trimmed.length > 0 && !EMAIL_REGEX.test(trimmed);
}

/* ─── Component ─────────────────────────────────────────────────── */

interface Props { initialName: string; smtpConfigured: boolean }

export function OnboardingUI({ initialName, smtpConfigured }: Props) {
 const [step,          setStep]         = useState(PROFILE_STEP);
 const [displayName,   setDisplayName]  = useState(initialName);
 const [jobTitle,      setJobTitle]     = useState("");
 const [selections,    setSelections]   = useState(["", "", ""]);
 const [workspaceName, setWorkspaceName]= useState("");
 const [invites,       setInvites]      = useState<InviteEntry[]>([
  { ...EMPTY_INVITE }, { ...EMPTY_INVITE }, { ...EMPTY_INVITE },
 ]);
 const [templateKey,   setTemplateKey]  = useState("blank");
 const [invitesTouched, setInvitesTouched] = useState([false, false, false]);
 const [pending, startTransition]       = useTransition();
 const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);

 const nameInputRef   = useRef<HTMLInputElement>(null);
 const profileNameRef = useRef<HTMLInputElement>(null);

 useEffect(() => { profileNameRef.current?.focus(); }, []);

 const isTeam = selections[2] !== "solo" && selections[2] !== "";

 const totalSteps    = isTeam ? 7 : 6;
 // Only reflects the team/solo choice once the user has actually moved past
 // that question (clicked Continue) — using the live selection instead would
 // make the progress bar/dot count change the instant an option is clicked,
 // before the choice is confirmed.
 const progressTotal = step > Q_LAST_STEP ? totalSteps : 6;

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

 function updateInviteRole(i: number, role: "admin" | "editor" | "viewer") {
  setInvites((prev) => prev.map((inv, idx) => idx === i ? { ...inv, role } : inv));
 }

 function touchInviteEmail(i: number) {
  setInvitesTouched((prev) => prev.map((t, idx) => idx === i ? true : t));
 }

 function addInviteRow() {
  if (invites.length < 8) {
   setInvites((prev) => [...prev, { ...EMPTY_INVITE }]);
   setInvitesTouched((prev) => [...prev, false]);
  }
 }

 function removeInviteRow(i: number) {
  if (invites.length <= 1) return;
  setInvites((prev) => prev.filter((_, idx) => idx !== i));
  setInvitesTouched((prev) => prev.filter((_, idx) => idx !== i));
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
  if (isInviteStep) {
   if (invites.some((inv) => isInviteEmailInvalid(inv.email))) {
    setInvitesTouched((prev) => prev.map(() => true));
    return;
   }
   setStep(TEMPLATE_TEAM);
   return;
  }
  if (isTemplateStep) { finish(); }
 }

 function handleBack() {
  if (step === PROFILE_STEP) return;
  // Every step's predecessor is simply step - 1 — the team/solo branch
  // reuses index 5 for either INVITE_STEP or TEMPLATE_SOLO, but only one of
  // those is ever reachable for a given isTeam value, so there's no clash.
  setStep(step - 1);
 }

 function handleSkip() {
  if (isProfileStep) {
   setDisplayName("");
   setJobTitle("");
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
   setWorkspaceName("");
   setStep(isTeam ? INVITE_STEP : TEMPLATE_SOLO);
   return;
  }
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
  if (isInviteStep)   return !invites.some((inv) => isInviteEmailInvalid(inv.email));
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
     <Logo width={180} height={45} className="h-10 w-auto" />
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
    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
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
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
       <input
        type="text"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canContinue) handleContinue(); }}
        placeholder="Job title (optional)"
        maxLength={80}
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
           {isSelected && <span className="size-[6px] rounded-full bg-primary-foreground" />}
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
        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
       <p className="mt-2 text-xs text-muted-foreground-subtle">
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
       {smtpConfigured
        ? "They’ll get an email invite and can join straight away."
        : "Email isn’t configured on this instance yet, so invite links won’t be emailed — you’ll need to share them manually from workspace settings."}
      </p>

      <div className="mb-3 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {invites.map((inv, i) => {
        const showInviteError = invitesTouched[i] && isInviteEmailInvalid(inv.email);
        return (
        <div key={i} className={i > 0 ? "border-t border-border" : ""}>
         <div className="flex items-center gap-0">
          <input
           type="text"
           inputMode="email"
           autoComplete="new-password"
           name={`invite_member_${i}`}
           placeholder={`teammate${i + 1}@company.com`}
           value={inv.email}
           onChange={(e) => updateInviteEmail(i, e.target.value)}
           onBlur={() => touchInviteEmail(i)}
           aria-invalid={showInviteError}
           className={`h-11 flex-1 bg-transparent px-4 text-sm placeholder:text-muted-foreground-subtle focus:outline-none ${
            showInviteError ? "text-destructive" : "text-foreground"
           }`}
          />
          <div className="h-6 w-px bg-border" />
          <div className="px-2">
           <RoleSelect
            value={inv.role}
            options={INVITE_ROLE_OPTIONS}
            onChange={(v) => updateInviteRole(i, v as "admin" | "editor" | "viewer")}
           />
          </div>
          {invites.length > 1 && (
           <button
            type="button"
            onClick={() => setPendingRemoveIndex(i)}
            aria-label="Remove this invite"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
           >
            <X size={14} />
           </button>
          )}
         </div>
         {showInviteError && (
          <p className="px-4 pb-2 text-xs text-destructive">Please enter a valid email address.</p>
         )}
        </div>
        );
       })}
      </div>

      <ConfirmDialog
       open={pendingRemoveIndex !== null}
       onOpenChange={(o) => !o && setPendingRemoveIndex(null)}
       title="Remove this invite?"
       description={
        pendingRemoveIndex !== null && invites[pendingRemoveIndex]?.email.trim()
         ? `"${invites[pendingRemoveIndex]!.email.trim()}" won't be invited.`
         : "This empty row will be removed."
       }
       confirmLabel="Remove"
       onConfirm={() => {
        if (pendingRemoveIndex !== null) removeInviteRow(pendingRemoveIndex);
        setPendingRemoveIndex(null);
       }}
      />

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

      <p className="mb-5 text-xs text-muted-foreground-subtle">
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
           {isSelected && <span className="size-[6px] rounded-full bg-primary-foreground" />}
          </div>
         </button>
        );
       })}
      </div>
     </>
    )}

    {/* ── Actions ───────────────────────────────────────── */}
    <div className="flex w-full items-center gap-2.5">
     {step > PROFILE_STEP && (
      <button
       type="button"
       onClick={handleBack}
       disabled={pending}
       className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
       <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M19 12H5M12 19l-7-7 7-7" />
       </svg>
       Back
      </button>
     )}
     <button
      type="button"
      onClick={handleContinue}
      disabled={!canContinue || pending}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
     >
      {btnLabel}
      {!pending && !isLast && !isInviteStep && (
       <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7" />
       </svg>
      )}
     </button>
    </div>

    <button
     type="button"
     onClick={handleSkip}
     disabled={pending}
     className="mt-5 text-sm font-medium text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
     {isInviteStep ? "Skip for now" : isLast ? "Start blank instead" : "Skip this step"}
    </button>

   </div>
  </div>
 );
}
