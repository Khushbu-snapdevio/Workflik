"use client";

import { useEffect, useState } from "react";

// Persists a boolean (e.g. a sidebar section's expand/collapse state) to
// localStorage under `key`, so it survives the section unmounting — the
// whole sidebar collapsing to icon-only and back, or a full page reload —
// instead of always resetting to `defaultValue`. Drop-in replacement for
// `useState<boolean>`: supports both `set(true)` and `set((prev) => !prev)`.
export function usePersistedToggle(
  key: string,
  defaultValue: boolean
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored === "true" || stored === "false") {
      setValue(stored === "true");
    }
  }, [key]);

  function set(next: boolean | ((prev: boolean) => boolean)) {
    setValue((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      localStorage.setItem(key, String(resolved));
      return resolved;
    });
  }

  return [value, set];
}
