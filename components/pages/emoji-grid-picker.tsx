"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Shuffle, Clock } from "lucide-react";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { emojiMatches } from "@/lib/emoji-search";
import { flagIconCode } from "@/lib/emoji-flags";
import { getClampedTop } from "@/lib/ui/clamp-to-viewport";
import { IconTooltip } from "@/components/ui/icon-tooltip";

// ── Emoji categories (Notion-standard 8 categories) ──────────────────────────
// Extracted out of IconPicker so the same searchable, categorized emoji grid
// (search + recent + skin tone + category shortcut bar) can be reused
// anywhere an emoji needs picking — page icons and comment reactions alike.

type EmojiCategory = { id: string; label: string; icon: string; emojis: string[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "people",
    label: "Smileys & People",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍",
      "🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫",
      "🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤",
      "😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥸","😎",
      "🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰",
      "😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬",
      "😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹",
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝",
      "🙏","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🦷","🦴","👀","👁️","👅","💋",
      "💌","💘","💝","💖","💗","💓","💞","💕","❣️","❤️","🧡","💛","💚","💙","💜",
      "🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💯","💢","💥","💫","💦","💨","🕳️","💬",
    ],
  },
  {
    id: "animals",
    label: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸",
      "🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴",
      "🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖",
      "🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅",
      "🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂",
      "🌵","🎄","🌲","🌳","🌴","🪵","🌱","🌿","☘️","🍀","🎍","🪴","🎋","🍃","🍂",
      "🍁","🍄","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜",
      "🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌟","⭐","🌠","🌌","☀️",
      "🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","🌪️",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: "🍕",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🫒","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🧄","🧅","🥔","🍠","🥐",
      "🥯","🍞","🥖","🫓","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴",
      "🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥙","🧆","🥚","🍿","🧂","🥫","🍱","🍘",
      "🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡",
      "🦀","🦞","🦐","🦑","🦪","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫",
      "🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻",
      "🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢","🫙","🧂","🫕",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥍",
      "🏑","🪃","🥅","⛳","🪁","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🪃","🎱","🎮",
      "🕹️","🎲","🧩","🧸","🪅","🎭","🎨","🖼️","🎪","🤹","🎠","🎡","🎢","🎟️","🎫",
      "🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎀","🎁","🎊","🎉","🎋","🎍","🎎",
      "🎏","🎐","🧧","🎆","🎇","🧨","🎴","🀄","🃏","🎰","🎳","🎻","🎸","🎹","🥁",
      "🎷","🎺","🪗","🎙️","🎚️","🎛️","📻","🎤","🎧","📢","📣","🔔","🔕","🎵","🎶",
    ],
  },
  {
    id: "travel",
    label: "Travel & Places",
    icon: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️",
      "🛵","🚲","🛴","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞",
      "🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🛰️",
      "🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","🗺️","🧭","🏔️","⛰️","🌋",
      "🗻","🏕️","🏖️","🏜️","🏝️","🏞️","🏟️","🏛️","🏗️","🧱","🏘️","🏚️","🏠","🏡","🏢",
      "🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽",
      "⛪","🕌","🛕","🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇",
      "🌉","🌌","🌠","🎇","🎆","🎑","🗾","🏔️","🌐","🗺️","🧳","☂️","⛱️","🎡","🎢",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      "💡","🔦","🕯️","🪔","💰","💴","💵","💶","💷","💸","💳","🪙","💹","📈","📉",
      "📊","📋","📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔏",
      "🔐","🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🗡️","⚔️","🛡️","🪚","🔧","🪛","🔩",
      "⚙️","🗜️","🔗","⛓️","🪝","🧲","🪜","⚖️","🦯","🔭","🔬","🩺","💊","🩹","🩻",
      "🧬","🦠","🧪","🧫","🧲","🪄","🔮","🧿","🪬","🧸","🪆","🪅","🎭","🎨","🖼️",
      "📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏰",
      "🕰️","📡","🔋","🔌","💻","🖥️","🖨️","⌨️","🖱️","💾","💿","📀","📱","📲","☎️",
      "📔","📒","📓","📕","📗","📘","📙","📚","📖","🔖","🏷️","📝","✏️","✒️","🖊️",
      "🖋️","🖌️","📮","📯","📦","📫","📪","📬","📭","📮","🗳️","🗂️","📁","📂","🗃️",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","❤️‍🩹","💔","❣️","💕","💞",
      "💓","💗","💖","💝","💘","💟","☮️","✝️","☪️","🕉️","☸️","🔯","🪯","✡️","☦️",
      "🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔",
      "⚛️","🈴","🈳","🈺","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕",
      "🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🔕","🔇",
      "🔈","🔉","🔊","📯","🔔","🔕","🎵","🎶","⚠️","🚸","🔱","⚜️","🔰","♻️","✅",
      "🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲",
      "⁉️","🔟","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️",
      "🛗","🈳","🚰","🚹","🚺","🚻","🚼","🚽","🚿","🛁","🛒","🔃","🔄","🔙","🔚",
      "🔛","🔜","🔝","⏫","⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️","↕️","↔️","↩️",
      "1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","0️⃣","#️⃣","*️⃣","▶️","⏸️","⏹️",
    ],
  },
  {
    id: "flags",
    label: "Flags",
    icon: "🏳️",
    emojis: [
      "🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇳",
      "🇦🇫","🇦🇱","🇩🇿","🇦🇩","🇦🇴","🇦🇬","🇦🇷","🇦🇲","🇦🇺","🇦🇹","🇦🇿","🇧🇸","🇧🇭","🇧🇩","🇧🇧",
      "🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇨🇻","🇰🇭",
      "🇨🇲","🇨🇦","🇨🇫","🇹🇩","🇨🇱","🇨🇳","🇨🇴","🇰🇲","🇨🇬","🇨🇩","🇨🇷","🇨🇮","🇭🇷","🇨🇺","🇨🇾",
      "🇨🇿","🇩🇰","🇩🇯","🇩🇲","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇸🇿","🇪🇹","🇫🇯","🇫🇮",
      "🇫🇷","🇬🇦","🇬🇲","🇬🇪","🇩🇪","🇬🇭","🇬🇷","🇬🇩","🇬🇹","🇬🇳","🇬🇼","🇬🇾","🇭🇹","🇭🇳","🇭🇺",
      "🇮🇸","🇮🇳","🇮🇩","🇮🇷","🇮🇶","🇮🇪","🇮🇱","🇮🇹","🇯🇲","🇯🇵","🇯🇴","🇰🇿","🇰🇪","🇰🇮","🇽🇰",
      "🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇮","🇱🇹","🇱🇺","🇲🇬","🇲🇼","🇲🇾","🇲🇻",
      "🇲🇱","🇲🇹","🇲🇭","🇲🇷","🇲🇺","🇲🇽","🇫🇲","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲","🇳🇦",
      "🇳🇷","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇴","🇴🇲","🇵🇰","🇵🇼","🇵🇸","🇵🇦","🇵🇬","🇵🇾",
      "🇵🇪","🇵🇭","🇵🇱","🇵🇹","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇰🇳","🇱🇨","🇻🇨","🇼🇸","🇸🇲","🇸🇹","🇸🇦",
      "🇸🇳","🇷🇸","🇸🇨","🇸🇱","🇸🇬","🇸🇰","🇸🇮","🇸🇧","🇸🇴","🇿🇦","🇸🇸","🇪🇸","🇱🇰","🇸🇩","🇸🇷",
      "🇸🇪","🇨🇭","🇸🇾","🇹🇼","🇹🇯","🇹🇿","🇹🇭","🇹🇱","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇺🇬",
      "🇺🇦","🇦🇪","🇬🇧","🇺🇸","🇺🇾","🇺🇿","🇻🇺","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼","🏴󠁧󠁢󠁥󠁮󠁧󠁿","🏴󠁧󠁢󠁳󠁣󠁴󠁿","🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    ],
  },
];

