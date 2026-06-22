import { customType, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const workspaceRole = pgEnum("workspace_role", ["admin", "editor", "viewer"]);
export const memberStatus = pgEnum("member_status", ["active", "invited", "expired"]);
export const defaultPageAccess = pgEnum("default_page_access", ["private", "shared"]);

export const pageKind = pgEnum("page_kind", ["page", "database", "entry"]);
export const fontFamily = pgEnum("font_family", ["default", "serif", "mono"]);

export const blockType = pgEnum("block_type", [
  "paragraph", "h1", "h2", "h3", "bullet", "numbered", "toggle", "quote",
  "callout", "divider", "todo", "image", "video", "audio", "file",
  "toc", "table", "columns", "code", "equation", "linked_page",
  "database", "template_button",
]);

export const viewType = pgEnum("view_type", ["table", "board", "calendar", "gallery"]);
export const galleryCardSize = pgEnum("gallery_card_size", ["small", "medium", "large"]);
export const entryOpenMode = pgEnum("entry_open_mode", ["side_panel", "full_page"]);
export const filterLogicType = pgEnum("filter_logic_type", ["and", "or"]);

export const propertyType = pgEnum("property_type", [
  "text", "number", "select", "multi_select", "date",
  "checkbox", "url", "email", "phone", "person", "relation",
]);

export const accessLevel = pgEnum("access_level", ["full_access", "can_edit", "can_comment", "can_view"]);
export const publicAccessLevel = pgEnum("public_access_level", ["can_view", "can_comment"]);
export const guestAccessLevel = pgEnum("guest_access_level", ["can_view", "can_comment", "can_edit"]);

export const notificationType = pgEnum("notification_type", [
  "mention", "comment", "reply", "resolved", "reopened",
  "access_granted", "workspace_invite", "guest_accepted", "trash_warning",
  "page_update", "task_assigned",
]);
export const emailFrequency = pgEnum("email_frequency", ["realtime", "daily", "weekly", "off"]);
export const emailOutboxStatus = pgEnum("email_outbox_status", ["queued", "sending", "sent", "failed"]);
export const emailOutboxType = pgEnum("email_outbox_type", ["notification_email", "digest_email"]);

export const templateCategory = pgEnum("template_category", ["productivity", "project_mgmt", "marketing", "engineering", "sales"]);
export const templateStatus = pgEnum("template_status", ["draft", "published"]);

export const searchSourceType = pgEnum("search_source_type", ["page", "entry", "comment"]);
export const auditTargetType = pgEnum("audit_target_type", ["user", "workspace"]);

export const fileUploadKind = pgEnum("file_upload_kind", [
  "page_cover", "page_icon", "block_media", "user_avatar", "workspace_icon",
]);
