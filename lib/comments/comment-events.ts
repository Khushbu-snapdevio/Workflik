"use client";

// Cross-component notification for "a comment changed on this page" — lets the
// header Comments button (badge + sidebar panel) and the in-editor block
// gutter refresh live instead of waiting for their next mount/poll, without
// prop-drilling through the editor, comment cards, and cell popovers that can
// all mutate comments independently.

const COMMENTS_CHANGED_EVENT = "workflik:comments-changed";

export function emitCommentsChanged(pageId: string) {
  window.dispatchEvent(
    new CustomEvent(COMMENTS_CHANGED_EVENT, { detail: { pageId } })
  );
}

export function onCommentsChanged(pageId: string, callback: () => void): () => void {
  function handler(e: Event) {
    const detail = (e as CustomEvent<{ pageId: string }>).detail;
    if (detail?.pageId === pageId) callback();
  }
  window.addEventListener(COMMENTS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, handler);
}
