"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, MessageCircle, Smile } from "lucide-react";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import { PageEditor } from "@/components/editor/editor";
import { useUpload } from "@/lib/storage/use-upload";
import { EntryPropertiesPanel } from "@/components/database/entry-properties-panel";
import { PageCommentsSection } from "@/components/pages/page-comments-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveStatusIndicator } from "@/components/ui/save-status";
import { onCommentsChanged } from "@/lib/comments/comment-events";
import { usePageDraft } from "@/components/pages/page-draft-context";

interface PageClientProps {
 pageId:        string;
 shortId:       string;
 initialTitle:     string;
 initialIcon:     string | null;
 initialCoverUrl:   string | null;
 initialCoverPosition: number;
 isLocked:       boolean;
 isDeleted:      boolean;
 isEditor:       boolean;
 workspaceSlug:    string;
 workspaceId:     string;
 fontFamily:      "default" | "serif" | "mono";
 isSmallText:     boolean;
 isFullWidth:     boolean;
 statusBanner:     React.ReactNode;
 databaseId?:     string | null;
 currentUserId?:    string;
 isAdmin?:       boolean;
}

export function PageClient({
 pageId,
 shortId,
 initialTitle,
 initialIcon,
 initialCoverUrl,
 initialCoverPosition,
 isLocked,
 isDeleted,
 isEditor,
 workspaceId,
 workspaceSlug,
 fontFamily,
 isSmallText,
 isFullWidth,
 statusBanner,
 databaseId,
 currentUserId = "",
 isAdmin = false,
}: PageClientProps) {
 const router = useRouter();
 const [coverUrl, setCoverUrl]   = useState<string | null>(initialCoverUrl);
 const [coverPos]         = useState<number>(initialCoverPosition);
 const [removeCoverConfirm, setRemoveCoverConfirm] = useState(false);
 const [icon, setIcon]       = useState<string | null>(initialIcon);
 const [showPicker, setShowPicker] = useState(false);
 // Shared by both icon-trigger buttons below (never rendered at the same
 // time) — passed to IconPicker so its outside-click-to-close doesn't treat
 // a second click on this same button as "outside," which would otherwise
 // close it and then immediately reopen it via the button's own toggle.
 const iconBtnRef = useRef<HTMLButtonElement>(null);
 const [saveState, setSaveState]  = useState<"idle" | "saving" | "saved">("idle");
 // Hidden by default, matching Notion — only revealed via "Add comment", or
 // automatically if the page already has an existing page-level thread (so
 // comments already there don't disappear behind an extra click on reload).
 const [showComments, setShowComments] = useState(false);
 const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

 const titleRef  = useRef<HTMLDivElement>(null);
 const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
 const didMount  = useRef(false);
 const coverInput = useRef<HTMLInputElement>(null);

 const editable = isEditor && !isLocked && !isDeleted;

 const { upload, uploading: coverUploading } = useUpload({
  kind: "page_cover",
  workspaceId,
  pageId,
 });

 const { setIsDraft } = usePageDraft();

 useEffect(() => {
  if (!didMount.current && titleRef.current) {
   titleRef.current.textContent = initialTitle || "";
   didMount.current = true;
  }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const saveTitle = useCallback(async (raw: string) => {
  const title = raw.trim() || "Untitled";
  setSaveState("saving");
  if (savedTimer.current) clearTimeout(savedTimer.current);
  try {
   const res = await fetch(`/api/pages/${pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
   });
   if (res.ok) {
    const updated = await res.json();
    if (updated.isDraft === false) setIsDraft(false);
   }
   document.title = `${title} | WORKFLIK`;
   setSaveState("saved");
   savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
   window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId, title } }));
   window.dispatchEvent(new CustomEvent("pages:refresh"));
   router.refresh();
  } catch {
   setSaveState("idle");
  }
 }, [pageId, router, setIsDraft]);

 const saveIcon = useCallback(async (emoji: string | null) => {
  setIcon(emoji);
  await fetch(`/api/pages/${pageId}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ icon: emoji }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId, icon: emoji } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }, [pageId, router]);

 const saveCover = useCallback(async (url: string | null) => {
  setCoverUrl(url);
  await fetch(`/api/pages/${pageId}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ coverUrl: url }),
  });
 }, [pageId]);

 // Only set when the section is opened by the user actually clicking "Add
 // comment" — never when it reveals itself because the page already has
 // threads (recheck/handleActiveCountChange below), which on load would
 // otherwise yank the caret out of the document and into the comment box.
 const [focusComposer, setFocusComposer] = useState(false);

 function revealComments() {
  setShowComments(true);
  setFocusComposer(true);
  requestAnimationFrame(() => {
   document.getElementById("page-comments-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
 }

 // Instant, no-refetch path for the common case (resolving/reopening while
 // already viewing the section) — CommentCard reports this synchronously
 // from its own optimistic update. The recheck() effect below still exists
 // as an eventual-consistency fallback (e.g. initial load), but this is what
 // avoids waiting on a second, independent fetch before hiding the section.
 function handleActiveCountChange(count: number) {
  setShowComments(count > 0);
 }

 // Keep the section visible for as long as an active (unresolved,
 // undeleted) page-level thread exists — and hide it again the moment the
 // last one is resolved or deleted, same as Notion. Re-checks on every
 // comment mutation anywhere on the page (resolve/reopen/delete/create),
 // not just once on mount.
 useEffect(() => {
  function recheck() {
   fetch(`/api/pages/${pageId}/comments`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
     const threads = (data?.comments ?? []) as Array<{ blockId: string | null; propertyId: string | null; deletedAt: string | null; isResolved: boolean }>;
     const hasActive = threads.some((t) => !t.blockId && !t.propertyId && !t.deletedAt && !t.isResolved);
     setShowComments(hasActive);
    })
    .catch(() => {});
  }
  recheck();
  return onCommentsChanged(pageId, recheck);
 }, [pageId]);

 // The topbar "Comments" sheet (PageCommentButton) jumps here for page-level
 // threads — it can't just scrollIntoView a section that isn't rendered yet.
 useEffect(() => {
  function onJump(e: Event) {
   const detail = (e as CustomEvent<{ pageId: string }>).detail;
   if (detail?.pageId === pageId) revealComments();
  }
  window.addEventListener("workflik:show-page-comments", onJump);
  return () => window.removeEventListener("workflik:show-page-comments", onJump);
 }, [pageId]);

 async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = "";
  const result = await upload(file);
  if (result) saveCover(result.fileUrl);
 }

 const contentCls = isFullWidth ? "max-w-full px-4 sm:px-8 lg:px-12" : "max-w-[780px] px-4 sm:px-8 lg:px-14";

 return (
  <div id="page-scroll-container" className="flex-1 overflow-y-auto">

   {/* ── Cover ── */}
   {coverUrl && (
    <div className="group/cover relative h-[260px] w-full shrink-0 overflow-hidden bg-muted">
     <div
      className="absolute inset-0 bg-cover bg-center transition-[background-position] duration-300"
      style={{
       backgroundImage: `url(${coverUrl})`,
       backgroundPosition: `center ${coverPos * 100}%`,
      }}
     />
     {editable && (
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover/cover:opacity-100">
       <button
        type="button"
        onClick={() => coverInput.current?.click()}
        disabled={coverUploading}
        className="rounded-[var(--radius-sm)] border border-border bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-card disabled:opacity-50"
       >
        {coverUploading ? "Uploading…" : "Change cover"}
       </button>
       <button
        type="button"
        onClick={() => setRemoveCoverConfirm(true)}
        className="rounded-[var(--radius-sm)] border border-border bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-card"
       >
        Remove
       </button>
      </div>
     )}
    </div>
   )}

   <ConfirmDialog
    open={removeCoverConfirm}
    onOpenChange={setRemoveCoverConfirm}
    title="Remove cover image?"
    description="This removes the cover photo from this page. You can add a new one anytime."
    confirmLabel="Remove"
    onConfirm={() => saveCover(null)}
   />

   <input
    ref={coverInput}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    className="hidden"
    onChange={onCoverFile}
   />

   {/* ── Page content ── */}
   <div
    className={`group/page mx-auto pb-32 ${contentCls}`}
    style={{ paddingTop: coverUrl ? (icon ? 0 : "2rem") : "4rem" }}
   >

    {/* Icon — center of icon sits on cover bottom edge, exactly like Notion */}
    {icon && (
     <div
      style={{ marginTop: coverUrl ? "-2.5rem" : 0 }}
      className={`relative mb-2 ${showPicker ? "z-[600]" : "z-10"}`}
     >
      <button
       ref={iconBtnRef}
       type="button"
       disabled={!editable}
       onClick={() => editable && setShowPicker((p) => !p)}
       aria-label="Change icon"
       className="inline-flex cursor-pointer rounded-[var(--radius-sm)] p-1 leading-none outline-none transition-colors duration-150 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:cursor-default"
      >
       <PageIcon icon={icon} size={72} />
      </button>
      {showPicker && (
       <IconPicker
        onSelect={(v) => { setShowPicker(false); saveIcon(v); }}
        onIconPreview={(v) => saveIcon(v)}
        onRemove={() => { setShowPicker(false); saveIcon(null); }}
        onClose={() => setShowPicker(false)}
        pageId={pageId}
        workspaceId={workspaceId}
        triggerRef={iconBtnRef}
       />
      )}
     </div>
    )}

    {/* Page toolbar — Add cover / Add icon / Add comment */}
    {editable && (
     <div className={`flex items-center gap-1 transition-opacity duration-150 ${showPicker ? "opacity-100" : "opacity-0 group-hover/page:opacity-100"} ${icon ? "mb-3" : "mb-4"}`}>
      {!coverUrl && (
       <button
        type="button"
        onClick={() => coverInput.current?.click()}
        disabled={coverUploading}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-40"
       >
        <ImageIcon size={13} />
        {coverUploading ? "Uploading…" : "Add cover"}
       </button>
      )}
      {!icon && (
       <div className="relative">
        <button
         ref={iconBtnRef}
         type="button"
         onClick={() => setShowPicker((p) => !p)}
         className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
         <Smile size={13} />
         Add icon
        </button>
        {showPicker && (
         <IconPicker
          onSelect={(v) => { setShowPicker(false); saveIcon(v); }}
          onIconPreview={(v) => saveIcon(v)}
          onClose={() => setShowPicker(false)}
          pageId={pageId}
          workspaceId={workspaceId}
          triggerRef={iconBtnRef}
         />
        )}
       </div>
      )}
      {!showComments && (
       <button
        type="button"
        onClick={revealComments}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
       >
        <MessageCircle size={13} />
        Add comment
       </button>
      )}
     </div>
    )}

    {statusBanner}

    {/* Title + save indicator */}
    <div className="relative mt-1">
     <div
      ref={titleRef}
      contentEditable={editable}
      suppressContentEditableWarning
      onInput={(e) => {
       const text = e.currentTarget.textContent ?? "";
       // Breadcrumbs/mentions update on every keystroke, not just once the
       // debounced save (below) actually PATCHes the server — matches Notion,
       // where the crumb visibly follows what you're typing in real time.
       window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId, title: text } }));
       if (saveTimeout.current) clearTimeout(saveTimeout.current);
       saveTimeout.current = setTimeout(() => saveTitle(text), 800);
      }}
      onKeyDown={(e) => {
       if (e.key === "Enter") { e.preventDefault(); titleRef.current?.blur(); }
      }}
      onBlur={(e) => {
       if (saveTimeout.current) clearTimeout(saveTimeout.current);
       saveTitle(e.currentTarget.textContent ?? "");
      }}
      data-placeholder="Untitled"
      className={[
       "w-full break-words text-[2.5rem] font-bold leading-[1.2] tracking-tight text-foreground outline-none",
       "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
       editable ? "cursor-text" : "cursor-default select-text",
      ].join(" ")}
     />
     <div className="absolute -top-7 right-0">
      <SaveStatusIndicator state={saveState} />
     </div>
    </div>

    {/* Database entry properties — shown above comments for entries opened
        in full page (Priority/Category/Votes etc. before the comment box),
        unlike a plain page's comment section, which has no properties to
        lead with. */}
    {databaseId && (
     <EntryPropertiesPanel
      entryId={pageId}
      entryShortId={shortId}
      databaseId={databaseId}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      isEditor={isEditor && !isLocked && !isDeleted}
     />
    )}

    {/* Page-level comments — Notion-style, shown right below the title (and
        below any entry properties) and above the page's own content. Hidden
        until "Add comment" is used (or already has a thread), rather than
        always showing an empty section. */}
    {showComments && (
     <div className="mt-4">
      <PageCommentsSection
       autoFocusComposer={focusComposer}
       currentUserId={currentUserId}
       isAdmin={isAdmin}
       onActiveCountChange={handleActiveCountChange}
       onDismiss={() => { setShowComments(false); setFocusComposer(false); }}
       pageId={pageId}
       workspaceId={workspaceId}
      />
     </div>
    )}

    {/* Editor */}
    <div className="mt-3">
     <PageEditor
      pageId={pageId}
      isLocked={isLocked}
      isDeleted={isDeleted}
      isEditor={isEditor}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      fontFamily={fontFamily}
      isSmallText={isSmallText}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
     />
    </div>

   </div>
  </div>
 );
}
