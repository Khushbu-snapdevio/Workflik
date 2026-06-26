"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/* ─── Step definitions ──────────────────────────────────────────── */

const PERSONAL_STEPS = [
 {
  key: "use_case",
  question: "What will you use this space for?",
  subtitle: "Pick the one that fits best — you can always change later.",
  options: [
   { value: "notes",    label: "Personal notes",  description: "Ideas, journaling, quick captures" },
   { value: "tasks",    label: "Task management",  description: "To-dos, goals, habits" },
   { value: "knowledge",  label: "Knowledge base",  description: "Reference docs and research" },
   { value: "planning",  label: "Planning",      description: "Roadmaps, schedules, projects" },
  ],
 },
];

const TEAM_STEPS = [
 {
  key: "focus",
  question: "What does your team work on?",
  subtitle: "We'll suggest the best defaults for your teamspace.",
  options: [
   { value: "product",   label: "Product & Engineering", description: "Sprints, roadmaps, tech docs" },
   { value: "design",    label: "Design & Creative",    description: "Briefs, assets, feedback" },
   { value: "marketing",  label: "Marketing & Growth",   description: "Campaigns, content, analytics" },
   { value: "operations", label: "Operations & HR",     description: "Processes, policies, SOPs" },
  ],
 },
];

/* ─── Invite row ─────────────────────────────────────────────────── */

function InviteRow({
 index, value, role, onChange, onRoleChange, isFirst,
}: {
 index: number; value: string; role: string; isFirst: boolean;
 onChange: (v: string) => void; onRoleChange: (v: string) => void;
}) {
 return (
  <div className={`flex items-center gap-0 ${!isFirst ? "border-t border-border" : ""}`}>
   <input
    type="email"
    placeholder={`teammate${index + 1}@company.com`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-11 flex-1 bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
   />
   <div className="h-6 w-px bg-border" />
   <button
    type="button"
    onClick={() => onRoleChange(role === "editor" ? "viewer" : "editor")}
    className="flex h-11 items-center gap-1 px-3.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
   >
    {role === "editor" ? "Editor" : "Viewer"}
    <svg className="size-3 opacity-50" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
     <path d="M6 9l6 6 6-6" />
    </svg>
   </button>
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
 const totalSteps = isTeam ? steps.length + 1 : steps.length;

 const [step, setStep] = useState(0);
 const [selections, setSelections] = useState<string[]>(steps.map(() => ""));
 const [invites, setInvites] = useState([
  { ...EMPTY_INVITE }, { ...EMPTY_INVITE }, { ...EMPTY_INVITE },
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
  <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-16">
   <div className="flex w-full max-w-md flex-col items-center">

    {/* Logo */}
    <div className="mb-8">
     <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={180} height={45} className="h-10 w-auto" />
    </div>

    {/* Progress dots */}
    <div className="mb-8 flex items-center gap-1.5">
     {Array.from({ length: totalSteps }).map((_, i) => (
      <div
       key={i}
       className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
        i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/30" : "w-3 bg-border"
       }`}
      />
     ))}
    </div>

    {/* Step label */}
    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground/60">
     {isInviteStep ? "Invite your team" : `Step ${step + 1} of ${totalSteps}`}
    </p>

    {/* ── Question step ── */}
    {!isInviteStep && currentStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       {currentStep.question}
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
       {currentStep.subtitle}
      </p>

      {/* Vertical radio list */}
      <div className="mb-6 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {currentStep.options.map((opt, idx) => {
        const isSelected = selections[step] === opt.value;
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

    {/* ── Invite step ── */}
    {isInviteStep && (
     <>
      <h1 className="mb-1.5 text-center text-[1.6rem] font-black tracking-tight text-foreground">
       Invite your team to{" "}
       <span className="text-primary">{workspaceName}</span>
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
       They'll get an email invite and can join right away.
      </p>

      <div className="mb-3 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {invites.map((inv, i) => (
        <InviteRow
         key={i}
         index={i}
         isFirst={i === 0}
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
        className="mb-6 flex items-center gap-1.5 text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
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

      <p className="mb-6 text-xs text-muted-foreground">
       Invites are valid for 7 days. You can invite more teammates from workspace settings at any time.
      </p>
     </>
    )}

    {/* Actions */}
    <button
     type="button"
     onClick={handleContinue}
     disabled={(!isInviteStep && !selected) || pending}
     className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
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
     className="mt-3 text-xs text-muted-foreground transition-colors duration-150 hover:text-muted-foreground"
    >
     {isInviteStep ? "Skip for now" : "Skip this step"}
    </button>

   </div>
  </div>
 );
}
