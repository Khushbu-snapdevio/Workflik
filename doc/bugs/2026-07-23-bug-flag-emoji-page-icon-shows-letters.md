# Bug: Flag emoji page icon renders as country-code letters (e.g. "TM") instead of the flag

## What's broken (user's perspective)

Setting a page icon to a country flag from the emoji picker (Emoji tab → Flags) shows
the two-letter country code — e.g. "TM" for the Turkmenistan flag — as the page icon
instead of the flag. It appears wrong in the page header, the breadcrumb, and the
sidebar. The flags look correct *in the picker grid* but not once selected.

## Reproduce

1. On Windows (Chrome/Edge), open a page and click its icon → Emoji → Flags.
2. Pick any country flag.
3. The header/breadcrumb/sidebar icon shows the country's letter pair ("TM"), not the
   flag.

## Root cause

Country/region flag emoji are two Unicode "regional indicator" characters (an A–Z
pair, e.g. 🇹🇲 = U+1F1F9 U+1F1F2). **Windows' system emoji font does not draw these as
colored flags** — it falls back to rendering the two letters ("TM").

The emoji picker grid already works around this: it maps a flag emoji to an ISO code and
renders the `flag-icons` SVG set (`fi fi-<code> fis`, loaded globally in
[app/globals.css](../../app/globals.css)) instead of the native glyph. But the
**stored** icon is the raw emoji string, and [PageIcon](../../components/pages/page-icon.tsx)
rendered every emoji as a plain native `<span>{emoji}</span>`. So the picker showed a
flag, but the actual page icon (header, breadcrumb, sidebar, database views, …) showed
the native glyph — i.e. "TM" on Windows.

The flag-rendering logic lived only inside the picker; the shared icon renderer never
got it.
