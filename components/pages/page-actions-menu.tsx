"use client";

import {
 Copy as CopyIcon,
 ClipboardCopy as CopySimpleIcon,
 MoreHorizontal as DotsThreeIcon,
 Download as DownloadSimpleIcon,
 Eye as EyeIcon,
 EyeOff as EyeOffIcon,
 Lock as LockKeyIcon,
 Unlock as LockKeyOpenIcon,
 LayoutGrid as SquaresFourIcon,
 Trash2 as TrashIcon,
} from "lucide-react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SaveAsTemplateModal } from "@/components/templates/save-as-template-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePagePrivacy } from "@/components/pages/page-privacy-context";

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
 /** Nearest other top-level item (previous, or next if this was first) —
  *  used as the fallback destination when this page has no parent. Ignored
  *  when `parentShortId` is set. */
 rootFallbackShortId?: string | null;
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
 "flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors data-focus:bg-accent cursor-pointer";

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
 rootFallbackShortId,
 onDeleted,
 onDuplicated,
 iconOnly,
}: PageActionsMenuProps) {
 const router = useRouter();
 const { isPrivate, setIsPrivate } = usePagePrivacy();
 const [loading, setLoading]       = useState<string | null>(null);
 const [confirmTrash, setConfirmTrash]  = useState(false);
 const [deleting, setDeleting]      = useState(false);
 const [saveAsTemplate, setSaveAsTemplate] = useState(false);

 async function run(action: string, fn: () => Promise<void>) {
  setLoading(action);
  try {
   await fn();
  } finally {
   setLoading(null);
  }
 }

 function handleDelete() {
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

  // Same destination rule for soft-delete or permanent delete: parent, else
  // nearest top-level sibling, else workspace home.
  const fallbackShortId = parentShortId ?? rootFallbackShortId ?? null;

  // Databases must navigate away — refreshing the current (now-deleted) URL 404s.
  // Skipped when onDeleted is provided (list context, no "current page" to leave).
  if (pageKind === "database" && !onDeleted) {
   window.location.replace(fallbackShortId ? `/app/${workspaceSlug}/${fallbackShortId}` : `/app/${workspaceSlug}`);
   return;
  }

  setDeleting(false);
  setConfirmTrash(false);

  if (res?.ok) {
   if (onDeleted) {
    onDeleted();
    return;
   }
   window.location.replace(fallbackShortId ? `/app/${workspaceSlug}/${fallbackShortId}` : `/app/${workspaceSlug}`);
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

 async function handleTogglePrivate() {
  await run("toggle-private", async () => {
   const next = !isPrivate;
   await fetch(`/api/pages/${pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body:  JSON.stringify({ isPrivate: next }),
   });
   setIsPrivate(next);
   // router.refresh() alone won't move the page in the sidebar's Private section
   // (its tree is useState seeded from props); dispatch to avoid a ~5s SSE lag.
   window.dispatchEvent(new CustomEvent("pages:refresh"));
   router.refresh();
  });
 }

 async function handleCopyLink() {
  const url = `${window.location.origin}/app/${workspaceSlug}/${pageShortId}`;
  await navigator.clipboard.writeText(url).catch(() => {});
 }

 async function handleExport(format: "markdown" | "html") {
  await run(`export-${format}`, async () => {
   const res = await fetch(`/api/pages/${pageId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
   });
   if (!res.ok) {
    toast.error(`Couldn't export as ${format} — please try again.`);
    return;
   }

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

 return (
  <>
   <Menu>
    <MenuButton
     type="button"
     disabled={loading !== null}
     aria-label="Page actions"
     className={
      iconOnly
       ? "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50 data-open:bg-accent data-open:text-foreground"
       : "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50 data-open:bg-accent data-open:text-foreground"
     }
    >
     <DotsThreeIcon size={14} />
     {!iconOnly && "More"}
    </MenuButton>

    <MenuItems
     anchor={{ to: "bottom end", gap: 4 }}
     transition
     className="z-600 w-52 overflow-hidden rounded-md border border-border bg-popover py-1 transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95"
    >
     {!isDeleted && (
      <>
       <MenuItem>
        <button type="button" onClick={handleDuplicate} className={menuItemClass}>
         <CopySimpleIcon size={14} />
         Duplicate
        </button>
       </MenuItem>

       <MenuItem>
        <button type="button" onClick={handleLock} className={menuItemClass}>
         {isLocked ? <LockKeyOpenIcon size={14} /> : <LockKeyIcon size={14} />}
         {isLocked ? "Unlock page" : "Lock page"}
        </button>
       </MenuItem>

       <MenuItem>
        <button type="button" onClick={handleCopyLink} className={menuItemClass}>
         <CopyIcon size={14} />
         Copy link
        </button>
       </MenuItem>

       <MenuItem>
        <button type="button" onClick={handleTogglePrivate} className={menuItemClass}>
         {isPrivate ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
         {isPrivate ? "Make shared" : "Make private"}
        </button>
       </MenuItem>

       {pageKind !== "database" && (
        <MenuItem>
         <button
          type="button"
          onClick={() => setSaveAsTemplate(true)}
          className={menuItemClass}
         >
          <SquaresFourIcon size={14} />
          Save as Template
         </button>
        </MenuItem>
       )}

       <div className="mx-2 my-1 border-t border-border" />

       <div className="px-3 pb-0.5 pt-1">
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">Export</p>
       </div>
       {(["markdown", "html"] as const).map((fmt) => (
        <MenuItem key={fmt}>
         <button
          type="button"
          onClick={() => handleExport(fmt)}
          className={menuItemClass}
         >
          <DownloadSimpleIcon size={14} />
          {fmt === "markdown" ? "Markdown" : fmt.toUpperCase()}
         </button>
        </MenuItem>
       ))}

       <div className="mx-2 my-1 border-t border-border" />

       <MenuItem>
        <button
         type="button"
         onClick={handleDelete}
         className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive transition-colors data-focus:bg-destructive/5"
        >
         <TrashIcon size={14} />
         Move to Trash
        </button>
       </MenuItem>
      </>
     )}

     {isDeleted && (
      <MenuItem>
       <button
        type="button"
        onClick={handleRestore}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-success transition-colors data-focus:bg-success/10"
       >
        <TrashIcon size={14} />
        Restore from Trash
       </button>
      </MenuItem>
     )}
    </MenuItems>
   </Menu>

   {/* Delete confirmation dialog */}
   <ConfirmDialog
    open={confirmTrash}
    onOpenChange={setConfirmTrash}
    title="Move to Trash?"
    description={pageKind === "database"
     ? "This database and all its entries will be moved to Trash and permanently deleted after 30 days."
     : "This page will be moved to Trash and permanently deleted after 30 days."}
    confirmLabel="Move to Trash"
    confirmLoadingLabel="Moving…"
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
  </>
 );
}
