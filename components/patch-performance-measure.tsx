"use client";

// Some third-party library calls performance.measure() with a mark name that
// doesn't exist, which throws and can crash unrelated code. Patched at module
// scope (not inside an effect) so it runs the instant this client module is
// evaluated — before hydration finishes, same practical timing as the
// next/script beforeInteractive strategy this replaces, but without
// rendering an actual <script> element (which React 19 warns about when it
// shows up outside the initial server render, e.g. on a not-found page).
if (typeof window !== "undefined") {
  const original = performance.measure.bind(performance);
  performance.measure = function (...args: Parameters<typeof performance.measure>) {
    try {
      return original(...args);
    } catch {
      return undefined as unknown as PerformanceMeasure;
    }
  };
}

export function PatchPerformanceMeasure() {
  return null;
}
