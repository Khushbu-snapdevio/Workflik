"use client";

import {
 RotateCcw as ClockCounterClockwiseIcon,
 Copy as CopyIcon,
 ClipboardCopy as CopySimpleIcon,
 MoreHorizontal as DotsThreeIcon,
 Download as DownloadSimpleIcon,
 Lock as LockKeyIcon,
 Unlock as LockKeyOpenIcon,
 LayoutGrid as SquaresFourIcon,
 Trash2 as TrashIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SaveAsTemplateModal } from "@/components/templates/save-as-template-modal";
import { PageHistoryPanel } from "@/components/pages/page-history-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { getClampedTop } from "@/lib/ui/clamp-to-viewport";

const MENU_HEIGHT    = 360;
const HISTORY_HEIGHT = 460;

interface PageActionsMenuProps {
 pageId:    string;
 isLocked:   boolean;
 isDeleted:   boolean;
 workspaceSlug: string;
 workspaceId:  string;
 pageShortId:  string;
 pageTitle?:  string;
 pageKind?:   string;
 parentShortId?: string | null;
 /** Overrides the default "navigate away" behavior after a successful
  *  delete — pass this when the menu is used from a list/table row (e.g.
  *  Library) rather than on the page currently being viewed, so deleting a
  *  row doesn't yank the user out of the list they were managing. */
 onDeleted?: () => void;
 /** Same idea for duplicate — default behavior jumps to the new page, which
  *  only makes sense when the menu lives on the page being viewed. */
 onDuplicated?: (newShortId: string) => void;
 /** Renders the trigger as a bare "⋮" icon button with no "More" text label —
  *  for dense list/table rows (e.g. Library) where a labeled button is too
  *  wide and out of place next to other icon-only row affordances. */
 iconOnly?: boolean;
}

const menuItemClass =
 "flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer";

