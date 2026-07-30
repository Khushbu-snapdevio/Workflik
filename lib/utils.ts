import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  return words.length === 1
    ? words[0]!.charAt(0).toUpperCase()
    : (words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)).toUpperCase()
}

// Fixed palette of semantic bg-* tokens (UI Rule 26) — never random, and
// the single source of truth every avatar fallback across the app must use.
// Previously each caller hand-rolled its own hash/palette; they drifted out
// of sync (different palette sizes, different hash-to-index math, some
// even hashing user id instead of name), so the same person's avatar could
// show a different color in different parts of the app.
const AVATAR_BG_CLASSES = [
  "bg-primary", "bg-destructive", "bg-success", "bg-warning",
  "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
] as const

export function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_BG_CLASSES[h % AVATAR_BG_CLASSES.length]!
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Never"
  }
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
