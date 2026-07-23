// Country/region flag emoji are two Unicode "regional indicator" characters
// (A–Z pairs) that map 1:1 to an ISO 3166-1 alpha-2 code. Windows' system emoji
// font doesn't draw these as colored flags — it shows the raw letter pair (e.g.
// 🇹🇲 → "TM") — so anywhere we'd otherwise render the native glyph we instead
// render the flag-icons SVG set (loaded globally in app/globals.css) via
// `fi fi-<code> fis`. `flagIconCode` maps an emoji to that `<code>`, or returns
// null for anything that isn't a flag (render those natively).

const REGIONAL_INDICATOR_BASE = 0x1f1e6;

// The three ISO 3166-2 "subdivision" flags (England/Scotland/Wales) use tag
// sequences rather than regional-indicator pairs, so they need an explicit map.
const SUBDIVISION_FLAG_CODES: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng",
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct",
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls",
};

export function flagIconCode(emoji: string): string | null {
  if (SUBDIVISION_FLAG_CODES[emoji]) return SUBDIVISION_FLAG_CODES[emoji];
  const points = [...emoji];
  if (points.length !== 2) return null;
  let code = "";
  for (const ch of points) {
    const cp = ch.codePointAt(0)!;
    if (cp < REGIONAL_INDICATOR_BASE || cp > REGIONAL_INDICATOR_BASE + 25) return null;
    code += String.fromCharCode(cp - REGIONAL_INDICATOR_BASE + 65);
  }
  return code.toLowerCase();
}
