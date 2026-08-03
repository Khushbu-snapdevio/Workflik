import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Plain `overflow-auto` in place of Radix's ScrollArea — scrollbars are
 * already styled globally (globals.css, native `::-webkit-scrollbar` rules),
 * so Radix's custom scrollbar/thumb components weren't adding anything.
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-area" className={cn("relative", className)} {...props}>
      <div
        data-slot="scroll-area-viewport"
        className="size-full overflow-auto rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
      </div>
    </div>
  )
}

export { ScrollArea }
