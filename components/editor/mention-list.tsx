"use client";

import { Plus } from "lucide-react";
import {
 forwardRef,
 useEffect,
 useImperativeHandle,
 useRef,
 useState,
} from "react";
import { exitSuggestion } from "@tiptap/suggestion";
import type { MentionItem, MentionSuggestionProps } from "@/components/editor/extensions/mention-extension";
import { MENTION_PLUGIN_KEY, PAGE_LINK_PLUGIN_KEY } from "@/components/editor/extensions/mention-extension";

export interface MentionListHandle {
 onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
 suggestionProps: MentionSuggestionProps;
}

export const MentionList = forwardRef<MentionListHandle, Props>(
 function MentionList({ suggestionProps }, ref) {
  const { items, command, clientRect, editor } = suggestionProps;
  const typedItems = items as MentionItem[];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef(selectedIndex);
  selectedRef.current = selectedIndex;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelectedIndex(0), [items]);

  // This popup is `position: fixed`, entirely outside the editor's own DOM —
  // ProseMirror's Suggestion plugin only re-evaluates whether it's still
  // "active" on document/selection transactions inside the editor, so a
  // click anywhere else on the page (sidebar, topbar, another panel) never
  // triggers one and the popup would otherwise stay open forever. Dispatch
  // the plugin's own exit transaction directly — the safe way to close a
  // suggestion without touching the document (see exitSuggestion's own
  // doc comment in @tiptap/suggestion). Both keys are exited unconditionally
  // since this list is shared between the "@" and "[[" triggers and only
  // one of them is ever actually active at a time.
  useEffect(() => {
   function handleMouseDown(e: MouseEvent) {
    if (containerRef.current?.contains(e.target as Node)) return;
    exitSuggestion(editor.view, MENTION_PLUGIN_KEY);
    exitSuggestion(editor.view, PAGE_LINK_PLUGIN_KEY);
   }
   document.addEventListener("mousedown", handleMouseDown);
   return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [editor]);

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
  const createItems = typedItems.filter((i) => i.mentionType === "create_page");

  return (
   <div
    ref={containerRef}
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
    {createItems.map((item) => {
     const idx = typedItems.indexOf(item);
     return (
      <MentionRow
       key="create_page"
       item={item}
       isSelected={selectedIndex === idx}
       onClick={() => selectItem(item)}
      />
     );
    })}
   </div>
  );
 }
);

function Section({ label, children }: { label: string; children: React.ReactNode }) {
 return (
  <div>
   <div className="px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
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
   {item.mentionType === "create_page" && (
    <>
     <Plus className="w-5 shrink-0 text-muted-foreground" size={14} />
     <span className="truncate text-foreground">
      Create page <span className="font-medium">&ldquo;{item.query}&rdquo;</span>
     </span>
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
  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 select-none">
   {name[0]?.toUpperCase()}
  </div>
 );
}
