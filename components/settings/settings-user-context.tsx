"use client";

import { createContext, useContext, useState } from "react";

interface SettingsUser { name: string | null; email: string; image: string | null }
interface Ctx { user: SettingsUser; updateUser: (patch: Partial<SettingsUser>) => void }

const SettingsUserCtx = createContext<Ctx>({
  user: { name: null, email: "", image: null },
  updateUser: () => {},
});

export function SettingsUserProvider({
  initial, children,
}: { initial: SettingsUser; children: React.ReactNode }) {
  const [user, setUser] = useState<SettingsUser>(initial);
  function updateUser(patch: Partial<SettingsUser>) {
    setUser(u => ({ ...u, ...patch }));
  }
  return (
    <SettingsUserCtx.Provider value={{ user, updateUser }}>
      {children}
    </SettingsUserCtx.Provider>
  );
}

export function useSettingsUser() { return useContext(SettingsUserCtx); }
