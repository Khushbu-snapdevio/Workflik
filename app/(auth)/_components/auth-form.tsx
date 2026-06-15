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
import { signIn, useSession } from "@/lib/auth-client";

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
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/post-auth");
    }
  }, [router, session]);

  if (isPending || session) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const callbackURL = searchParams.get("next") ?? "/post-auth";
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
          <span className="grid size-10 place-items-center rounded-none bg-primary font-black text-primary-foreground text-xs">
            KR
          </span>
          <span className="font-black tracking-normal">{PRODUCT_NAME}</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{sent ? "Check your email" : "Sign in"}</CardTitle>
            <CardDescription>
              {sent
                ? "Your one-time sign-in link is on its way."
                : "Enter your email and KROVA will send a magic link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="rounded-none bg-success-subtle p-3 text-success-foreground text-sm">
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
                  <p className="rounded-none bg-destructive/10 p-3 text-destructive text-sm">
                    {error}
                  </p>
                )}
                <Button className="w-full" disabled={submitting} type="submit">
                  {submitting ? "Sending..." : "Send magic link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
