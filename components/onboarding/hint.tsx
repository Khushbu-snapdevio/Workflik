"use client";

import { useHints } from "./hint-provider";

interface Props {
  hintKey:  string;
  children: React.ReactNode;
  icon?:    string;
}

export function Hint({ hintKey, children, icon = "💡" }: Props) {
  const { isDismissed, dismiss } = useHints();

  if (isDismissed(hintKey)) return null;

  return (
    <div className="group flex items-start gap-2.5 rounded-xl border border-[#e8e8e5] bg-[#fafaf9] px-4 py-3 text-[12.5px] text-[#6b6b6b]">
      <span className="mt-px shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1 leading-relaxed">{children}</span>
      <button
        type="button"
        onClick={() => dismiss(hintKey)}
        title="Dismiss"
        className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 flex size-4 items-center justify-center rounded text-[#b0b0ab] hover:text-[#37352f]"
      >
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[10px]">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
    </div>
  );
}
