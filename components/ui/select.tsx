"use client"

import * as React from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxSelectedOption,
} from "@headlessui/react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// The one primitive that genuinely needed a real behavior library — a
// custom-rendered, keyboard-navigable select isn't something daisyUI's CSS
// can give you. `ListboxSelectedOption` is what makes this viable: it
// mirrors the selected `SelectItem`'s children into the trigger the same
// way Radix's `SelectValue` used to, given the same option elements.

const SelectOptionsContext = React.createContext<React.ReactNode>(null)

function Select({
  children,
  value,
  onValueChange,
  disabled,
}: {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}) {
  let optionsChildren: React.ReactNode = null
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === SelectContent) {
      optionsChildren = (child.props as { children?: React.ReactNode }).children
    }
  })

  return (
    <SelectOptionsContext.Provider value={optionsChildren}>
      <Listbox
        value={value ?? null}
        onChange={(next) => {
          if (next != null) onValueChange?.(next as string)
        }}
        disabled={disabled}
      >
        {children}
      </Listbox>
    </SelectOptionsContext.Provider>
  )
}

function SelectValue({
  placeholder,
  className,
}: {
  placeholder?: React.ReactNode
  className?: string
}) {
  const optionsChildren = React.useContext(SelectOptionsContext)
  return (
    <span data-slot="select-value" className={cn("min-w-0 flex-1 truncate text-left", className)}>
      <ListboxSelectedOption
        options={optionsChildren}
        placeholder={<span className="text-muted-foreground-subtle">{placeholder}</span>}
      />
    </span>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "children"> & {
  size?: "sm" | "default"
  children?: React.ReactNode
}) {
  return (
    <ListboxButton
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-input bg-background px-3 text-sm whitespace-nowrap",
        "text-foreground transition-colors",
        "hover:bg-accent/40 hover:border-border",
        "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" && "h-9",
        size === "sm" && "h-8 text-xs",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    </ListboxButton>
  )
}

function SelectContent({
  className,
  children,
  align = "start",
}: {
  className?: string
  children?: React.ReactNode
  align?: "start" | "center" | "end"
}) {
  const anchor = align === "center" ? "bottom" : align === "end" ? "bottom end" : "bottom start"

  return (
    <ListboxOptions
      data-slot="select-content"
      anchor={{ to: anchor, gap: 4 }}
      transition
      className={cn(
        // z-[600] — this app has several elevated stacking tiers (sidebar,
        // modals); a Select can be triggered from inside any of them, so its
        // portal-rendered dropdown needs to sit above all of them.
        "z-[600] min-w-32 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-popover p-1 text-popover-foreground",
        "shadow-[var(--shadow-float)]",
        "transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95",
        className
      )}
    >
      {children}
    </ListboxOptions>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ListboxOption>) {
  return (
    <ListboxOption
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default scroll-my-1 items-center gap-2 rounded-[var(--radius-sm)] py-2 pl-3 pr-8 text-sm outline-none",
        "text-foreground transition-colors",
        "data-focus:bg-primary/10 data-focus:text-primary",
        "data-selected:font-medium",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {({ selected }) => (
        <>
          <span className="absolute right-2.5 flex size-4 items-center justify-center">
            {selected && <Check className="size-3.5 text-primary" />}
          </span>
          {children}
        </>
      )}
    </ListboxOption>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
