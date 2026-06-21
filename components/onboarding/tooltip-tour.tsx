"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

interface TourStep {
  target:    string;
  title:     string;
  body:      string;
  icon:      string;
  placement: "right" | "bottom" | "left" | "top" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    target:    "[data-tour='sidebar']",
    placement: "right",
    icon:      "📄",
    title:     "Your pages live here",
    body:      "All your pages and notes live in the sidebar. Click any page to open it, or drag to reorder.",
  },
  {
    target:    "[data-tour='new-page']",
    placement: "bottom",
    icon:      "✨",
    title:     "Create pages instantly",
    body:      "Click New to create a page, database, or note. Every page starts blank and grows with you.",
  },
  {
    target:    "[data-tour='search']",
    placement: "right",
    icon:      "🔍",
    title:     "Search in seconds",
    body:      "Press ⌘K (Ctrl+K on Windows) to instantly search across all your pages and jump anywhere.",
  },
  {
    target:    "[data-tour='notifications']",
    placement: "right",
    icon:      "🔔",
    title:     "Stay in the loop",
    body:      "Get notified when someone mentions you, leaves a comment, or shares a page with you.",
  },
  {
    target:    "[data-tour='sidebar']",
    placement: "right",
    icon:      "🎉",
    title:     "You're all set!",
    body:      "Start by creating your first page. Type / in the editor to insert headings, images, and more.",
  },
];

const TOOLTIP_W = 280;
const TOOLTIP_H = 210; // approximate
const GAP       = 14;

function computeStyle(
  rect: DOMRect | null,
  placement: TourStep["placement"],
): React.CSSProperties {
  if (!rect || placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  switch (placement) {
    case "right":
      return {
        top:  clamp(rect.top + rect.height / 2 - TOOLTIP_H / 2, 16, vh - TOOLTIP_H - 16),
        left: Math.min(rect.right + GAP, vw - TOOLTIP_W - 16),
      };
    case "bottom":
      return {
        top:  Math.min(rect.bottom + GAP, vh - TOOLTIP_H - 16),
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_W / 2, 16, vw - TOOLTIP_W - 16),
      };
    case "top":
      return {
        top:  Math.max(16, rect.top - TOOLTIP_H - GAP),
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_W / 2, 16, vw - TOOLTIP_W - 16),
      };
    case "left":
      return {
        top:  clamp(rect.top + rect.height / 2 - TOOLTIP_H / 2, 16, vh - TOOLTIP_H - 16),
        left: Math.max(16, rect.left - TOOLTIP_W - GAP),
      };
  }
}

interface Props {
  tourCompleted: boolean;
}

export function TooltipTour({ tourCompleted }: Props) {
  const [step,       setStep]      = useState(0);
  const [active,     setActive]    = useState(false);
  const [mounted,    setMounted]   = useState(false);
  const [targetRect, setTargetRect]= useState<DOMRect | null>(null);
  const [animIn,     setAnimIn]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!tourCompleted) {
      // Small delay so the workspace finishes rendering before the tour starts
      timerRef.current = setTimeout(() => {
        setActive(true);
        setAnimIn(true);
      }, 900);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [tourCompleted]);

  const measureTarget = useCallback((stepIndex: number) => {
    const el = document.querySelector(TOUR_STEPS[stepIndex].target);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, []);

  useEffect(() => {
    if (!active || !mounted) return;
    measureTarget(step);

    function onResize() { measureTarget(step); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, mounted, step, measureTarget]);

  const completeTour = useCallback(() => {
    setAnimIn(false);
    setTimeout(() => setActive(false), 200);
    fetch("/api/onboarding/tour-complete", { method: "POST" }).catch(() => {});
  }, []);

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      completeTour();
    }
  }

  if (!mounted || !active) return null;

  const current     = TOUR_STEPS[step];
  const tooltipStyle = computeStyle(targetRect, current.placement);
  const isLast      = step === TOUR_STEPS.length - 1;

  return createPortal(
    <>
      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="pointer-events-none"
          style={{
            position:     "fixed",
            top:          targetRect.top    - 5,
            left:         targetRect.left   - 5,
            width:        targetRect.width  + 10,
            height:       targetRect.height + 10,
            borderRadius: 8,
            border:       "2px solid var(--color-primary, #0284C7)",
            boxShadow:    "0 0 0 3999px rgba(0,0,0,0.28), 0 0 0 5px rgba(2,132,199,0.15)",
            zIndex:       9997,
            transition:   "top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease",
          }}
        />
      )}

      {/* No-target overlay when element not found */}
      {!targetRect && (
        <div
          className="pointer-events-none"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 9997,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          position:   "fixed",
          zIndex:     9999,
          width:      TOOLTIP_W,
          transition: "opacity 200ms ease, transform 200ms ease",
          opacity:    animIn ? 1 : 0,
          transform:  animIn ? "scale(1)" : "scale(0.97)",
          ...tooltipStyle,
        }}
        className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
      >
        {/* Close */}
        <button
          type="button"
          onClick={completeTour}
          className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>

        <div className="mb-3 text-2xl">{current.icon}</div>
        <h3 className="mb-1.5 text-[14.5px] font-bold text-foreground leading-snug">
          {current.title}
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          {current.body}
        </p>

        {/* Step dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`size-[6px] rounded-full transition-colors duration-200 ${
                i === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={completeTour}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97]"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                <path d="M2 7h10M8 3l4 4-4 4" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
