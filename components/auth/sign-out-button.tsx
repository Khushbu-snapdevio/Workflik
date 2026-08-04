"use client";

import { signOut } from "@/lib/auth/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SignOutButton({
  children,
  className,
  title,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  async function handleSignOut() {
    await signOut();
    window.location.href = "/auth/login";
  }

  const button = (
    <button
      ref={ref}
      className={className}
      onClick={handleSignOut}
      type="button"
    >
      {children}
    </button>
  );

  if (!title) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
