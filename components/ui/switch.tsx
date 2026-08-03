"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native `<input type="checkbox" role="switch">` in place of Radix's
 * button+thumb pair. Track and thumb classes are computed from React state
 * (checked/size/disabled), not CSS pseudo-classes — see checkbox.tsx for why.
 *
 * The input is invisible but covers the full track (absolute inset-0) so
 * click, keyboard (Space) and focus all land on it exactly as they did on
 * Radix's Root button; the visible track is drawn on the wrapper span.
 */
function Switch({
  className,
  size = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "checked" | "defaultChecked" | "onChange" | "size"> & {
  size?: "sm" | "default"
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked ?? false)
  const isChecked = checked ?? uncontrolledChecked

  return (
    <span
      data-slot="switch"
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border transition-all",
        size === "default" ? "h-4.5 w-8.25" : "h-3.5 w-6.25",
        isChecked ? "border-primary bg-primary" : "border-input bg-input",
        disabled && "cursor-not-allowed opacity-50",
        props["aria-invalid"] &&
          "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
        className
      )}
    >
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        checked={checked === undefined ? undefined : isChecked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        onChange={(event) => {
          setUncontrolledChecked(event.target.checked)
          onCheckedChange?.(event.target.checked)
        }}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform",
          size === "default" ? "size-3.5" : "size-2.5",
          isChecked
            ? "translate-x-[calc(100%+2px)] dark:bg-primary-foreground"
            : "translate-x-0.25 dark:bg-foreground"
        )}
      />
    </span>
  )
}

export { Switch }
