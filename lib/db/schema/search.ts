import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { searchSourceType, tsvector, updatedAt } from "./types";
import { workspaces } from "./workspace";
import { pages } from "./pages";

export const searchIndex = pgTable("search_index", {
  id:           uuid("id").primaryKey().defaultRandom(),
  workspaceId:  uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceType:   searchSourceType("source_type").notNull(),
  sourceId:     uuid("source_id").notNull(),
  title:        text("title"),
  searchVector: tsvector("search_vector"),
  pageId:       uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  updatedAt:    updatedAt(),
}, (t) => [
  uniqueIndex("search_index_source_idx").on(t.sourceType, t.sourceId),
  index("search_index_workspace_idx").on(t.workspaceId),
  index("search_index_vector_idx").using("gin", t.searchVector),
]);

export type SearchIndex = typeof searchIndex.$inferSelect;
