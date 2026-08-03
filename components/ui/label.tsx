"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A native `<label>` already does the whole job of Radix's Label — the `for`
 * association, the click-to-focus forwarding — with one exception worth
 * keeping: double-clicking a label otherwise selects its text, which looks
 * broken next to a checkbox. Radix suppressed that, so we do too.
 *
 * Stays a client component only because of that handler.
 */
function Label({
  className,
  onMouseDown,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      onMouseDown={(event) => {
        // Let controls inside the label handle their own selection behaviour.
        if ((event.target as HTMLElement).closest("button, input, select, textarea")) {
          return
        }
        onMouseDown?.(event)
        // Only the second and later clicks of a multi-click select text.
        if (!event.defaultPrevented && event.detail > 1) {
          event.preventDefault()
        }
      }}
      className={cn(
        "flex items-center gap-2 text-sm font-medium tracking-normal text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-[slot=checkbox]:text-sm peer-data-[slot=checkbox]:font-normal peer-data-[slot=checkbox]:text-foreground peer-data-[slot=radio-group-item]:text-sm peer-data-[slot=radio-group-item]:font-normal peer-data-[slot=radio-group-item]:text-foreground peer-data-[slot=switch]:text-sm peer-data-[slot=switch]:font-normal peer-data-[slot=switch]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }
