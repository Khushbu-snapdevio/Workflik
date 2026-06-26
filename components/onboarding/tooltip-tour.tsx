"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── SVG icons (no emojis) ─────────────────────────────────────── */

function IconPages() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <rect x="2" y="1" width="9" height="12" rx="1.5" />
      <path d="M5 14h7a1.5 1.5 0 001.5-1.5V4" />
      <path d="M5 4.5h5M5 7h5M5 9.5h3" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M13 13l-3.5-3.5" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M8 1.5A4 4 0 004 5.5v2L2.5 10h11L12 7.5v-2A4 4 0 008 1.5z" />
      <path d="M6.5 10.5a1.5 1.5 0 003 0" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M2.5 8.5l3.5 3.5 7.5-7.5" />
    </svg>
  );
}

/* ─── Tour steps ─────────────────────────────────────────────────── */

interface TourStep {
  target:    string;
  title:     string;
  body:      string;
  Icon:      () => React.ReactElement;
  placement: "right" | "bottom" | "left" | "top" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    target:    "[data-tour='sidebar']",
    placement: "right",
    Icon:      IconPages,
    title:     "Your pages live here",
    body:      "All your pages and notes live in the sidebar. Click any page to open it, or drag to reorder.",
  },
  {
    target:    "[data-tour='new-page']",
    placement: "bottom",
    Icon:      IconPlus,
    title:     "Create pages instantly",
    body:      "Click New to create a page, database, or note. Every page starts blank and grows with you.",
  },
  {
    target:    "[data-tour='search']",
    placement: "right",
    Icon:      IconSearch,
    title:     "Search in seconds",
    body:      "Press ⌘K (Ctrl+K on Windows) to instantly search across all your pages and jump anywhere.",
  },
  {
    target:    "[data-tour='notifications']",
    placement: "right",
    Icon:      IconBell,
    title:     "Stay in the loop",
    body:      "Get notified when someone mentions you, leaves a comment, or shares a page with you.",
  },
  {
    target:    "[data-tour='sidebar']",
    placement: "right",
    Icon:      IconCheck,
    title:     "You're all set",
    body:      "Start by creating your first page. Type / in the editor to insert headings, images, and more.",
  },
];

const TOOLTIP_W = 272;
const TOOLTIP_H = 190;
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

interface Props { tourCompleted: boolean }

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

  const current      = TOUR_STEPS[step];
  const tooltipStyle = computeStyle(targetRect, current.placement);
  const isLast       = step === TOUR_STEPS.length - 1;

  return createPortal(
    <>
      {/* Spotlight overlay */}
      {targetRect && (
        <div
          className="pointer-events-none"
          style={{
            position:  "fixed",
            top:       targetRect.top    - 4,
            left:      targetRect.left   - 4,
            width:     targetRect.width  + 8,
            height:    targetRect.height + 8,
            borderRadius: 6,
            border:    "1.5px solid var(--color-primary, #0284C7)",
            boxShadow: "0 0 0 3999px rgba(0,0,0,0.22)",
            zIndex:    9997,
            transition:"top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease",
          }}
        />
      )}
      {!targetRect && (
        <div
          className="pointer-events-none"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.22)", zIndex: 9997 }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          position:   "fixed",
          zIndex:     9999,
          width:      TOOLTIP_W,
          transition: "opacity 200ms ease",
          opacity:    animIn ? 1 : 0,
          ...tooltipStyle,
        }}
        className="rounded-[var(--radius-lg)] border border-border bg-card p-5"
      >
        {/* Close */}
        <button
          type="button"
          onClick={completeTour}
          className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-4 flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
          <current.Icon />
        </div>

        {/* Text */}
        <h3 className="mb-1.5 text-sm font-semibold leading-snug text-foreground">
          {current.title}
        </h3>
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          {current.body}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={completeTour}
              className="text-xs text-muted-foreground transition-colors duration-150 hover:text-muted-foreground"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && (
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                  <path d="M2 7h10M8 3l4 4-4 4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
