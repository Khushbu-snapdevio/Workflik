"use client";

import { Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  workspaceSlug: string;
};

export function TrashSection({ workspaceSlug }: Props) {
  const pathname = usePathname();
  const href = `/${workspaceSlug}/trash`;
  const isActive = pathname === href;

  return (
    <Link
      className={`flex items-center gap-2.5 px-4 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
      href={href}
    >
      <Trash size={14} weight={isActive ? "fill" : "regular"} />
      Trash
    </Link>
  );
}