export function PageActionsMenu({
 pageId,
 isLocked,
 isDeleted,
 workspaceSlug,
 workspaceId,
 pageShortId,
 pageTitle,
 pageKind,
 parentShortId,
 onDeleted,
 onDuplicated,
 iconOnly,
}: PageActionsMenuProps) {
 const router = useRouter();
 const [open, setOpen]          = useState(false);
 const [loading, setLoading]       = useState<string | null>(null);
 const [confirmTrash, setConfirmTrash]  = useState(false);
 const [deleting, setDeleting]      = useState(false);
 const [saveAsTemplate, setSaveAsTemplate] = useState(false);
 const [historyAnchor, setHistoryAnchor] = useState<{ top: number; right: number } | null>(null);
 const buttonRef = useRef<HTMLButtonElement>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

 // Close when clicking outside the portal dropdown
 useEffect(() => {
  if (!open) return;
  function handleClickOutside(e: MouseEvent) {
   if (buttonRef.current?.contains(e.target as Node)) return;
   if (dropdownRef.current?.contains(e.target as Node)) return;
   setOpen(false);
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
 }, [open]);

 useScrollLockWhileOpen(open, (target) =>
  !!dropdownRef.current?.contains(target) || !!target.closest?.('[role="alertdialog"]'));

 async function run(action: string, fn: () => Promise<void>) {
  setLoading(action);
  setOpen(false);
  try {
   await fn();
  } finally {
   setLoading(null);
  }
 }

 function handleDelete() {
  setOpen(false);
  setConfirmTrash(true);
 }

 async function confirmDelete() {
  setDeleting(true);
  let res: Response | null = null;
  try {
   res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
  } catch (_) {
   // network error — treat as failed but still redirect for databases
  }

  // For databases: always navigate away — never call router.refresh() on the current
  // database URL after deletion (that re-renders the now-deleted page → 404).
  // Skipped when onDeleted is provided (list/table context — there's no
  // "current page" to redirect away from, the row just needs to disappear).
  if (pageKind === "database" && !onDeleted) {
   window.location.replace(`/app/${workspaceSlug}`);
   return;
  }

  setDeleting(false);
  setConfirmTrash(false);

  if (res?.ok) {
   if (onDeleted) {
    onDeleted();
    return;
   }
   const data = await res.json().catch(() => ({})) as { deleted?: string };
   if (data.deleted === "permanent") {
    window.location.replace(`/app/${workspaceSlug}`);
   } else {
    // This menu only appears on the page currently being viewed, so it's
    // always safe (and necessary) to navigate away once it's trashed — a
    // full navigation also picks up fresh sidebar state, since the sidebar
    // otherwise only refetches on a "pages:refresh" event it never gets here.
    window.location.replace(
     parentShortId ? `/app/${workspaceSlug}/${parentShortId}` : `/app/${workspaceSlug}`
    );
   }
  } else {
   router.refresh();
  }
 }

 async function handleRestore() {
  await run("restore", async () => {
   const res = await fetch(`/api/pages/${pageId}/restore`, { method: "POST" });
   if (res.ok) router.refresh();
  });
 }

 async function handleDuplicate() {
  await run("duplicate", async () => {
   const res = await fetch(`/api/pages/${pageId}/duplicate`, { method: "POST" });
   if (res.ok) {
    const data = await res.json() as { shortId: string };
    window.dispatchEvent(new CustomEvent("pages:refresh"));
    if (onDuplicated) {
     onDuplicated(data.shortId);
    } else {
     router.push(`/app/${workspaceSlug}/${data.shortId}`);
    }
   }
  });
 }

 async function handleLock() {
  await run("lock", async () => {
   await fetch(`/api/pages/${pageId}/lock`, { method: "POST" });
   router.refresh();
  });
 }

 async function handleCopyLink() {
  const url = `${window.location.origin}/app/${workspaceSlug}/${pageShortId}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  setOpen(false);
 }

 async function handleExport(format: "markdown" | "html" | "pdf") {
  await run(`export-${format}`, async () => {
   const res = await fetch(`/api/pages/${pageId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
   });

   if (res.status === 501) {
    alert("PDF export is coming soon.");
    return;
   }
   if (!res.ok) return;

   const blob = await res.blob();
   const disposition = res.headers.get("Content-Disposition") ?? "";
   const match = disposition.match(/filename="([^"]+)"/);
   const filename = match?.[1] ?? `page.${format}`;

   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   a.click();
   URL.revokeObjectURL(url);
  });
 }

 function openMenu() {
  if (buttonRef.current) {
   const r = buttonRef.current.getBoundingClientRect();
   setDropdownPos({ top: getClampedTop(r, MENU_HEIGHT), right: window.innerWidth - r.right });
  }
  setOpen(true);
 }

 return (
  <>
   <button
    ref={buttonRef}
    type="button"
    onClick={() => (open ? setOpen(false) : openMenu())}
    disabled={loading !== null}
    className={
     iconOnly
      ? "flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50"
      : "flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50"
    }
    aria-label="Page actions"
   >
    <DotsThreeIcon size={14} />
    {!iconOnly && "More"}
   </button>

   {/* Dropdown — rendered in document.body so it escapes overflow:hidden containers */}
   {open && dropdownPos && typeof document !== "undefined" && createPortal(
    <div
     ref={dropdownRef}
     className="fixed z-[200] w-52 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover py-1"
     style={{ top: dropdownPos.top, right: dropdownPos.right }}
    >
     {!isDeleted && (
      <>
       <button type="button" onClick={handleDuplicate} className={menuItemClass}>
        <CopySimpleIcon size={14} />
        Duplicate
       </button>

       <button type="button" onClick={handleLock} className={menuItemClass}>
        {isLocked ? <LockKeyOpenIcon size={14} /> : <LockKeyIcon size={14} />}
        {isLocked ? "Unlock page" : "Lock page"}
       </button>

       <button type="button" onClick={handleCopyLink} className={menuItemClass}>
        <CopyIcon size={14} />
        Copy link
       </button>

       {pageKind !== "database" && (
        <button
         type="button"
         onClick={() => { setOpen(false); setSaveAsTemplate(true); }}
         className={menuItemClass}
        >
         <SquaresFourIcon size={14} />
         Save as Template
        </button>
       )}

       {pageKind !== "database" && (
        <button
         type="button"
         onClick={() => {
          setOpen(false);
          if (buttonRef.current) {
           const r = buttonRef.current.getBoundingClientRect();
           setHistoryAnchor({ top: getClampedTop(r, HISTORY_HEIGHT), right: window.innerWidth - r.right });
          }
         }}
         className={menuItemClass}
        >
         <ClockCounterClockwiseIcon size={14} />
         Page history
        </button>
       )}

       <div className="mx-2 my-1 border-t border-border" />

       <div className="px-3 pb-0.5 pt-1">
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">Export</p>
       </div>
       {(["markdown", "html", "pdf"] as const).map((fmt) => (
        <button
         key={fmt}
         type="button"
         onClick={() => handleExport(fmt)}
         className={menuItemClass}
        >
         <DownloadSimpleIcon size={14} />
         {fmt === "markdown" ? "Markdown" : fmt.toUpperCase()}
        </button>
       ))}

       <div className="mx-2 my-1 border-t border-border" />

       <button
        type="button"
        onClick={handleDelete}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 hover:text-destructive"
       >
        <TrashIcon size={14} />
        {pageKind === "database" ? "Delete database" : "Move to Trash"}
       </button>
      </>
     )}

     {isDeleted && (
      <button
       type="button"
       onClick={handleRestore}
       className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-success transition-colors hover:bg-success/10"
      >
       <TrashIcon size={14} />
       Restore from Trash
      </button>
     )}
    </div>,
    document.body,
   )}

   {/* Delete confirmation dialog */}
   <ConfirmDialog
    open={confirmTrash}
    onOpenChange={setConfirmTrash}
    title={pageKind === "database" ? "Delete database forever?" : "Move to Trash?"}
    description={pageKind === "database"
     ? "This database and all its entries, properties, and views will be permanently deleted. This action cannot be undone."
     : "This page will be moved to Trash and permanently deleted after 30 days."}
    confirmLabel={pageKind === "database" ? "Delete forever" : "Move to Trash"}
    confirmLoadingLabel={pageKind === "database" ? "Deleting…" : "Moving…"}
    loading={deleting}
    onConfirm={confirmDelete}
   />

   {saveAsTemplate && typeof document !== "undefined" && (
    <SaveAsTemplateModal
     pageId={pageId}
     pageTitle={pageTitle ?? ""}
     workspaceId={workspaceId}
     onClose={() => setSaveAsTemplate(false)}
    />
   )}

   <PageHistoryPanel
    pageId={pageId}
    open={historyAnchor !== null}
    anchorPos={historyAnchor}
    onClose={() => setHistoryAnchor(null)}
   />
  </>
 );
}
