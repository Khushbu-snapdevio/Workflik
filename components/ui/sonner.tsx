"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon weight="fill" className="size-4 text-success" />
        ),
        info: (
          <InfoIcon weight="fill" className="size-4 text-primary" />
        ),
        warning: (
          <WarningIcon weight="fill" className="size-4 text-warning" />
        ),
        error: (
          <XCircleIcon weight="fill" className="size-4 text-destructive" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin text-muted-foreground" />
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
