"use client"

import * as React from "react"
import { CheckIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type CheckedState = boolean | "indeterminate"

/**
 * Native `<input type="checkbox">` in place of Radix's button+hidden-input
 * pair. Visual state is driven from React (checked/disabled props), not CSS
 * pseudo-classes — the same pattern already used for the bulk-select
 * checkboxes in table-view.tsx, kept deliberately boring so it doesn't depend
 * on which Tailwind v4 boolean-attribute variants happen to be enabled.
 *
 * `indeterminate` has no HTML attribute — it can only be set as a DOM
 * property, hence the ref effect.
 */
function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "checked" | "defaultChecked" | "onChange"> & {
  checked?: CheckedState
  defaultChecked?: CheckedState
  onCheckedChange?: (checked: boolean) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  // Uncontrolled usage (defaultChecked only, like Checked/case above) still
  // needs to drive the visual classes — they can't read the checked prop,
  // since there isn't one, and reading the native input's own DOM property
  // wouldn't re-render on change. Mirrors switch.tsx's uncontrolledChecked.
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<CheckedState>(
    defaultChecked ?? false
  )
  const current = checked ?? uncontrolledChecked
  const isIndeterminate = current === "indeterminate"
  const isChecked = current === true

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = isIndeterminate
  }, [isIndeterminate])

  return (
    <span
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        checked={isChecked || isIndeterminate}
        onChange={(event) => {
          setUncontrolledChecked(event.target.checked)
          onCheckedChange?.(event.target.checked)
        }}
        className={cn(
          "absolute inset-0 size-full cursor-[inherit] appearance-none rounded-none border bg-transparent outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/30",
          isChecked || isIndeterminate
            ? "border-primary bg-primary"
            : "border-input",
          props["aria-invalid"] &&
            (isChecked || isIndeterminate
              ? "border-primary"
              : "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"),
          "focus-visible:border-ring",
          className
        )}
        {...props}
      />
      <CheckIcon
        aria-hidden="true"
        className={cn(
          "pointer-events-none relative size-3.5 text-primary-foreground transition-none",
          isChecked || isIndeterminate ? "opacity-100" : "opacity-0"
        )}
      />
    </span>
  )
}

export { Checkbox }
