import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "badge inline-flex w-fit shrink-0 items-center gap-1 rounded-[var(--radius-xs)] border px-2 py-0.5 text-xs font-medium tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-secondary-foreground/20 bg-secondary text-secondary-foreground",
        secondary:
          "border-border bg-muted text-muted-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive",
        outline:
          "border-border bg-transparent text-foreground",
        ghost:
          "border-transparent bg-muted/60 text-foreground/70",
        link:
          "border-transparent bg-transparent text-primary underline-offset-4 hover:underline p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
