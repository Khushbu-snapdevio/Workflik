"use client";

import { useEffect, useRef } from "react";

const COMMON_EMOJIS = [
  "📄","📝","📋","📌","📎","🗂️","📁","📂","🗃️","🗄️",
  "📊","📈","📉","📆","📅","🗓️","⭐","🌟","💡","🔑",
  "🔒","🔓","🏆","🎯","🚀","💼","🧩","🔧","⚙️","🛠️",
  "❤️","💙","💚","💛","🧡","💜","🖤","🤍","🎨","🌈",
  "🏠","🏢","🌍","✅","❌","⚠️","ℹ️","🔔","💬","📧",
  "🎉","🎊","🎈","🎁","🏅","🥇","📸","🎬","🎵","🎮",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onRemove, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-64 rounded-[var(--radius-md)] border border-border bg-popover p-3 shadow-[var(--shadow-float)]"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-ui text-muted-foreground">
        Pick an icon
      </p>
      <div className="grid grid-cols-10 gap-0.5">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-base hover:bg-muted transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 w-full rounded-[var(--radius-sm)] py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Remove icon
        </button>
      )}
    </div>
  );
}
