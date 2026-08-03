"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  spacing?: number
  orientation?: "horizontal" | "vertical"
  value: string[]
  toggleValue: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null)

/** Native `<button>` group in place of Radix's ToggleGroup. */
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  type = "single",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
    type?: "single" | "multiple"
    value?: string | string[]
    defaultValue?: string | string[]
    onValueChange?: (value: string | string[] | undefined) => void
  }) {
  const [uncontrolled, setUncontrolled] = React.useState<string | string[] | undefined>(defaultValue)
  const current = value ?? uncontrolled
  const currentArray = Array.isArray(current) ? current : current ? [current] : []

  const toggleValue = (v: string) => {
    const next: string | string[] | undefined =
      type === "multiple"
        ? currentArray.includes(v)
          ? currentArray.filter((x) => x !== v)
          : [...currentArray, v]
        : currentArray.includes(v)
          ? undefined
          : v
    setUncontrolled(next)
    onValueChange?.(next)
  }

  return (
    <div
      data-slot="toggle-group"
      role="group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[spacing=0]:data-[variant=outline]:rounded-none data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation, value: currentArray, toggleValue }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </div>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  value,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof toggleVariants> & { value: string }) {
  const context = React.useContext(ToggleGroupContext)
  if (!context) {
    throw new Error("ToggleGroupItem must be rendered inside a ToggleGroup")
  }
  const isOn = context.value.includes(value)

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      data-state={isOn ? "on" : "off"}
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      aria-pressed={isOn}
      onClick={() => context.toggleValue(value)}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-6 group-data-[spacing=0]/toggle-group:shadow-none focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-4 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-4 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-none group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-none group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-none group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-none data-[state=on]:bg-muted data-[state=on]:text-foreground group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { ToggleGroup, ToggleGroupItem }
