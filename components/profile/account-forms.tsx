"use client";

import { useActionState } from "react";
import {
 type ActionState,
 changeEmailAction,
 deleteAccountAction,
 updateNameAction,
} from "@/app/actions/profile";
import { Input } from "@/components/ui/input";

const initialState: ActionState = {};

function ActionMessage({ state }: { state: ActionState }) {
 if (state.error) {
  return (
   <p className="rounded-[var(--radius-sm)] bg-destructive/10 p-3 text-[12.5px] text-destructive">
    {state.error}
   </p>
  );
 }
 if (state.success) {
  return (
   <p className="rounded-[var(--radius-sm)] bg-success/10 p-3 text-[12.5px] text-success">
    {state.success}
   </p>
  );
 }
 return null;
}

export function AccountIdentityForms({
 email,
 name,
}: {
 email: string;
 name: string;
}) {
 const [nameState, nameAction, namePending] = useActionState(
  updateNameAction,
  initialState
 );
 const [emailState, emailAction, emailPending] = useActionState(
  changeEmailAction,
  initialState
 );

 return (
  <div className="grid gap-4 lg:grid-cols-2">

   {/* Display Name */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="border-b border-border/60 px-5 py-3.5">
     <div className="flex items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
       <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
       </svg>
      </span>
      <span className="text-[13px] font-semibold text-foreground">Display Name</span>
     </div>
     <p className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-muted-foreground">
      The name shown in navigation, audit logs, and admin views.
     </p>
    </div>
    <div className="px-5 py-4">
     <form action={nameAction} className="space-y-3">
      <label className="block" htmlFor="name">
       <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground">Name</span>
       <Input defaultValue={name} id="name" maxLength={100} name="name" />
      </label>
      <ActionMessage state={nameState} />
      <button
       className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97] disabled:opacity-60"
       disabled={namePending}
       type="submit"
      >
       {namePending ? "Saving..." : "Save name"}
      </button>
     </form>
    </div>
   </div>

   {/* Email Address */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="border-b border-border/60 px-5 py-3.5">
     <div className="flex items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
       <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
       </svg>
      </span>
      <span className="text-[13px] font-semibold text-foreground">Email Address</span>
     </div>
     <p className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-muted-foreground">
      Magic-link authentication uses this email as the account identity.
     </p>
    </div>
    <div className="px-5 py-4">
     <form action={emailAction} className="space-y-3">
      <label className="block" htmlFor="email">
       <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground">Email</span>
       <Input defaultValue={email} id="email" name="email" required type="email" />
      </label>
      <ActionMessage state={emailState} />
      <button
       className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97] disabled:opacity-60"
       disabled={emailPending}
       type="submit"
      >
       {emailPending ? "Saving..." : "Update email"}
      </button>
     </form>
    </div>
   </div>
  </div>
 );
}

export function DeleteAccountForm({ email }: { email: string }) {
 const [state, action, pending] = useActionState(deleteAccountAction, initialState);

 return (
  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-destructive/30 bg-card">
   <div className="border-b border-destructive/20 px-5 py-3.5">
    <div className="flex items-center gap-2.5">
     <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 ring-1 ring-destructive/20">
      <svg className="size-3 text-destructive" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
       <polyline points="3 6 5 6 21 6"/>
       <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
       <path d="M10 11v6M14 11v6"/>
       <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
      </svg>
     </span>
     <span className="text-[13px] font-semibold text-destructive">Delete Account</span>
    </div>
    <p className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-muted-foreground">
     Permanently delete your user, sessions, and linked auth accounts.
     Audit records remain for operator history.
    </p>
   </div>
   <div className="px-5 py-4">
    <form action={action} className="space-y-3">
     <label className="block" htmlFor="confirmEmail">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
       Type your email to confirm
      </span>
      <Input autoComplete="off" id="confirmEmail" name="confirmEmail" placeholder={email} />
     </label>
     <ActionMessage state={state} />
     <button
      className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-destructive px-4 text-[12.5px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
      disabled={pending}
      type="submit"
     >
      {pending ? "Deleting..." : "Delete my account"}
     </button>
    </form>
   </div>
  </div>
 );
}
