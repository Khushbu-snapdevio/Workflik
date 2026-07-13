import { Check, ChevronRight } from "lucide-react";

// Small, read-only miniature rendering of a page's first few blocks — used
// wherever a page needs a content preview without mounting a real Tiptap
// editor (template gallery cards, page-reference hover cards, etc.).

export const MINI_WIDTHS = [
 "w-4/5",
 "w-3/5",
 "w-3/4",
 "w-1/2",
 "w-11/12",
 "w-2/3",
 "w-5/6",
] as const;

// Extracts plain, joined text from a block's rich-text content shape
// ({ text: [{ text, marks }] }) — falls back to "" for shapes with no text.
export function blockText(content: unknown): string {
 if (content && typeof content === "object" && "text" in content) {
  const arr = (content as { text?: { text: string }[] }).text;
  if (Array.isArray(arr)) return arr.map((t) => t.text).join("");
 }
 return "";
}

export function MiniPageContent({
 blocks,
}: {
 blocks: { type: string; content?: unknown }[];
}) {
 const items = blocks.length > 0 ? blocks.slice(0, 8) : [];
 if (items.length === 0) {
  return (
   <div className="space-y-1.5">
    <div className="h-1.5 w-2/3 rounded-[var(--radius-xs)] bg-foreground/18" />
    <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-muted-foreground/14" />
    <div className="h-1 w-full rounded-[var(--radius-xs)] bg-muted-foreground/12" />
    <div className="h-px bg-border/40 my-1" />
    <div className="flex items-center gap-1.5 pl-1">
     <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
     <div className="h-1 w-3/5 rounded-[var(--radius-xs)] bg-muted-foreground/14" />
    </div>
    <div className="flex items-center gap-1.5 pl-1">
     <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
     <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-muted-foreground/12" />
    </div>
    <div className="flex items-center gap-1.5 pl-1">
     <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
     <div className="h-1 w-1/2 rounded-[var(--radius-xs)] bg-muted-foreground/10" />
    </div>
   </div>
  );
 }
 return (
  <div className="space-y-1.5">
   {items.map((b, i) => (
    <MiniBlock
     key={i}
     type={b.type}
     text={blockText(b.content)}
     checked={(b.content as { checked?: boolean } | undefined)?.checked}
     wCls={MINI_WIDTHS[i % MINI_WIDTHS.length]!}
    />
   ))}
  </div>
 );
}

export function MiniBlock({
 type,
 text,
 checked,
 wCls,
}: {
 type: string;
 text: string;
 checked?: boolean;
 wCls: string;
}) {
 // A block with no extractable text (e.g. an empty paragraph) falls back
 // to a plain placeholder bar rather than rendering nothing.
 if (!text && type !== "divider") {
  return (
   <div
    className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/12`}
   />
  );
 }

 if (type === "divider") {
  return <div className="h-px bg-border/50" />;
 }

 if (type === "h1") {
  return (
   <div className="truncate text-[8px] font-bold leading-tight text-foreground/70">
    {text}
   </div>
  );
 }
 if (type === "h2") {
  return (
   <div className="truncate text-[7.5px] font-semibold leading-tight text-foreground/65">
    {text}
   </div>
  );
 }
 if (type === "h3") {
  return (
   <div className="truncate text-[7px] font-semibold leading-tight text-foreground/60">
    {text}
   </div>
  );
 }

 if (type === "bullet") {
  return (
   <div className="flex items-center gap-1.5 pl-2">
    <div className="size-1 shrink-0 rounded-full bg-primary/45" />
    <div className="truncate text-[7px] leading-tight text-muted-foreground/70">
     {text}
    </div>
   </div>
  );
 }
 if (type === "numbered") {
  return (
   <div className="flex items-center gap-1.5 pl-2">
    <div className="size-1 shrink-0 rounded-[var(--radius-xs)] bg-primary/40" />
    <div className="truncate text-[7px] leading-tight text-muted-foreground/70">
     {text}
    </div>
   </div>
  );
 }

 if (type === "todo") {
  return (
   <div className="flex items-center gap-1.5">
    <div
     className={`flex size-2 shrink-0 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary" : "border-border bg-background"}`}
    >
     {checked && (
      <Check className="text-primary-foreground" size={6} strokeWidth={3.5} />
     )}
    </div>
    <div
     className={`truncate text-[7px] leading-tight ${checked ? "text-muted-foreground/40 line-through" : "text-muted-foreground/70"}`}
    >
     {text}
    </div>
   </div>
  );
 }

 if (type === "toggle") {
  return (
   <div className="flex items-center gap-1.5">
    <ChevronRight className="shrink-0 text-primary/50" size={7} />
    <div className="truncate text-[7px] font-medium leading-tight text-muted-foreground/70">
     {text}
    </div>
   </div>
  );
 }

 if (type === "callout") {
  return (
   <div className="flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-warning/10 px-2 py-1">
    <div className="size-1.5 shrink-0 rounded-full bg-warning/60" />
    <div className="truncate text-[7px] leading-tight text-muted-foreground/70">
     {text}
    </div>
   </div>
  );
 }

 if (type === "quote") {
  return (
   <div className="flex gap-1.5 pl-0.5">
    <div className="w-0.5 shrink-0 self-stretch rounded-full bg-border" />
    <div className="truncate text-[7px] italic leading-tight text-muted-foreground/60">
     {text}
    </div>
   </div>
  );
 }

 if (type === "code") {
  return (
   <div className="truncate rounded-[var(--radius-xs)] bg-muted px-2 py-1 font-mono text-[7px] leading-tight text-muted-foreground/80">
    {text}
   </div>
  );
 }

 return (
  <div className="truncate text-[7px] leading-tight text-muted-foreground/60">
   {text}
  </div>
 );
}
