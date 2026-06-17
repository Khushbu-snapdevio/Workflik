"use client";

import { signOut } from "@/lib/auth/client";

export function SignOutButton({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  async function handleSignOut() {
    await signOut();
    window.location.href = "/auth/login";
  }

  return (
    <button className={className} onClick={handleSignOut} type="button" title={title}>
      {children}
    </button>
  );
}
