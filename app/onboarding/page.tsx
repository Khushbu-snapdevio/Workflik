"use client";

import { useState, useTransition } from "react";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { PRODUCT_NAME } from "@/config/platform";

const STEPS = [
  {
    question: "What best describes you?",
    subtitle: "We'll personalise your experience based on your role.",
    options: [
      { value: "student", emoji: "🎓", label: "Student", description: "Learning and personal projects" },
      { value: "professional", emoji: "💼", label: "Professional", description: "Individual work and productivity" },
      { value: "team_lead", emoji: "👥", label: "Team Lead", description: "Managing a team or department" },
      { value: "founder", emoji: "🚀", label: "Founder / Owner", description: "Running a startup or business" },
    ],
  },
  {
    question: "What will you use it for?",
    subtitle: "Pick the option that fits best — you can do more later.",
    options: [
      { value: "notes", emoji: "📝", label: "Personal notes", description: "Capture ideas and tasks" },
      { value: "projects", emoji: "📋", label: "Project management", description: "Plan and track work" },
      { value: "knowledge", emoji: "📚", label: "Knowledge base", description: "Team docs and wikis" },
      { value: "collaboration", emoji: "🤝", label: "Team collaboration", description: "Work together in real time" },
    ],
  },
  {
    question: "Who's joining you?",
    subtitle: "This helps us set up the right defaults for your workspace.",
    options: [
      { value: "solo", emoji: "👤", label: "Just me", description: "Personal workspace" },
      { value: "small", emoji: "👥", label: "Small team", description: "2–10 people" },
      { value: "medium", emoji: "🏢", label: "Growing team", description: "11–50 people" },
      { value: "large", emoji: "🌐", label: "Large org", description: "50+ people" },
    ],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<string[]>(["", "", ""]);
  const [pending, startTransition] = useTransition();

  const current = STEPS[step];
  const selected = selections[step];
  const isLast = step === STEPS.length - 1;

  function select(value: string) {
    setSelections((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  function handleContinue() {
    if (isLast) {
      startTransition(() => completeOnboardingAction());
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    if (isLast) {
      startTransition(() => completeOnboardingAction());
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
          {STEPS.map((_, i) => (
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
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Question */}
        <h1 className="mb-1.5 text-center text-2xl font-black tracking-tight text-foreground">
          {current.question}
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {current.subtitle}
        </p>

        {/* Options grid */}
        <div className="mb-6 grid w-full grid-cols-2 gap-3">
          {current.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
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

        {/* Actions */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || pending}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Setting up…" : isLast ? `Get started with ${PRODUCT_NAME}` : "Continue"}
          {!pending && !isLast && (
            <svg className="ml-1.5 size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
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
          Skip for now
        </button>
      </div>
    </div>
  );
}
