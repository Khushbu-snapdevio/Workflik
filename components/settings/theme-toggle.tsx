"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * Segmented Light / Dark / System control.
 *
 * Reads `theme` rather than `resolvedTheme` so that "System" stays visibly
 * selected instead of snapping to whichever concrete theme the OS resolved to
 * — the user picked "follow my OS", and the control should keep saying so.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  /* next-themes cannot know the active theme until it has read localStorage on
    the client, so the first render would disagree with the server and React
    would swap the highlighted segment after hydration. Rendering the control
    disabled until mounted keeps the markup stable and avoids a visible flash
    of the wrong selection. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    /* fieldset + legend rather than role="group" + aria-label: it is the
       native grouping element, so the association survives even where ARIA
       is ignored. The legend is visually hidden because the adjacent settings
       row already labels this control on screen. */
    <fieldset className="m-0 inline-flex shrink-0 gap-0.5 rounded-md border border-border bg-muted p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = mounted && theme === value;
        return (
          /* A group of toggle buttons rather than a radiogroup: aria-pressed is
        carried natively by <button>, so screen readers announce the state
        without the roving-tabindex keyboard contract that role="radio"
        obliges us to implement by hand. */
          <button
            aria-label={label}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium",
              selected
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            )}
            disabled={!mounted}
            key={value}
            onClick={() => setTheme(value)}
            type="button"
          >
            <Icon aria-hidden size={14} />
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}
