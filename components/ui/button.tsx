import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border border-transparent text-sm font-medium tracking-normal transition-colors outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        outline:
          "border-border bg-card text-foreground hover:bg-accent hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 dark:bg-destructive/20 dark:hover:bg-destructive/25",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4",
        xs: "h-6 gap-1 px-2.5 text-xs rounded-[var(--radius-sm)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-xs",
        lg: "h-10 gap-1.5 px-6",
        xl: "h-11 gap-2 px-7 text-base",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[var(--radius-sm)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
