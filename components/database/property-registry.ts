// Property Registry — one entry per type. Never scatter switch(type) across the codebase.
// Each entry defines: icon, label, empty value, display formatter, cell editor component name.

export type PropertyType =
  | "text" | "number" | "select" | "multi_select" | "date"
  | "checkbox" | "url" | "email" | "phone" | "person" | "relation";

export interface PropertyDefinition {
  type:        PropertyType;
  label:       string;
  icon:        string;       // emoji or symbol shown in header
  emptyValue:  unknown;      // default JSONB value when a cell is first touched
  sortable:    boolean;
  filterable:  boolean;
}

export const PROPERTY_REGISTRY: Record<PropertyType, PropertyDefinition> = {
  text: {
    type:       "text",
    label:      "Text",
    icon:       "T",
    emptyValue: { text: "" },
    sortable:   true,
    filterable: true,
  },
  number: {
    type:       "number",
    label:      "Number",
    icon:       "#",
    emptyValue: { number: null },
    sortable:   true,
    filterable: true,
  },
  select: {
    type:       "select",
    label:      "Select",
    icon:       "◉",
    emptyValue: { optionId: null },
    sortable:   true,
    filterable: true,
  },
  multi_select: {
    type:       "multi_select",
    label:      "Multi-select",
    icon:       "⊕",
    emptyValue: { optionIds: [] },
    sortable:   false,
    filterable: true,
  },
  date: {
    type:       "date",
    label:      "Date",
    icon:       "📅",
    emptyValue: { date: null },
    sortable:   true,
    filterable: true,
  },
  checkbox: {
    type:       "checkbox",
    label:      "Checkbox",
    icon:       "☑",
    emptyValue: { checked: false },
    sortable:   true,
    filterable: true,
  },
  url: {
    type:       "url",
    label:      "URL",
    icon:       "🔗",
    emptyValue: { url: "" },
    sortable:   false,
    filterable: true,
  },
  email: {
    type:       "email",
    label:      "Email",
    icon:       "✉",
    emptyValue: { email: "" },
    sortable:   false,
    filterable: true,
  },
  phone: {
    type:       "phone",
    label:      "Phone",
    icon:       "☎",
    emptyValue: { phone: "" },
    sortable:   false,
    filterable: true,
  },
  person: {
    type:       "person",
    label:      "Person",
    icon:       "👤",
    emptyValue: { userIds: [] },
    sortable:   false,
    filterable: true,
  },
  relation: {
    type:       "relation",
    label:      "Relation",
    icon:       "↗",
    emptyValue: { entryIds: [] },
    sortable:   false,
    filterable: true,
  },
};

export const PROPERTY_TYPES = Object.values(PROPERTY_REGISTRY);

// ── Select / Multi-select option colors ──────────────────────────────────────
export const OPTION_COLORS = [
  { id: "gray",   bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400"   },
  { id: "red",    bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-400"    },
  { id: "orange", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  { id: "yellow", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  { id: "green",  bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-400"  },
  { id: "teal",   bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-400"   },
  { id: "blue",   bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400"   },
  { id: "purple", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
  { id: "pink",   bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-400"   },
] as const;

export type OptionColorId = (typeof OPTION_COLORS)[number]["id"];

export function getOptionColor(colorId: string | undefined) {
  return OPTION_COLORS.find((c) => c.id === colorId) ?? OPTION_COLORS[0];
}

// ── Number format helpers ─────────────────────────────────────────────────────
export type NumberFormat = "number" | "currency_usd" | "currency_eur" | "percent" | "scientific";

export function formatNumber(value: number | null | undefined, format: NumberFormat = "number"): string {
  if (value == null) return "";
  switch (format) {
    case "currency_usd": return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    case "currency_eur": return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
    case "percent":      return `${value}%`;
    case "scientific":   return value.toExponential(2);
    default:             return new Intl.NumberFormat().format(value);
  }
}

// ── Date format helpers ───────────────────────────────────────────────────────
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
