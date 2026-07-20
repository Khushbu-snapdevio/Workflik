"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PageDraftContextValue {
  isDraft:    boolean;
  setIsDraft: (v: boolean) => void;
}

// Unlike PagePrivacyContext, this defaults to a safe no-op instead of
// throwing when unwrapped — the editor (components/editor/editor.tsx) is
// also rendered from contexts that never set up this provider (e.g.
// database entries in entry-side-panel.tsx, which are never drafts), and it
// shouldn't have to know or care which host it's in.
const NOOP_DRAFT_CONTEXT: PageDraftContextValue = { isDraft: false, setIsDraft: () => {} };
const PageDraftContext = createContext<PageDraftContextValue>(NOOP_DRAFT_CONTEXT);

// Single source of truth for a page's "isDraft" flag, shared between the
// title-adjacent status pill and the editor's save handlers — a promotion
// response (PATCH or blocks/batch) flips this so the pill disappears live,
// with no page reload.
export function PageDraftProvider({
  initialIsDraft, children,
}: {
  initialIsDraft: boolean;
  children:       ReactNode;
}) {
  const [isDraft, setIsDraft] = useState(initialIsDraft);
  return (
    <PageDraftContext.Provider value={{ isDraft, setIsDraft }}>
      {children}
    </PageDraftContext.Provider>
  );
}

export function usePageDraft() {
  return useContext(PageDraftContext);
}
