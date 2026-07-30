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

// Fixed palette — never random, and the single source of truth every avatar
// fallback across the app must use. Previously each caller hand-rolled its own
// hash/palette; they drifted out of sync (different palette sizes, different
// hash-to-index math, some even hashing user id instead of name), so the same
// person's avatar could show a different color in different parts of the app.
//
// These are deliberately fixed hues rather than semantic tokens. An avatar
// colour is an identity — it should not change when the user switches theme,
// and it carries no status meaning, so borrowing --success/--destructive was
// always a category error. It was also unreadable: every one of those tokens
// lifts to a light tone in the dark theme, dropping the white initials on top
// to between 1.7:1 and 2.8:1. Each hue below holds white at >= 5:1 and stays
// legible as a disc on both the light and dark card surface.
const AVATAR_BG_CLASSES = [
  "bg-[#0369A1]", "bg-[#B91C1C]", "bg-[#047857]", "bg-[#B45309]",
  "bg-[#6D28D9]", "bg-[#0F766E]", "bg-[#BE185D]", "bg-[#4338CA]",
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
