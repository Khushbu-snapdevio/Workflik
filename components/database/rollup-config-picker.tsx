"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowLeftRight, Check } from "lucide-react";
import { PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { PageIcon } from "@/components/pages/page-icon";
import { getClampedLeft, getClampedTop } from "@/lib/ui/clamp-to-viewport";
import type { DbProperty, RollupAggregation } from "@/components/database/types";

interface RollupConfigPickerProps {
  rect: DOMRect;
  /** This database's own properties — used to list its Relation properties
   *  (Rollup always aggregates THROUGH one of them) in step 1. */
  properties: DbProperty[];
  onBack: () => void;
  onClose: () => void;
  onPick: (config: { relationPropertyId: string; targetPropertyId: string; aggregation: RollupAggregation }) => void;
}

const NUMERIC_AGGS: { value: RollupAggregation; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "range", label: "Range" },
];
const DATE_AGGS: { value: RollupAggregation; label: string }[] = [
  { value: "earliest", label: "Earliest date" },
  { value: "latest", label: "Latest date" },
];
const BASE_AGGS: { value: RollupAggregation; label: string }[] = [
  { value: "count", label: "Count all" },
  { value: "count_values", label: "Count values" },
];

function aggregationsFor(targetType: string | undefined): { value: RollupAggregation; label: string }[] {
  if (targetType === "number") return [...BASE_AGGS, ...NUMERIC_AGGS];
  if (targetType === "date") return [...BASE_AGGS, ...DATE_AGGS];
  return BASE_AGGS;
}

// Steps: 1) which of this database's Relation properties to aggregate
// through, 2) which property on the related database to aggregate, 3) which
// aggregation function. Mirrors relation-database-picker.tsx's shape/pattern.
export function RollupConfigPicker({ rect, properties, onBack, onClose, onPick }: RollupConfigPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [relationProp, setRelationProp] = useState<DbProperty | null>(null);
  const [targetProps, setTargetProps] = useState<DbProperty[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetProp, setTargetProp] = useState<DbProperty | null>(null);

  const relationProps = properties.filter((p) => p.type === "relation");

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    if (!relationProp) return;
    const relatedDatabaseId = relationProp.config?.relatedDatabaseId;
    if (!relatedDatabaseId) { setTargetProps([]); return; }
    setLoadingTargets(true);
    fetch(`/api/databases/${relatedDatabaseId}/properties`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: DbProperty[]) => setTargetProps(Array.isArray(rows) ? rows.filter((p) => !p.isSystem && p.type !== "rollup") : []))
      .catch(() => setTargetProps([]))
      .finally(() => setLoadingTargets(false));
  }, [relationProp]);

  const width = 260;
  const step = targetProp ? 3 : relationProp ? 2 : 1;
  const height = step === 3 ? 260 : 320;

  if (typeof document === "undefined") return null;

  const backAction = step === 3 ? () => setTargetProp(null) : step === 2 ? () => setRelationProp(null) : onBack;
  const stepTitle = step === 3 ? "Choose aggregation" : step === 2 ? "Choose property to roll up" : "Choose a relation";

  return createPortal(
    <div
      ref={ref}
      data-edit-property-exempt
      style={{ position: "fixed", top: getClampedTop(rect, height), left: getClampedLeft(rect, width, { align: "end" }), zIndex: 500, width }}
      className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
    >
      <div className="flex items-center gap-1.5 border-b border-border/60 px-2.5 py-2">
        <button
          type="button"
          onClick={backAction}
          className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft size={13} />
        </button>
        <p className="text-xs font-semibold text-foreground/80">{stepTitle}</p>
      </div>

      {step === 1 && (
        <div className="max-h-72 overflow-y-auto p-1">
          {relationProps.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground/60">
              This database has no Relation properties yet. Create one first — Rollup always aggregates through a Relation.
            </p>
          )}
          {relationProps.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRelationProp(p)}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
            >
              <ArrowLeftRight size={13} className="shrink-0 text-muted-foreground/60" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="max-h-72 overflow-y-auto p-1">
          {loadingTargets && <p className="px-3 py-2.5 text-xs text-muted-foreground/60">Loading…</p>}
          {!loadingTargets && targetProps.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-muted-foreground/60">No properties to roll up on the related database.</p>
          )}
          {!loadingTargets && targetProps.map((p) => {
            const Icon = PROPERTY_TYPE_ICON[p.type as keyof typeof PROPERTY_TYPE_ICON] ?? ArrowLeftRight;
            const propConfig = (p.config ?? {}) as { icon?: string };
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setTargetProp(p)}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
              >
                {propConfig.icon ? <PageIcon icon={propConfig.icon} size={13} className="shrink-0" /> : <Icon size={13} className="shrink-0 text-muted-foreground/60" />}
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && relationProp && targetProp && (
        <div className="p-1">
          {aggregationsFor(targetProp.type).map((agg) => (
            <button
              key={agg.value}
              type="button"
              onClick={() => onPick({ relationPropertyId: relationProp.id, targetPropertyId: targetProp.id, aggregation: agg.value })}
              className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
            >
              {agg.label}
              <Check size={12} className="shrink-0 text-transparent" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
