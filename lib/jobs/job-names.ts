export const JOB_NAMES = {
  EMAIL_OUTBOX_REAP:               "email.outbox-reap",
  EMAIL_SEND:                      "email.send",
  SCAFFOLD_HEALTHCHECK:            "scaffold.healthcheck",
  WORKSPACE_INVITE_SEND:           "workspace.invite-send",
  PAGE_AUTO_DELETE_EXPIRED_TRASH:  "page.auto-delete-expired-trash",
  PAGE_WARN_EXPIRING_TRASH:        "page.warn-expiring-trash",
  PAGE_AUTO_DELETE_EXPIRED_VERSIONS: "page.auto-delete-expired-versions",
  PAGE_EXPORT:                     "page.export",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export interface EmailSendPayload {
  outboxId: string;
}

export interface WorkspaceInviteSendPayload {
  memberId:      string;
  workspaceId:   string;
  invitedEmail:  string;
  inviterName:   string;
  workspaceName: string;
  inviteToken:   string;
}

export interface PageExportPayload {
  pageId:    string;
  userId:    string;
  format:    "markdown" | "html" | "pdf";
}

export type JobPayloads = {
  [JOB_NAMES.EMAIL_OUTBOX_REAP]:                    Record<string, never>;
  [JOB_NAMES.EMAIL_SEND]:                           EmailSendPayload;
  [JOB_NAMES.SCAFFOLD_HEALTHCHECK]:                 Record<string, never>;
  [JOB_NAMES.WORKSPACE_INVITE_SEND]:                WorkspaceInviteSendPayload;
  [JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_TRASH]:       Record<string, never>;
  [JOB_NAMES.PAGE_WARN_EXPIRING_TRASH]:             Record<string, never>;
  [JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_VERSIONS]:    Record<string, never>;
  [JOB_NAMES.PAGE_EXPORT]:                          PageExportPayload;
};
