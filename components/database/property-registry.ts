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
// Using inline style values so colors apply immediately without Tailwind JIT compilation.
export const OPTION_COLORS = [
  { id: "gray",   bg: "#d4d4d8", text: "#3f3f46", dot: "#71717a" },
  { id: "red",    bg: "#fecaca", text: "#b91c1c", dot: "#f87171" },
  { id: "orange", bg: "#fed7aa", text: "#c2410c", dot: "#fb923c" },
  { id: "yellow", bg: "#fef08a", text: "#a16207", dot: "#facc15" },
  { id: "green",  bg: "#bbf7d0", text: "#15803d", dot: "#4ade80" },
  { id: "teal",   bg: "#99f6e4", text: "#0f766e", dot: "#2dd4bf" },
  { id: "blue",   bg: "#bae6fd", text: "#0369a1", dot: "#38bdf8" },
  { id: "purple", bg: "#ddd6fe", text: "#6d28d9", dot: "#a78bfa" },
  { id: "pink",   bg: "#fbcfe8", text: "#be185d", dot: "#f472b6" },
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
