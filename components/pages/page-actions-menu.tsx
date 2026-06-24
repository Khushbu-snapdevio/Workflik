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

interface PageActionsMenuProps {
 pageId:    string;
 isLocked:   boolean;
 isDeleted:   boolean;
 workspaceSlug: string;
 workspaceId:  string;
 pageShortId:  string;
 pageTitle?:  string;
 pageKind?:   string;
}

const menuItemClass =
 "flex w-full items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent cursor-pointer";

export function PageActionsMenu({
 pageId,
 isLocked,
 isDeleted,
 workspaceSlug,
 workspaceId,
 pageShortId,
 pageTitle,
 pageKind,
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
  if (pageKind === "database") {
   window.location.replace(`/app/${workspaceSlug}`);
   return;
  }

  setDeleting(false);
  setConfirmTrash(false);

  if (res?.ok) {
   const data = await res.json().catch(() => ({})) as { deleted?: string };
   if (data.deleted === "permanent") {
    window.location.replace(`/app/${workspaceSlug}`);
   } else {
    router.refresh();
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
    router.push(`/app/${workspaceSlug}/${data.shortId}`);
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
   setDropdownPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
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
    className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border/70 bg-background px-3 text-xs font-medium text-foreground/70 transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:opacity-50"
    aria-label="Page actions"
   >
    <DotsThreeIcon size={14} />
    More
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
           setHistoryAnchor({ top: r.bottom + 6, right: window.innerWidth - r.right });
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
        <p className="mb-1 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground">Export</p>
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
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
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
