"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STEPS = [
 {
  key: "role",
  question: "What's your role in the team?",
  subtitle: "Helps us tailor your experience.",
  options: [
   { value: "developer", emoji: "💻", label: "Developer",   description: "Engineering, code, architecture" },
   { value: "designer",  emoji: "🎨", label: "Designer",    description: "UI/UX, brand, creative" },
   { value: "manager",  emoji: "📋", label: "Manager",    description: "Planning, coordination, ops" },
   { value: "marketer",  emoji: "📣", label: "Marketer",    description: "Growth, campaigns, content" },
  ],
 },
 {
  key: "focus",
  question: "What will you mainly use it for?",
  subtitle: "We'll suggest the right defaults for you.",
  options: [
   { value: "docs",    emoji: "📄", label: "Docs & Notes",  description: "Writing, knowledge base, wikis" },
   { value: "projects",  emoji: "🗂️", label: "Projects",    description: "Tasks, roadmaps, sprints" },
   { value: "data",    emoji: "📊", label: "Data & Tracking", description: "Databases, reports, logs" },
   { value: "everything", emoji: "⚡", label: "All of the above", description: "Everything this workspace has" },
  ],
 },
];

type Props = {
 workspaceName: string;
 workspaceSlug: string;
};

export function JoinSetup({ workspaceName, workspaceSlug }: Props) {
 const router = useRouter();
 const [step, setStep] = useState(0);
 const [selections, setSelections] = useState<string[]>(STEPS.map(() => ""));
 const [, startTransition] = useTransition();

 const totalSteps = STEPS.length;
 const currentStep = STEPS[step];
 const isLastStep = step === totalSteps - 1;

 function selectOption(value: string) {
  setSelections((prev) => {
   const next = [...prev];
   next[step] = value;
   return next;
  });
 }

 function handleContinue() {
  if (isLastStep) {
   startTransition(() => {
    router.push(`/app/${workspaceSlug}`);
   });
  } else {
   setStep((s) => s + 1);
  }
 }

 function handleSkip() {
  if (isLastStep) {
   router.push(`/app/${workspaceSlug}`);
  } else {
   setStep((s) => s + 1);
  }
 }

 function handleBack() {
  setStep((s) => Math.max(0, s - 1));
 }

 return (
  <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-4 py-16">
   {/* Ambient glow */}
   <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
   </div>

   <div className="relative z-10 flex w-full max-w-lg flex-col items-center">

    {/* Logo */}
    <div className="mb-8">
     <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={180} height={45} className="h-10 w-auto" />
    </div>

    {/* Welcome heading (only first step) */}
    {step === 0 && (
     <div className="mb-6 text-center">
      <p className="mb-1 text-xs font-semibold tracking-wide text-primary">
       You joined
      </p>
      <h2 className="text-2xl font-black tracking-tight text-foreground">
       {workspaceName}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
       Quick intro so the team knows who you are.
      </p>
     </div>
    )}

    {/* Progress dots */}
    <div className="mb-6 flex items-center gap-2">
     {STEPS.map((_, i) => (
      <div
       key={i}
       className={`h-1.5 rounded-full transition-all duration-300 ${
        i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-border"
       }`}
      />
     ))}
    </div>

    {/* Step label */}
    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
     Step {step + 1} of {totalSteps}
    </p>

    {/* Question */}
    <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
     {currentStep.question}
    </h1>
    <p className="mb-8 text-center text-sm text-muted-foreground">
     {currentStep.subtitle}
    </p>

    {/* Options */}
    <div className="mb-6 grid w-full grid-cols-2 gap-3">
     {currentStep.options.map((opt) => {
      const isSelected = selections[step] === opt.value;
      return (
       <button
        key={opt.value}
        type="button"
        onClick={() => selectOption(opt.value)}
        className={`flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-all ${
         isSelected
          ? "border-primary bg-secondary"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
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

    {/* Actions */}
    <div className="flex w-full items-center gap-2">
     {step > 0 && (
      <button
       type="button"
       onClick={handleBack}
       aria-label="Back"
       className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
       <ArrowLeft size={16} />
      </button>
     )}
     <button
      type="button"
      onClick={handleContinue}
      disabled={!selections[step]}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
     >
      {isLastStep ? `Open ${workspaceName}` : "Continue"}
      {!isLastStep && (
       <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7" />
       </svg>
      )}
     </button>
    </div>

    <button
     type="button"
     onClick={handleSkip}
     className="mt-3 text-xs text-muted-foreground/60 underline-offset-2 hover:text-muted-foreground hover:underline"
    >
     Skip this step
    </button>
   </div>
  </div>
 );
}
