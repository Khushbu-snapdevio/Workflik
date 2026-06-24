"use client";

import {
 forwardRef,
 useEffect,
 useImperativeHandle,
 useRef,
 useState,
} from "react";
import type { MentionItem, MentionSuggestionProps } from "@/components/editor/extensions/mention-extension";

export interface MentionListHandle {
 onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
 suggestionProps: MentionSuggestionProps;
}

export const MentionList = forwardRef<MentionListHandle, Props>(
 function MentionList({ suggestionProps }, ref) {
  const { items, command, clientRect } = suggestionProps;
  const typedItems = items as MentionItem[];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef(selectedIndex);
  selectedRef.current = selectedIndex;

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
   onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === "ArrowUp") {
     setSelectedIndex((i) => Math.max(0, i - 1));
     return true;
    }
    if (event.key === "ArrowDown") {
     setSelectedIndex((i) => Math.min(typedItems.length - 1, i + 1));
     return true;
    }
    if (event.key === "Enter") {
     const item = typedItems[selectedRef.current];
     if (item) selectItem(item);
     return true;
    }
    return false;
   },
  }));

  function selectItem(item: MentionItem) {
   command(item);
  }

  const pos = clientRect?.();
  if (!typedItems.length || !pos) return null;

  const people = typedItems.filter((i) => i.mentionType === "user");
  const pageItems = typedItems.filter((i) => i.mentionType === "page");
  const dates = typedItems.filter((i) => i.mentionType === "date");

  return (
   <div
    style={{
     position: "fixed",
     top: pos.bottom + 4,
     left: pos.left,
     zIndex: 400,
    }}
    className="w-[240px] rounded-[var(--radius-md)] border border-border bg-popover overflow-hidden py-1"
   >
    {people.length > 0 && (
     <Section label="People">
      {people.map((item) => {
       const idx = typedItems.indexOf(item);
       return (
        <MentionRow
         key={item.id}
         item={item}
         isSelected={selectedIndex === idx}
         onClick={() => selectItem(item)}
        />
       );
      })}
     </Section>
    )}
    {pageItems.length > 0 && (
     <Section label="Pages">
      {pageItems.map((item) => {
       const idx = typedItems.indexOf(item);
       return (
        <MentionRow
         key={item.id}
         item={item}
         isSelected={selectedIndex === idx}
         onClick={() => selectItem(item)}
        />
       );
      })}
     </Section>
    )}
    {dates.length > 0 && (
     <Section label="Dates">
      {dates.map((item) => {
       const idx = typedItems.indexOf(item);
       return (
        <MentionRow
         key={item.id}
         item={item}
         isSelected={selectedIndex === idx}
         onClick={() => selectItem(item)}
        />
       );
      })}
     </Section>
    )}
   </div>
  );
 }
);

function Section({ label, children }: { label: string; children: React.ReactNode }) {
 return (
  <div>
   <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    {label}
   </div>
   {children}
  </div>
 );
}

function MentionRow({
 item,
 isSelected,
 onClick,
}: {
 item: MentionItem;
 isSelected: boolean;
 onClick: () => void;
}) {
 return (
  <button
   type="button"
   className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
    isSelected ? "bg-accent" : "hover:bg-accent"
   }`}
   onClick={onClick}
  >
   {item.mentionType === "user" && (
    <>
     <UserAvatar
      name={item.label}
      image={"image" in item ? item.image ?? undefined : undefined}
     />
     <span className="text-foreground">{item.label}</span>
    </>
   )}
   {item.mentionType === "page" && (
    <>
     <span className="text-base w-5 text-center">
      {"icon" in item && item.icon ? item.icon : "📄"}
     </span>
     <span className="text-foreground truncate">{item.label}</span>
    </>
   )}
   {item.mentionType === "date" && (
    <>
     <span className="w-5 text-center text-muted-foreground">📅</span>
     <span className="text-foreground">{item.label}</span>
    </>
   )}
  </button>
 );
}

function UserAvatar({ name, image }: { name: string; image?: string }) {
 if (image) {
  return (
   <img
    src={image}
    alt={name}
    className="h-5 w-5 rounded-full object-cover flex-shrink-0"
   />
  );
 }
 return (
  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 select-none">
   {name[0]?.toUpperCase()}
  </div>
 );
}
