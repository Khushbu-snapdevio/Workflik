"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@/components/ui/slot";

// Native <dialog>-based, same engine as dialog.tsx (see the comment there).
// Deliberately does NOT close on backdrop click — an alert dialog exists to
// force an explicit Cancel/Action decision (see doc/CLAUDE.md Rule 8), so
// only the two buttons (or Escape) can dismiss it.

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext(component: string) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error(`<${component}> must be used within <AlertDialog>`);
  return ctx;
}

function AlertDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    function handleClose() {
      setOpen(false);
    }
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [setOpen]);

  return (
    <AlertDialogContext.Provider value={{ open, setOpen, dialogRef }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

function AlertDialogTrigger({
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useAlertDialogContext("AlertDialogTrigger");
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="alert-dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}

function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function AlertDialogContent({
  className,
  // Callers used this to push the overlay above some other portaled/high
  // z-index UI (a popover, etc). Native <dialog> renders in the browser's
  // top-layer regardless of z-index, always above regular content, so the
  // stacking problem this worked around no longer exists — kept as a no-op
  // prop so existing call sites don't need to change.
  overlayClassName: _overlayClassName,
  children,
  ...props
}: React.ComponentProps<"dialog"> & { overlayClassName?: string }) {
  const { open, dialogRef } = useAlertDialogContext("AlertDialogContent");

  return (
    <dialog
      ref={dialogRef}
      data-slot="alert-dialog-content"
      className={cn(
        "fixed left-1/2 top-1/2 z-[590] m-0 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-border bg-card p-6",
        className,
      )}
      {...props}
    >
      {open && children}
    </dialog>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 pt-2", className)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function AlertDialogAction({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useAlertDialogContext("AlertDialogAction");

  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors duration-150 hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useAlertDialogContext("AlertDialogCancel");

  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
