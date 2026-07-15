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
