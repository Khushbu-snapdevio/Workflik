"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native `<input type="radio">` group: sharing one `name` gives arrow-key nav for free, no roving-tabindex JS needed.
 * `name` auto-generated via `useId` when omitted, since native grouping requires a shared `name`.
 */
type RadioGroupContextValue = {
  name: string
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null)

function RadioGroup({
  className,
  name,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  name?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const generatedName = React.useId()
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = value ?? uncontrolledValue

  return (
    <RadioGroupContext.Provider
      value={{
        name: name ?? generatedName,
        value: currentValue,
        onValueChange: (v) => {
          setUncontrolledValue(v)
          onValueChange?.(v)
        },
      }}
    >
      <div
        data-slot="radio-group"
        role="radiogroup"
        className={cn("grid w-full gap-3", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string
}) {
  const context = React.useContext(RadioGroupContext)
  if (!context) {
    throw new Error("RadioGroupItem must be rendered inside a RadioGroup")
  }
  const isChecked = context.value === value

  return (
    <span
      data-slot="radio-group-item"
      className={cn(
        "peer relative inline-flex aspect-square size-4.5 shrink-0 items-center justify-center rounded-full border bg-transparent",
        isChecked ? "border-foreground" : "border-input",
        disabled && "cursor-not-allowed opacity-50",
        props["aria-invalid"] &&
          (isChecked
            ? "border-foreground"
            : "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"),
        className
      )}
    >
      <input
        type="radio"
        name={context.name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={() => context.onValueChange?.(value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
        {...props}
      />
      {isChecked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
        />
      )}
    </span>
  )
}

export { RadioGroup, RadioGroupItem }
