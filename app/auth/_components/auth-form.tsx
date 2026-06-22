"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <main className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-md">
        <Link className="mb-6 flex items-center justify-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-primary font-black text-primary-foreground text-xs">
            WF
          </span>
          <span className="font-black tracking-normal">{PRODUCT_NAME}</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{sent ? "Check your email" : "Sign in"}</CardTitle>
            <CardDescription>
              {sent
                ? "Your one-time sign-in link is on its way."
                : "Enter your email and WORKFLIK will send a magic link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="rounded-[var(--radius-sm)] bg-success-subtle p-3 text-success-foreground text-sm">
                  Magic link sent to <strong>{email}</strong>.
                </p>
                <Button
                  className="w-full"
                  onClick={() => setSent(false)}
                  type="button"
                  variant="secondary"
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  className="w-full gap-2"
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    setError(null);
                    try {
                      // disableRedirect=true returns the OAuth URL instead of
                      // auto-redirecting, so we can append prompt=select_account
                      // to force the Google account picker every time.
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
                  type="button"
                  variant="outline"
                >
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? "Redirecting to Google..." : "Sign in with Google"}
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or continue with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form className="space-y-4" onSubmit={onSubmit}>
                  <label className="block" htmlFor="email">
                  <span className="mb-2 block font-semibold text-foreground text-sm">
                    Email
                  </span>
                  <Input
                    autoComplete="email"
                    id="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                {error && (
                  <p className="rounded-[var(--radius-sm)] bg-destructive/10 p-3 text-destructive text-sm">
                    {error}
                  </p>
                )}
                  <Button className="w-full" disabled={submitting} type="submit">
                    {submitting ? "Sending..." : "Send magic link"}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
