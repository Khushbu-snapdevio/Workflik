/**
 * Notification trigger stubs for Phase 11.
 * All functions are no-ops — Phase 13 fills the bodies.
 * Signatures are locked: call sites in comment API routes must not change when Phase 13 lands.
 *
 * Rule 11: all calls must happen inside the same DB transaction as the triggering event.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

export async function triggerCommentNotifications(
  _tx: AnyTx,
  _params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    authorId:    string;
    parentId:    string | null;
    content:     Record<string, unknown>;
  }
): Promise<void> {
  // Phase 13 implementation:
  // - If parentId = null: notify page creator (if not author)
  // - If parentId set: notify all prior thread participants (excluding author)
}

export async function triggerMentionNotifications(
  _tx: AnyTx,
  _params: {
    commentId:    string;
    pageId:       string;
    workspaceId:  string;
    authorId:     string;
    content:      Record<string, unknown>;
    skipUserIds?: string[];  // already-notified users (for edit case)
  }
): Promise<void> {
  // Phase 13 implementation:
  // - Extract mentioned userIds from content
  // - Subtract skipUserIds (already notified)
  // - INSERT notifications + enqueue SEND_NOTIFICATION_EMAIL job per recipient
  // - Never notify the author (Rule 11)
}

export async function triggerResolvedNotification(
  _tx: AnyTx,
  _params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    resolverId:  string;
  }
): Promise<void> {
  // Phase 13 implementation: notify all thread participants except the resolver
}

export async function triggerReopenedNotification(
  _tx: AnyTx,
  _params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    reopenerId:  string;
  }
): Promise<void> {
  // Phase 13 implementation: notify all thread participants except the reopener
}
