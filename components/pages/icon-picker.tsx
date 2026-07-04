"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Shuffle, ImageIcon, Clock } from "lucide-react";
import { useUpload } from "@/lib/storage/use-upload";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { ICON_REGISTRY, PageIcon } from "./page-icon";

// ── Emoji categories (Notion-standard 8 categories) ──────────────────────────

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

// ── Icon colors ───────────────────────────────────────────────────────────────

const ICON_COLORS = [
  { name: "Gray",   value: "#6b7280" },
  { name: "Red",    value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber",  value: "#f59e0b" },
  { name: "Green",  value: "#22c55e" },
  { name: "Teal",   value: "#14b8a6" },
  { name: "Blue",   value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink",   value: "#ec4899" },
  { name: "Navy",   value: "#0C2340" },
  { name: "Black",  value: "#1a1a1a" },
];

const ICON_NAMES = Object.keys(ICON_REGISTRY);
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

function randomEmoji(): string {
  const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  return all[Math.floor(Math.random() * all.length)] ?? "📝";
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface IconPickerProps {
  onSelect: (value: string) => void;
  onIconPreview?: (value: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  workspaceId?: string;
  pageId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IconPicker({
  onSelect, onIconPreview, onRemove, onClose, workspaceId, pageId,
}: IconPickerProps) {
  const [tab, setTab] = useState<"emoji" | "icons" | "upload">("emoji");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [skinTone, setSkinTone] = useState<string>(() => getSavedTone());
  const [showSkinTones, setShowSkinTones] = useState(false);
  const [iconColor, setIconColor] = useState("#6b7280");
  const [iconSearch, setIconSearch] = useState("");
  const [uploadSubTab, setUploadSubTab] = useState<"file" | "link">("file");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreviewOk, setLinkPreviewOk] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [skinToneRect, setSkinToneRect] = useState<DOMRect | null>(null);
  const skinToneBtnRef = useRef<HTMLButtonElement>(null);
  const skinToneMenuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiScrollRef = useRef<HTMLDivElement>(null);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const currentHand = SKIN_TONES.find(s => s.tone === skinTone)?.hand ?? "✋";

  useScrollLockWhileOpen(showSkinTones, (target) =>
    !!skinToneMenuRef.current?.contains(target) || !!skinToneBtnRef.current?.contains(target));

  const { upload, uploading, error: uploadError } = useUpload({ kind: "page_icon", workspaceId, pageId });

  useEffect(() => {
    setRecentEmojis(getRecent());
    function down(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        // Skin-tone dropdown is a portal outside pickerRef — don't close when clicking inside it
        if (skinToneMenuRef.current && skinToneMenuRef.current.contains(e.target as Node)) return;
        onCloseRef.current();
      }
    }
    // Use capture so we catch the event before other handlers
    document.addEventListener("mousedown", down, true);
    return () => document.removeEventListener("mousedown", down, true);
  }, []); // stable — never re-runs

  const filteredIcons = iconSearch.trim()
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(iconSearch.trim().toLowerCase()))
    : ICON_NAMES;

  const emojiSearchResults = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
        .filter((e) => e.includes(emojiSearch.trim()))
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

  async function handleUpload(file: File) {
    const res = await upload(file);
    if (res) {
      setUploadedUrl(res.fileUrl);
      const iconJson = JSON.stringify({ type: "image", url: res.fileUrl });
      if (onIconPreview) onIconPreview(iconJson);
    }
  }

  function applyImage(url: string) {
    onSelect(JSON.stringify({ type: "image", url }));
    onClose();
  }

  function applyLinkUrl() {
    const trimmed = linkUrl.trim();
    if (!trimmed || !linkPreviewOk) return;
    applyImage(trimmed);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleUpload(file);
  }

  const EmojiBtn = ({ emoji }: { emoji: string }) => (
    <button
      onClick={() => handleEmojiSelect(emoji)}
      className="flex size-[30px] items-center justify-center rounded-[var(--radius-xs)] text-[19px] leading-none transition-colors hover:bg-accent"
    >
      {emoji}
    </button>
  );

  return (
    <div
      ref={pickerRef}
      className="absolute left-0 top-full z-[500] mt-2 w-[352px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Tab bar — Notion underline style ── */}
      <div className="flex items-center border-b border-border/60 px-2">
        {(["emoji", "icons", "upload"] as const).map((id) => {
          const label = id === "emoji" ? "Emoji" : id === "icons" ? "Icons" : "Upload";
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                "relative px-3 py-2.5 text-xs font-medium transition-colors",
                tab === id
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:content-['']"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
        <div className="flex-1" />
        {onRemove && (
          <button
            onClick={() => { onRemove(); onClose(); }}
            className="px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>

      {/* ── Emoji tab ── */}
      {tab === "emoji" && (
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
            {/* Shuffle — updates the icon but keeps the picker open, so the user
                can click it repeatedly to browse random options before settling
                on one. Routed through onIconPreview (same "update without closing"
                callback already used by the upload tab) when the caller supports
                it; falls back to the old select-and-close behavior otherwise. */}
            <button
              onClick={() => {
                const picked = randomEmoji();
                const final = applyTone(stripTone(picked), skinTone);
                if (onIconPreview) {
                  onIconPreview(final);
                } else {
                  onSelect(final);
                  onClose();
                }
              }}
              title="Random"
              className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Shuffle size={13} />
            </button>
            {/* Skin tone */}
            <div className="relative">
              <button
                ref={skinToneBtnRef}
                onClick={() => {
                  const r = skinToneBtnRef.current?.getBoundingClientRect();
                  if (!showSkinTones && r) setSkinToneRect(r);
                  setShowSkinTones(p => !p);
                }}
                title="Select skin tone"
                className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-[18px] leading-none transition-colors ${showSkinTones ? "border-primary/50 bg-accent" : "border-border bg-background hover:bg-accent"}`}
              >
                {currentHand}
              </button>
              {showSkinTones && skinToneRect && typeof document !== "undefined" && createPortal(
                <div
                  ref={skinToneMenuRef}
                  style={{ position: "fixed", top: skinToneRect.bottom + 6, right: window.innerWidth - skinToneRect.right, zIndex: 9999 }}
                  className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-popover p-1.5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {SKIN_TONES.map((s) => (
                    <button
                      key={s.tone}
                      onClick={() => handleSkinTone(s.tone)}
                      title={s.tone ? `Skin tone ${s.hand}` : "Default"}
                      className={`flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[18px] leading-none transition-colors hover:bg-accent ${skinTone === s.tone ? "bg-accent ring-1 ring-primary/40" : ""}`}
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
          <div className="flex items-center gap-0 overflow-x-auto border-t border-border/50 px-2 py-1 scrollbar-none">
            <button
              onClick={() => scrollToCategory("recent")}
              title="Recently used"
              className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Clock size={13} />
            </button>
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                title={cat.label}
                className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[15px] leading-none transition-colors hover:bg-accent"
              >
                {cat.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Icons tab ── */}
      {tab === "icons" && (
        <div className="flex flex-col">
          <div className="px-3 pb-2 pt-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons…"
                autoFocus
                className="w-full rounded-[var(--radius-sm)] border border-border bg-background py-1.5 pl-7 pr-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-border/40 px-3 pb-2.5">
            {ICON_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setIconColor(c.value)}
                title={c.name}
                className="relative flex shrink-0 items-center justify-center transition-transform hover:scale-110"
                style={{ width: 20, height: 20 }}
              >
                <span
                  className={["block rounded-full transition-all", iconColor === c.value ? "size-5 ring-2 ring-offset-1 ring-foreground/40" : "size-4"].join(" ")}
                  style={{ backgroundColor: c.value }}
                />
              </button>
            ))}
          </div>
          <div className="h-[200px] overflow-y-auto px-2.5 py-2">
            {filteredIcons.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No icons found</p>
            ) : (
              <div className="grid grid-cols-9 gap-0.5">
                {filteredIcons.map((name) => (
                  <button
                    key={name}
                    title={name}
                    onClick={() => { onSelect(JSON.stringify({ type: "icon", name, color: iconColor })); onClose(); }}
                    className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-accent"
                  >
                    <PageIcon icon={JSON.stringify({ type: "icon", name, color: iconColor })} size={18} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload tab ── */}
      {tab === "upload" && (
        <div className="flex flex-col">
          <div className="flex gap-0 border-b border-border/40 px-3">
            {(["file", "link"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setUploadSubTab(st)}
                className={[
                  "relative py-2.5 px-3 text-xs font-medium transition-colors",
                  uploadSubTab === st
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:content-['']"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {st === "file" ? "Upload file" : "Link"}
              </button>
            ))}
          </div>

          {uploadSubTab === "file" && (
            <div className="p-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; }}
              />
              {uploadedUrl ? (
                <div className="flex flex-col items-center gap-4 py-3">
                  <img src={uploadedUrl} alt="Icon preview" className="size-[72px] rounded-[6px] border border-border object-cover shadow-sm" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => applyImage(uploadedUrl)} className="rounded-[var(--radius-sm)] bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Apply</button>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50">{uploading ? "Uploading…" : "Change"}</button>
                  </div>
                  {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={["flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed py-8 transition-colors",
                    isDragging ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/20 hover:text-foreground",
                    uploading ? "pointer-events-none opacity-60" : ""].join(" ")}
                >
                  <ImageIcon size={22} className="opacity-50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{uploading ? "Uploading…" : "Choose an image"}</p>
                    <p className="mt-0.5 text-xs opacity-60">or drag & drop · PNG, JPG, GIF, WebP</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadSubTab === "link" && (
            <div className="flex flex-col gap-3 p-3">
              <input
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkPreviewOk(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && linkPreviewOk) applyLinkUrl(); }}
                placeholder="Paste image URL…"
                autoFocus
                className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
              />
              {linkUrl.trim() && (
                <div className="flex items-center gap-3">
                  <img
                    src={linkUrl.trim()} alt="Preview"
                    className={`size-12 rounded-[4px] border object-cover transition-opacity ${linkPreviewOk ? "border-border opacity-100" : "opacity-0"}`}
                    onLoad={() => setLinkPreviewOk(true)}
                    onError={() => setLinkPreviewOk(false)}
                  />
                  {linkPreviewOk
                    ? <span className="text-xs text-muted-foreground">Preview</span>
                    : <span className="text-xs text-destructive">Not a valid image URL</span>
                  }
                </div>
              )}
              <button
                onClick={applyLinkUrl}
                disabled={!linkPreviewOk}
                className="rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
