"use client"

import * as React from "react"

// Radix's `Slot` ships its own "use client" pragma internally, which is what
// let `<Button asChild>` be used from Server Components (Button itself has
// no "use client" — Slot being a client boundary is what makes attaching a
// ref via cloneElement legal). This local replacement needs the same.
function setRef<T>(ref: React.Ref<T> | undefined, node: T) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.RefObject<T | null>).current = node
}

// Local replacement for radix-ui's `Slot.Root` — merges the props passed to
// `<Slot>` onto its single child (the `asChild` composition pattern), instead
// of rendering its own DOM node. className/style are merged, `on*` handlers
// are composed (both run, child wins on preventDefault), everything else the
// child explicitly sets wins over the slot's value.
const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...slotProps }, ref) => {
    if (!React.isValidElement(children)) return null

    const child = children as React.ReactElement<Record<string, unknown>>
    const childProps = child.props
    const merged: Record<string, unknown> = { ...slotProps, ...childProps }

    for (const key of Object.keys(slotProps)) {
      const slotValue = (slotProps as Record<string, unknown>)[key]
      const childValue = childProps[key]

      if (key === "className") {
        merged.className = [slotValue, childValue].filter(Boolean).join(" ")
      } else if (key === "style") {
        merged.style = { ...(slotValue as object), ...(childValue as object) }
      } else if (key.startsWith("on") && typeof slotValue === "function") {
        merged[key] = (...args: unknown[]) => {
          ;(slotValue as (...a: unknown[]) => void)(...args)
          if (typeof childValue === "function") (childValue as (...a: unknown[]) => void)(...args)
        }
      }
    }

    const childRef = (child as unknown as { ref?: React.Ref<HTMLElement> }).ref

    return React.cloneElement(child, {
      ...merged,
      ref: (node: HTMLElement) => {
        setRef(ref, node)
        setRef(childRef, node)
      },
    })
  }
)
Slot.displayName = "Slot"

export { Slot }
