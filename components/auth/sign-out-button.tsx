"use client";

import { signOut } from "@/lib/auth/client";

export function SignOutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  async function handleSignOut() {
    await signOut();
    window.location.href = "/auth/login";
  }

  return (
    <button className={className} onClick={handleSignOut} type="button">
      {children}
    </button>
  );
}
