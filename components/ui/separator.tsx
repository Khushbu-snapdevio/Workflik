import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Radix's Separator did two things: render a div, and set the right ARIA. The
 * div is free and the ARIA is four lines, so the dependency was not earning
 * its keep.
 *
 * `data-orientation` is load-bearing, not decoration — the `data-horizontal:`
 * / `data-vertical:` variants below compile to `[data-orientation=…]`
 * selectors, so dropping the attribute silently costs the separator its 1px
 * size and it disappears.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}) {
  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      // A decorative rule carries no meaning for assistive tech, so it is
      // removed from the tree entirely rather than announced as a separator.
      role={decorative ? "none" : "separator"}
      // Only meaningful separators take aria-orientation, and only when
      // vertical — horizontal is the implicit default for role="separator".
      aria-orientation={
        !decorative && orientation === "vertical" ? "vertical" : undefined
      }
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
