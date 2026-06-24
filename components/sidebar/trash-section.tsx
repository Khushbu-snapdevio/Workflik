"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  workspaceSlug: string;
};

export function TrashSection({ workspaceSlug }: Props) {
  const pathname = usePathname();
  const href = `/app/${workspaceSlug}/trash`;
  const isActive = pathname === href;

  return (
    <Link
      className={`flex items-center gap-2.5 px-4 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground duration-150"
      }`}
      href={href}
    >
      <Trash2 size={14} />
      Trash
    </Link>
  );
}
