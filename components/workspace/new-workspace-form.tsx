"use client";

import Image from "next/image";
import { useState } from "react";
import { createWorkspaceAction } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_NAME } from "@/config/platform";

export function NewWorkspaceForm() {
 const [kind, setKind] = useState<"personal" | "team">("personal");

 return (
  <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-4 py-16">
   {/* Ambient glow */}
   <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
   </div>

   <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
    {/* Logo mark */}
    <div className="mb-7">
     <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={180} height={45} className="h-11 w-auto" />
    </div>

    {/* Heading */}
    <h1 className="mb-2 text-center text-[1.75rem] font-black leading-tight tracking-tight text-foreground">
     Create your workspace
    </h1>
    <p className="mb-8 max-w-[22rem] text-center text-sm leading-relaxed text-muted-foreground">
     A workspace is where your team organises, collaborates, and ships — all in one place.
    </p>

    {/* Card */}
    <div className="w-full rounded-[var(--radius-lg)] border border-border bg-card">
     <form action={createWorkspaceAction} className="space-y-5 p-7">

      {/* Workspace type */}
      <div className="space-y-2">
       <p className="text-xs font-medium tracking-wide text-muted-foreground">
        Workspace type
       </p>
       <div className="grid grid-cols-2 gap-2.5">
        <button
         type="button"
         onClick={() => setKind("personal")}
         className={`flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border p-3.5 text-left transition-all ${
          kind === "personal"
           ? "border-primary bg-secondary"
           : "border-border bg-background hover:border-primary/40 hover:bg-accent"
         }`}
        >
         <span className="text-xl leading-none">👤</span>
         <p className={`text-xs font-semibold ${kind === "personal" ? "text-primary" : "text-foreground"}`}>
          Personal
         </p>
         <p className="text-xs leading-tight text-muted-foreground">Solo work, private by default</p>
        </button>
        <button
         type="button"
         onClick={() => setKind("team")}
         className={`flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border p-3.5 text-left transition-all ${
          kind === "team"
           ? "border-primary bg-secondary"
           : "border-border bg-background hover:border-primary/40 hover:bg-accent"
         }`}
        >
         <span className="text-xl leading-none">🏢</span>
         <p className={`text-xs font-semibold ${kind === "team" ? "text-primary" : "text-foreground"}`}>
          Teamspace
         </p>
         <p className="text-xs leading-tight text-muted-foreground">Shared with your team</p>
        </button>
       </div>
       <input type="hidden" name="kind" value={kind} />
      </div>

      {/* Workspace name */}
      <div className="space-y-2">
       <label
        htmlFor="name"
        className="block text-xs font-medium tracking-wide text-muted-foreground"
       >
        Workspace name
       </label>
       <Input
        id="name"
        name="name"
        placeholder={kind === "team" ? "e.g. Acme Corp" : "e.g. My Notes"}
        required
        autoFocus
        maxLength={100}
        className="h-11 text-base"
       />
      </div>

      <Button type="submit" className="w-full" size="default">
       Create workspace
       <svg
        className="ml-1 size-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
       >
        <path d="M5 12h14M12 5l7 7-7 7" />
       </svg>
      </Button>
     </form>

     <div className="border-t border-border px-7 py-4">
      <p className="text-center text-xs leading-relaxed text-muted-foreground/60">
       You can rename or create more workspaces later in settings.
      </p>
     </div>
    </div>

    <p className="mt-6 text-center text-xs text-muted-foreground">
     {PRODUCT_NAME} · Your work, organised
    </p>
   </div>
  </div>
 );
}
