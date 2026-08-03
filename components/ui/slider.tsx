"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native `<input type="range">` in place of Radix's Slider. Radix supported
 * multiple thumbs via an array value; a native range input only has one.
 * Zero consumers in the app today, so the multi-thumb case is dropped rather
 * than emulated — revisit if a future consumer needs it.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  disabled,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "min" | "max"> & {
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  onValueChange?: (value: number[]) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue?.[0] ?? min)
  const current = value?.[0] ?? uncontrolled
  const percent = ((current - min) / (max - min)) * 100

  return (
    <div
      data-slot="slider"
      className={cn(
        "relative flex h-3 w-full touch-none items-center select-none",
        disabled && "opacity-50"
      )}
    >
      <div className="pointer-events-none absolute top-1/2 h-0.5 w-full -translate-y-1/2 overflow-hidden bg-input/50">
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        disabled={disabled}
        value={current}
        onChange={(event) => {
          const next = Number(event.target.value)
          setUncontrolled(next)
          onValueChange?.([next])
        }}
        className={cn(
          "relative w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed",
          "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-colors",
          "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:transition-colors",
          "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring/30",
          "focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-ring/30",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Slider }
