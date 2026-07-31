"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes with this app's conventions so callers never have to
 * restate them:
 *
 *  - `attribute="class"` puts `.dark` on <html>, which is what the
 *    `@custom-variant dark` rule in globals.css keys off. Switching this to
 *    the data-attribute strategy would silently disable every `dark:` utility.
 *  - `disableTransitionOnChange` adds the `.no-transition` escape hatch during
 *    the flip. Without it the scoped colour transition in globals.css animates
 *    every interactive element at once and the theme change smears.
 *  - `enableSystem` lets "System" follow the OS; `defaultTheme="system"` means
 *    a first-time visitor gets whichever theme they already prefer.
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
