"use client"

import * as React from "react"
import { CaretDownIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/**
 * Native `<details>`/`<summary>` in place of Radix's Accordion. `type="single"`
 * uses `<details name="...">` — browsers make same-named details mutually
 * exclusive (Chrome 120+/Safari 17.4+/Firefox 129+) — instead of JS-managed
 * open state.
 *
 * API note: Radix's controlled `value`/`onValueChange` contract is dropped in
 * favour of native uncontrolled `open`/`defaultOpen` per item. Zero consumers
 * in the app today; revisit if a future consumer needs programmatic control.
 */
const AccordionGroupContext = React.createContext<string | undefined>(undefined)

function Accordion({
  className,
  type = "single",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  type?: "single" | "multiple"
}) {
  const groupName = React.useId()
  return (
    <AccordionGroupContext.Provider value={type === "single" ? groupName : undefined}>
      <div data-slot="accordion" className={cn("flex w-full flex-col", className)} {...props}>
        {children}
      </div>
    </AccordionGroupContext.Provider>
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<"details">) {
  const groupName = React.useContext(AccordionGroupContext)
  return (
    <details
      data-slot="accordion-item"
      name={groupName}
      className={cn("group/accordion-item not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"summary">) {
  return (
    <summary
      data-slot="accordion-trigger"
      className={cn(
        "relative flex flex-1 list-none items-start justify-between gap-6 rounded-none border border-transparent py-4 text-left text-sm font-semibold transition-all outline-none [&::-webkit-details-marker]:hidden hover:underline focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    >
      {children}
      <CaretDownIcon
        data-slot="accordion-trigger-icon"
        className="pointer-events-none ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-open/accordion-item:rotate-180"
      />
    </summary>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="accordion-content" className="text-sm" {...props}>
      <div
        className={cn(
          "pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
