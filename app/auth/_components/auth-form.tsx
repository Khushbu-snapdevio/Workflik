"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { signIn, useSession } from "@/lib/auth/client";

export function AuthForm() {
  return (
    <Suspense fallback={null}>
      <AuthFormInner />
    </Suspense>
  );
}

function AuthFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState(searchParams.get("hint") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/platform/post-auth");
    }
  }, [router, session]);

  if (isPending || session) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const callbackURL = searchParams.get("next") ?? "/platform/post-auth";
    const result = await signIn.magicLink({ callbackURL, email });

    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Failed to send magic link.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <Link href="/" className="mb-10 flex flex-col items-center gap-3">
          <Image src="/workflik-logo.png" alt="Workflik" width={180} height={45} className="h-10 w-auto" />
        </Link>

        {/* Form area */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-card px-8 py-8">

          {sent ? (
            /* ── Email sent state ── */
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-success/10">
                <svg className="size-7 text-success" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="mb-2 text-xl font-bold text-foreground">Check your inbox</h1>
              <p className="mb-1 text-sm text-muted-foreground">
                We sent a sign-in link to
              </p>
              <p className="mb-7 text-sm font-semibold text-foreground">{email}</p>
              <p className="mb-6 text-xs text-muted-foreground">
                Open the link in your email to sign in. The link expires in 10 minutes.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-card text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-accent hover:text-foreground"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Sign-in form ── */
            <>
              <div className="mb-7">
                <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to your {PRODUCT_NAME} workspace</p>
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={googleLoading}
                onClick={async () => {
                  setGoogleLoading(true);
                  setError(null);
                  try {
                    const result = await signIn.social({
                      provider: "google",
                      callbackURL: "/platform/post-auth",
                      disableRedirect: true,
                    });
                    if (result?.error) {
                      setError(result.error.message ?? "Google sign-in failed.");
                      return;
                    }
                    const rawUrl = (result?.data as { url?: string } | null)?.url;
                    if (rawUrl) {
                      const url = new URL(rawUrl);
                      url.searchParams.set("prompt", "select_account");
                      window.location.href = url.toString();
                    }
                  } finally {
                    setGoogleLoading(false);
                  }
                }}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-border bg-muted/40 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="size-[18px] shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">or continue with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Magic link form */}
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {error && (
                  <p className="rounded-[var(--radius-sm)] border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Sending link…" : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" className="font-medium text-foreground underline underline-offset-2 transition-colors duration-150 hover:text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2 transition-colors duration-150 hover:text-primary">
            Privacy Policy
          </Link>
        </p>

      </div>
    </main>
  );
}
