"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  /* resolvedTheme, not theme: `theme` is "system" whenever the user has not
     made an explicit choice, and Sonner would then apply its own OS media
     query independently of ours. resolvedTheme is always a concrete
     "light" | "dark", so the toast can never disagree with the app. */
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme ?? "light") as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon weight="fill" className="size-[18px] text-success" />
        ),
        info: (
          <InfoIcon weight="fill" className="size-[18px] text-primary" />
        ),
        warning: (
          <WarningIcon weight="fill" className="size-[18px] text-warning" />
        ),
        error: (
          <XCircleIcon weight="fill" className="size-[18px] text-destructive" />
        ),
        loading: (
          <SpinnerIcon className="size-[18px] animate-spin text-muted-foreground" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      visibleToasts={1}
      {...props}
    />
  )
}

export { Toaster }
