"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, Info, AlertTriangle, XCircle, LoaderCircle } from "lucide-react"

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
          <CheckCircle2 className="size-4.5 text-success" />
        ),
        info: (
          <Info className="size-4.5 text-primary" />
        ),
        warning: (
          <AlertTriangle className="size-4.5 text-warning" />
        ),
        error: (
          <XCircle className="size-4.5 text-destructive" />
        ),
        loading: (
          <LoaderCircle className="size-4.5 animate-spin text-muted-foreground" />
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
