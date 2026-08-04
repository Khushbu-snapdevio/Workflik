"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes with this app's conventions. `attribute="class"` is required by globals.css's `@custom-variant dark` rule, and
 * `disableTransitionOnChange` prevents every interactive element's colour transition from animating at once on theme flip.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
