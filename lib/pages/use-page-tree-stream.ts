"use client";

import { useEffect, useRef } from "react";

interface Options {
  workspaceId: string;
  onChange:    () => void;
  enabled?:    boolean;
}

// Mirrors lib/notifications/use-notification-stream.ts's shape — same
// EventSource + reconnect-with-backoff pattern, applied to
// /api/workspaces/:id/pages/stream instead. The server sends a "changed"
// event (no payload) whenever any page in the workspace was created,
// renamed, moved, or deleted by anyone; the caller reacts by refetching its
// own copy of the tree (e.g. Sidebar's fetchPages).
export function usePageTreeStream({ workspaceId, onChange, enabled = true }: Options) {
  const failCountRef  = useRef(0);
  const esRef          = useRef<EventSource | null>(null);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef    = useRef(onChange);
  callbackRef.current  = onChange;

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    function connect() {
      if (!active) return;

      const es = new EventSource(
        `/api/workspaces/${workspaceId}/pages/stream`
      );
      esRef.current = es;

      es.addEventListener("connected", () => { failCountRef.current = 0; });

      es.addEventListener("changed", () => {
        callbackRef.current();
      });

      es.onerror = () => {
        es.close();
        failCountRef.current += 1;

        const delay = failCountRef.current >= 3 ? 60_000 : 5_000;
        if (active) timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      active = false;
      esRef.current?.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, enabled]);
}
