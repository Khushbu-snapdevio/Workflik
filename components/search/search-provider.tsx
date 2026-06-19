"use client";

import { useEffect, useState } from "react";
import { SearchDialog } from "./search-dialog";

interface SearchProviderProps {
  workspaceSlug: string;
  workspaceId:   string;
  children:      React.ReactNode;
}

export function SearchProvider({ workspaceSlug, workspaceId, children }: SearchProviderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function handleEvent() { setOpen(true); }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("workflik:open-search", handleEvent);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("workflik:open-search", handleEvent);
    };
  }, []);

  return (
    <>
      {children}
      {open && (
        <SearchDialog
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
