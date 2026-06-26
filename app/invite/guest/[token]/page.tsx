"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface InvitationData {
 id:     string;
 email:    string;
 accessLevel: string;
 expiresAt:  string;
 page:    { id: string; title: string; icon: string | null };
}

const ACCESS_LABELS: Record<string, string> = {
 full_access: "Full Access",
 can_edit:   "Can Edit",
 can_comment: "Can Comment",
 can_view:   "Can View",
};

export default function GuestInvitePage() {
 const { token } = useParams<{ token: string }>();
 const router  = useRouter();

 const [state, setState]    = useState<"loading" | "ready" | "accepting" | "error" | "expired" | "accepted">("loading");
 const [invitation, setInvitation] = useState<InvitationData | null>(null);
 const [errorMsg, setErrorMsg] = useState("");

 useEffect(() => {
  fetch(`/api/invite/guest/${token}`)
   .then((r) => r.json())
   .then((data) => {
    if (data.error) {
     if (data.error.includes("expired")) { setState("expired"); return; }
     if (data.error.includes("accepted")) { setState("accepted"); return; }
     setErrorMsg(data.error);
     setState("error");
     return;
    }
    setInvitation(data.invitation);
    setState("ready");
   })
   .catch(() => { setErrorMsg("Could not load invitation."); setState("error"); });
 }, [token]);

 async function accept() {
  setState("accepting");
  const res = await fetch(`/api/invite/guest/${token}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
   setErrorMsg(data.error ?? "Failed to accept invitation.");
   setState("error");
   return;
  }
  router.push(`/app/${data.shortId ?? ""}`);
 }

 return (
  <div className="flex min-h-screen items-center justify-center bg-page px-4">
   <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-card p-8">
    {/* Logo */}
    <div className="mb-6 flex justify-center">
     <span className="text-2xl font-black tracking-tight text-foreground">WORKFLIK</span>
    </div>

    {state === "loading" && (
     <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
     </div>
    )}

    {state === "ready" && invitation && (
     <>
      <div className="mb-6 text-center">
       <div className="mb-3 text-4xl">{invitation.page.icon ?? "📄"}</div>
       <h1 className="text-xl font-bold text-foreground">You've been invited</h1>
       <p className="mt-1 text-sm text-muted-foreground">
        to access <span className="font-semibold text-foreground">{invitation.page.title || "Untitled"}</span>
       </p>
      </div>

      <div className="mb-6 rounded-[var(--radius-lg)] border border-border bg-page px-4 py-3 text-sm">
       <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Invited email</span>
        <span className="font-medium text-foreground">{invitation.email}</span>
       </div>
       <div className="mt-2 flex items-center justify-between">
        <span className="text-muted-foreground">Access level</span>
        <span className="font-medium text-foreground">
         {ACCESS_LABELS[invitation.accessLevel] ?? invitation.accessLevel}
        </span>
       </div>
       <div className="mt-2 flex items-center justify-between">
        <span className="text-muted-foreground">Expires</span>
        <span className="font-medium text-foreground">
         {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
         })}
        </span>
       </div>
      </div>

      <button
       type="button"
       onClick={accept}
       className="w-full rounded-[var(--radius-sm)] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
      >
       Accept invitation
      </button>

      <p className="mt-4 text-center text-xs text-muted-foreground/70">
       Make sure you're signed in with <span className="font-medium">{invitation.email}</span> before accepting.
      </p>
     </>
    )}

    {state === "accepting" && (
     <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">Accepting invitation…</p>
     </div>
    )}

    {state === "expired" && (
     <div className="py-4 text-center">
      <div className="mb-3 text-4xl">⏰</div>
      <h2 className="text-lg font-semibold text-foreground">Invitation expired</h2>
      <p className="mt-1 text-sm text-muted-foreground">
       This invitation link has expired. Ask the page owner to send a new one.
      </p>
     </div>
    )}

    {state === "accepted" && (
     <div className="py-4 text-center">
      <div className="mb-3 text-4xl">✅</div>
      <h2 className="text-lg font-semibold text-foreground">Already accepted</h2>
      <p className="mt-1 text-sm text-muted-foreground">
       This invitation has already been accepted.{" "}
       <a href="/app" className="text-primary hover:underline">Go to your workspace →</a>
      </p>
     </div>
    )}

    {state === "error" && (
     <div className="py-4 text-center">
      <div className="mb-3 text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
      <a href="/app" className="mt-4 inline-block text-sm text-primary hover:underline">
       Back to workspace
      </a>
     </div>
    )}
   </div>
  </div>
 );
}
