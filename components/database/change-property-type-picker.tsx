"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Type as TextT } from "lucide-react";
import { toast } from "sonner";
import { PROPERTY_REGISTRY, PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { RelationDatabasePicker } from "@/components/database/relation-database-picker";
import { RollupConfigPicker } from "@/components/database/rollup-config-picker";
import { FormulaConfigPicker } from "@/components/database/formula-config-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getClampedLeft, getClampedTop } from "@/lib/ui/clamp-to-viewport";
import type { DbProperty } from "@/components/database/types";

interface ChangePropertyTypePickerProps {
  rect: DOMRect;
  property: DbProperty;
  properties: DbProperty[];
  workspaceId: string;
  onBack: () => void;
  /** Dismiss without changing anything — clicking outside, backing out of a sub-picker. */
  onClose: () => void;
  /** The type change committed successfully. Separate from onClose because the parent
   *  panel's own state (options list, grouped-by-status, etc.) is derived once from the
   *  property's *old* type and won't reactively follow a changed type/config prop — the
   *  parent closes itself entirely on this, rather than trying to reconcile stale state. */
  onChanged: () => void;
  onUpdateProperty: (patch: Record<string, unknown>) => Promise<void>;
}

// Converting *to* one of these can't reinterpret whatever's already stored —
// relation/person need real references a bare value can't become, and
// formula/rollup/created_by are computed on every read and never consult
// property_values at all, so anything already stored would just go
// unreachable. Mirrors the server's own destructiveTypes in
// app/api/databases/[id]/properties/[propId]/route.ts — confirming here
// first (rather than round-tripping to find out) means the dialog can name
// the property up front instead of reacting to a 400.
const DESTRUCTIVE_TARGET_TYPES = new Set(["relation", "person", "formula", "rollup", "created_by"]);

// Reuses the exact type list + sub-picker pattern table-view.tsx's
// AddPropertyMenu uses for creating a new property — this is the same
// picker, aimed at PATCHing an existing property's type instead of adding a
// new one. Kept as its own component (rather than exported from table-view,
// which doesn't export AddPropertyMenu) since "change type" needs the
// destructive-confirm step creation never has to worry about.
export function ChangePropertyTypePicker({
  rect, property, properties, workspaceId, onBack, onClose, onChanged, onUpdateProperty,
}: ChangePropertyTypePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pickingRelation, setPickingRelation] = useState(false);
  const [pickingRollup, setPickingRollup] = useState(false);
  const [pickingFormula, setPickingFormula] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: string; config?: Record<string, unknown> } | null>(null);
  const [committing, setCommitting] = useState(false);

  const types = Object.values(PROPERTY_REGISTRY);
  const menuWidth = 240;
  const menuHeight = 320;

  async function commit(type: string, config?: Record<string, unknown>, confirmDestructive?: boolean) {
    setCommitting(true);
    try {
      await onUpdateProperty({ type, config: config ?? {}, ...(confirmDestructive ? { confirmDestructive: true } : {}) });
      onChanged();
    } catch {
      toast.error(`Couldn't change "${property.name}" to ${PROPERTY_REGISTRY[type as keyof typeof PROPERTY_REGISTRY]?.label ?? type}`);
    } finally {
      setCommitting(false);
    }
  }

  function pickType(type: string, config?: Record<string, unknown>) {
    if (type === property.type) { onClose(); return; }
    if (DESTRUCTIVE_TARGET_TYPES.has(type)) { setPendingChange({ type, config }); return; }
    commit(type, config);
  }

  if (pickingRelation) {
    return (
      <RelationDatabasePicker
        rect={rect}
        workspaceId={workspaceId}
        onBack={() => setPickingRelation(false)}
        onClose={onClose}
        onPick={(relatedDatabaseId, twoWay) => pickType("relation", { relatedDatabaseId, twoWay })}
      />
    );
  }

  if (pickingRollup) {
    return (
      <RollupConfigPicker
        rect={rect}
        properties={properties}
        onBack={() => setPickingRollup(false)}
        onClose={onClose}
        onPick={(config) => pickType("rollup", config)}
      />
    );
  }

  if (pickingFormula) {
    return (
      <FormulaConfigPicker
        rect={rect}
        databaseId={property.databaseId}
        properties={properties}
        onBack={() => setPickingFormula(false)}
        onClose={onClose}
        onPick={(expression) => pickType("formula", { expression })}
      />
    );
  }

  return (
    <>
      {createPortal(
        <div
          ref={ref}
          data-edit-property-exempt
          style={{
            position: "fixed",
            top: getClampedTop(rect, menuHeight),
            left: getClampedLeft(rect, menuWidth, { align: "end" }),
            zIndex: 500,
            width: menuWidth,
          }}
          className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
        >
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
            <button type="button" onClick={onBack} className="text-xs font-medium text-muted-foreground hover:text-foreground">←</button>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">Change type</p>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {types.map((def) => {
              const Icon = PROPERTY_TYPE_ICON[def.type as keyof typeof PROPERTY_TYPE_ICON] ?? TextT;
              const isCurrent = def.type === property.type;
              return (
                <button
                  key={def.type}
                  disabled={committing}
                  onClick={() => {
                    if (def.type === "relation") setPickingRelation(true);
                    else if (def.type === "rollup") setPickingRollup(true);
                    else if (def.type === "formula") setPickingFormula(true);
                    else pickType(def.type);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/50 text-muted-foreground">
                    <Icon size={12} />
                  </span>
                  <span className="flex-1 text-left">{def.label}</span>
                  {isCurrent && <Check size={13} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={!!pendingChange}
        onOpenChange={(o) => { if (!o) setPendingChange(null); }}
        title={`Change type to ${pendingChange ? PROPERTY_REGISTRY[pendingChange.type as keyof typeof PROPERTY_REGISTRY]?.label : ""}?`}
        description={`"${property.name}" currently has stored values that this type can't reuse — they'll be permanently cleared. This can't be undone.`}
        confirmLabel="Change type"
        confirmLoadingLabel="Changing…"
        loading={committing}
        onConfirm={() => { if (pendingChange) commit(pendingChange.type, pendingChange.config, true); }}
        overlayClassName="z-[600]"
        className="z-[600]"
      />
    </>
  );
}
