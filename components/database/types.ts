export type ViewType = "table" | "board" | "calendar" | "gallery";

export type PropertyType =
  | "text" | "number" | "select" | "multi_select" | "status" | "date"
  | "checkbox" | "url" | "email" | "phone" | "person" | "relation" | "rollup" | "formula";

export type RollupAggregation =
  | "count" | "count_values" | "sum" | "average" | "min" | "max" | "range" | "earliest" | "latest";

export interface DbView {
  id: string;
  databaseId: string;
  name: string;
  type: ViewType;
  groupByPropertyId: string | null;
  calendarPropertyId: string | null;
  filters: FilterRule[];
  sorts: SortRule[];
  filterLogic: "and" | "or";
  hiddenPropertyIds: string[];
  cardDisplayProps: string[];
  galleryCardSize: "small" | "medium" | "large" | null;
  entryOpenMode: "side_panel" | "full_page";
  orderIndex: number;
  boardSettings?: {
    hiddenGroupOptionIds?: string[];
    hiddenStatusGroupKeys?: StatusGroupKey[];
    hideAggregation?: boolean;
    sortDirection?: "manual" | "asc" | "desc";
    hideEmptyGroups?: boolean;
    colorColumns?: boolean;
    statusBy?: "group" | "option";
    pinnedGroupOptionIds?: string[];
    pinnedStatusGroupKeys?: StatusGroupKey[];
  };
  propertyOverrides: ViewPropertyOverrides;
  propertyOrder: string[];
}

export type StatusGroupKey = "todo" | "in_progress" | "complete";

/** Per-view copy of settings that otherwise live globally on a property's own
 *  config — lets e.g. Board show Status as a checkbox while Table keeps it a
 *  badge, without touching the property itself. Absent per-view (or absent
 *  entirely, for views created before this existed) falls back to the
 *  property's own global `config` value — see view-property-resolver.ts. */
export interface ViewPropertyOverride {
  displayAs?: "select" | "checkbox";
  wrapContent?: boolean;
  /** Table only — ignored by Board/Calendar/Gallery, which show cards, not columns. */
  width?: number;
}

export type ViewPropertyOverrides = Record<string, ViewPropertyOverride>;

export interface SelectOption {
  id: string;
  name: string;
  color: string;
  group?: StatusGroupKey;
}

export interface DbPropertyConfig {
  options?: SelectOption[];
  format?: string;
  relatedDatabaseId?: string;
  includeTime?: boolean;
  groupedByStatus?: boolean;
  wrapContent?: boolean;
  displayAs?: "select" | "checkbox";
  /** Custom property icon, same format as page icons (emoji, or JSON for a lucide icon / uploaded image). */
  icon?: string;
  /** Calendar/Gallery card display, Status-only — everything else is never
   *  shown on those cards regardless of this flag. Off by default: a new
   *  entry's card shows just its title until explicitly enabled here. */
  showOnCard?: boolean;
  /** Rollup only — which of THIS database's own Relation properties to
   *  aggregate through. */
  relationPropertyId?: string;
  /** Rollup only — which property on the related database to aggregate. */
  targetPropertyId?: string;
  /** Rollup only. */
  aggregation?: RollupAggregation;
  /** Formula only — the raw expression text (see lib/formula/). */
  expression?: string;
}

export interface DbProperty {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  config: DbPropertyConfig;
  defaultValue: unknown;
  isHidden: boolean;
  isSystem: boolean;
  isBackRelation: boolean;
  orderIndex: number;
}

export interface DbEntry {
  id: string;
  shortId: string;
  title: string | null;
  icon: string | null;
  coverUrl: string | null;
  databaseId: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  /** Open (unresolved) top-level comment count — undefined on entries created
   *  client-side before their first real fetch (createEntry/duplicateEntry). */
  commentCount?: number;
}

export interface DbPropertyValue {
  id: string;
  entryId: string;
  propertyId: string;
  value: unknown;
}

export interface FilterRule {
  propertyId: string;
  operator: string;
  value: unknown;
}

export interface SortRule {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: "admin" | "editor" | "viewer";
  status: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

export interface SharedViewProps {
  databaseId: string;
  workspaceId: string;
  workspaceSlug: string;
  entries: DbEntry[];
  properties: DbProperty[];
  valueMap: Map<string, Map<string, unknown>>;
  activeView: DbView | null;
  isEditor: boolean;
  onUpdateValue: (entryId: string, propId: string, value: unknown) => Promise<void>;
  onUpdateTitle: (entryId: string, title: string) => Promise<void>;
  onCreateEntry: (defaultValues?: Record<string, unknown>) => Promise<DbEntry | undefined>;
  onAddProperty: (name: string, type: string, config?: DbPropertyConfig, twoWay?: boolean) => Promise<DbProperty | undefined>;
  onUpdateProperty: (propId: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteProperty: (propId: string) => Promise<void>;
  onUpdateView: (patch: Record<string, unknown>) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onDuplicateEntry?: (entryId: string) => Promise<void>;
  onOpenEntry?: (entry: DbEntry) => void;
  onUpdateEntryIcon?: (entryId: string, icon: string) => Promise<void>;
  selectedEntryIds: Set<string>;
  onSelectEntry: (entryId: string, selected: boolean) => void;
}