// Country/region flags render via the flag-icons SVG set (see lib/emoji-flags)
// because Windows' system emoji font shows raw letter pairs instead of flags.

const RECENT_KEY = "wf_recent_emojis";
const SKIN_TONE_KEY = "wf_skin_tone";
const MAX_RECENT = 20;

const SKIN_TONES = [
  { tone: "",           hand: "✋"  },
  { tone: "\u{1F3FB}", hand: "✋🏻" },
  { tone: "\u{1F3FC}", hand: "✋🏼" },
  { tone: "\u{1F3FD}", hand: "✋🏽" },
  { tone: "\u{1F3FE}", hand: "✋🏾" },
  { tone: "\u{1F3FF}", hand: "✋🏿" },
] as const;

// Emojis in People category that accept skin-tone modifiers
const SKIN_TONE_CAPABLE = new Set([
  "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉",
  "👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🙏",
  "💅","🤳","💪","🦵","🦶","👂","🦻","👃","🫵","🫴","🫳","🫲","🫱","🫶","🫰",
]);

function stripTone(emoji: string): string {
  // Remove Fitzpatrick skin-tone modifier (U+1F3FB – U+1F3FF) so we always store the base emoji
  return emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/u, "");
}

function applyTone(emoji: string, tone: string): string {
  const base = stripTone(emoji);
  if (!tone || !SKIN_TONE_CAPABLE.has(base)) return base;
  // Strip variation selector (U+FE0F) so the skin tone modifier combines correctly.
  // e.g. 🖐️(U+1F590+FE0F) + 🏽 must be stored as U+1F590+1F3FD, not U+1F590+FE0F+1F3FD,
  // otherwise browsers render them as two separate glyphs.
  return base.replace(/️/g, "") + tone;
}

