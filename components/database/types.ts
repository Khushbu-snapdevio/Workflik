export type ViewType = "table" | "board" | "calendar" | "gallery";

export type PropertyType =
  | "text" | "number" | "select" | "multi_select" | "date"
  | "checkbox" | "url" | "email" | "phone" | "person" | "relation";

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
}

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export interface DbPropertyConfig {
  options?: SelectOption[];
  format?: string;
  relatedDatabaseId?: string;
  includeTime?: boolean;
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
  onAddProperty: (name: string, type: string) => Promise<DbProperty | undefined>;
  onUpdateProperty: (propId: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteProperty: (propId: string) => Promise<void>;
  onUpdateView: (patch: Record<string, unknown>) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onOpenEntry?: (entry: DbEntry) => void;
  selectedEntryIds: Set<string>;
  onSelectEntry: (entryId: string, selected: boolean) => void;
}
