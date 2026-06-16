import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { templateCategory, templateStatus, updatedAt } from "./types";
import { users } from "./auth";
import { workspaces } from "./workspace";

export const templates = pgTable("templates", {
  id:           uuid("id").primaryKey().defaultRandom(),
  workspaceId:  uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  description:  text("description"),
  category:     templateCategory("category").notNull(),
  isBuiltIn:    boolean("is_built_in").notNull().default(false),
  status:       templateStatus("status").notNull().default("published"),
  createdBy:    uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  pageSnapshot: jsonb("page_snapshot").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    updatedAt(),
}, (t) => [index("templates_workspace_idx").on(t.workspaceId)]);

export type Template    = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