function getSavedTone(): string {
  try { return localStorage.getItem(SKIN_TONE_KEY) ?? ""; } catch { return ""; }
}
function saveTone(tone: string) {
  try { localStorage.setItem(SKIN_TONE_KEY, tone); } catch { /* noop */ }
}

function getRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
    // Migrate: strip any stored tone modifiers so recent list only contains base emojis
    return [...new Set(raw.map(stripTone).filter(Boolean))];
  } catch { return []; }
}
function addRecent(emoji: string) {
  try {
    const base = stripTone(emoji);
    if (!base) return;
    const list = [base, ...getRecent().filter((e) => e !== base)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

export function randomEmoji(): string {
  const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  return all[Math.floor(Math.random() * all.length)] ?? "📝";
}

export interface EmojiGridPickerProps {
  /** Called with the final (tone-applied) emoji when a grid cell is clicked. */
  onSelect: (emoji: string) => void;
  /** Called after a normal grid-cell selection — the caller owns closing the popover. */
  onClose: () => void;
  /** When provided, shows a "Shuffle" button that calls this with a random
   *  emoji instead of onSelect — lets the caller preview without closing
   *  (e.g. IconPicker keeps the picker open so you can re-roll). */
  onShuffle?: (emoji: string) => void;
}

// The reusable "Emoji tab" content — search, recently used, skin tone,
// category grid, and category shortcut bar. Deliberately has no outer
// border/width/positioning of its own; callers own their own popover chrome
// (IconPicker's tab panel, or a comment's floating reaction picker) so this
// stays a plain content block that fits either container.
export function EmojiGridPicker({ onSelect, onClose, onShuffle }: EmojiGridPickerProps) {
  const [emojiSearch, setEmojiSearch] = useState("");
  const [skinTone, setSkinTone] = useState<string>(() => getSavedTone());
  const [showSkinTones, setShowSkinTones] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [skinToneRect, setSkinToneRect] = useState<DOMRect | null>(null);
  const skinToneBtnRef = useRef<HTMLButtonElement>(null);
  const skinToneMenuRef = useRef<HTMLDivElement>(null);
  const emojiScrollRef = useRef<HTMLDivElement>(null);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  const currentHand = SKIN_TONES.find(s => s.tone === skinTone)?.hand ?? "✋";

  useScrollLockWhileOpen(showSkinTones, (target) =>
    !!skinToneMenuRef.current?.contains(target) || !!skinToneBtnRef.current?.contains(target));

  useEffect(() => {
    setRecentEmojis(getRecent());
  }, []);

  const emojiSearchResults = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
        .filter((e) => emojiMatches(e, emojiSearch))
    : null;

  function scrollToCategory(id: string) {
    const el = catRefs.current[id];
    if (el && emojiScrollRef.current) {
      emojiScrollRef.current.scrollTop = el.offsetTop - 4;
    }
  }

  function handleEmojiSelect(emoji: string) {
    const base = stripTone(emoji);
    const final = applyTone(base, skinTone);
    addRecent(base); // always store the base emoji — tone is applied dynamically on display/select
    setRecentEmojis(getRecent());
    onSelect(final);
    onClose();
  }

  function handleSkinTone(tone: string) {
    setSkinTone(tone);
    saveTone(tone);
    setShowSkinTones(false);
  }

  const EmojiBtn = ({ emoji }: { emoji: string }) => {
    const flagCode = flagIconCode(emoji);
    return (
      <button
        onClick={() => handleEmojiSelect(emoji)}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        aria-label={emoji}
        className="flex size-[30px] select-none items-center justify-center rounded-[var(--radius-xs)] text-[19px] leading-none transition-colors hover:bg-accent"
      >
        {flagCode ? <span className={`fi fi-${flagCode} fis rounded-[2px]`} /> : emoji}
      </button>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Search row */}
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={emojiSearch}
            onChange={(e) => setEmojiSearch(e.target.value)}
            placeholder="Filter..."
            autoFocus
            className="w-full rounded-[var(--radius-sm)] border border-border bg-background py-1.5 pl-7 pr-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
          />
        </div>
        {onShuffle && (
          <button
            onClick={() => {
              const picked = randomEmoji();
              onShuffle(applyTone(stripTone(picked), skinTone));
            }}
            onMouseEnter={(e) => showTooltip("Random", e)}
            onMouseLeave={hideTooltip}
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Shuffle size={13} />
          </button>
        )}
        {/* Skin tone */}
        <div className="relative">
          <button
            ref={skinToneBtnRef}
            onClick={() => {
              const r = skinToneBtnRef.current?.getBoundingClientRect();
              if (!showSkinTones && r) setSkinToneRect(r);
              setShowSkinTones(p => !p);
            }}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            onMouseEnter={(e) => showTooltip("Select skin tone", e)}
            onMouseLeave={hideTooltip}
            className={`flex size-8 shrink-0 select-none items-center justify-center rounded-[var(--radius-sm)] border text-[18px] leading-none transition-colors ${showSkinTones ? "border-primary/50 bg-accent" : "border-border bg-background hover:bg-accent"}`}
          >
            {currentHand}
          </button>
          {showSkinTones && skinToneRect && typeof document !== "undefined" && createPortal(
            <div
              ref={skinToneMenuRef}
              data-emoji-picker-exempt
              style={{ position: "fixed", top: getClampedTop(skinToneRect, 50), right: window.innerWidth - skinToneRect.right, zIndex: 9999 }}
              className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-popover p-1.5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {SKIN_TONES.map((s) => (
                <button
                  key={s.tone}
                  onClick={() => handleSkinTone(s.tone)}
                  onDragStart={(e) => e.preventDefault()}
                  draggable={false}
                  onMouseEnter={(e) => showTooltip(s.tone ? "Skin tone" : "Default", e)}
                  onMouseLeave={hideTooltip}
                  className={`flex size-8 select-none items-center justify-center rounded-[var(--radius-sm)] text-[18px] leading-none transition-colors hover:bg-accent ${skinTone === s.tone ? "bg-accent ring-1 ring-primary/40" : ""}`}
                >
                  {s.hand}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Emoji scroll area */}
      <div ref={emojiScrollRef} className="h-[232px] overflow-y-auto px-2.5">
        {emojiSearchResults ? (
          emojiSearchResults.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No emojis found</p>
          ) : (
            <div className="grid grid-cols-10 gap-0 pb-2 pt-1">
              {emojiSearchResults.map((emoji, i) => <EmojiBtn key={`s-${emoji}-${i}`} emoji={emoji} />)}
            </div>
          )
        ) : (
          <>
            {recentEmojis.length > 0 && (
              <div ref={(el) => { catRefs.current["recent"] = el; }}>
                <p className="sticky top-0 z-10 bg-popover pb-0.5 pt-1 text-[11px] font-medium text-muted-foreground/50">
                  Recently used
                </p>
                <div className="grid grid-cols-10 gap-0 pb-1">
                  {recentEmojis.map((emoji, i) => (
                    <EmojiBtn key={`r-${emoji}-${i}`} emoji={emoji} />
                  ))}
                </div>
              </div>
            )}
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.id} ref={(el) => { catRefs.current[cat.id] = el; }}>
                <p className="sticky top-0 z-10 bg-popover pb-0.5 pt-1 text-[11px] font-medium text-muted-foreground/50">
                  {cat.label}
                </p>
                <div className="grid grid-cols-10 gap-0 pb-1">
                  {cat.emojis.map((emoji, i) => <EmojiBtn key={`${cat.id}-${emoji}-${i}`} emoji={emoji} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Category shortcut bar */}
      <div className="flex items-center justify-around border-t border-border/50 px-1 py-1 scrollbar-none">
        <button
          onClick={() => scrollToCategory("recent")}
          onMouseEnter={(e) => showTooltip("Recently used", e)}
          onMouseLeave={hideTooltip}
          className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
        >
          <Clock size={13} />
        </button>
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            onMouseEnter={(e) => showTooltip(cat.label, e)}
            onMouseLeave={hideTooltip}
            className="flex size-7 shrink-0 select-none items-center justify-center rounded-[var(--radius-sm)] text-[15px] leading-none transition-colors hover:bg-accent"
          >
            {cat.icon}
          </button>
        ))}
      </div>
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </div>
  );
}
