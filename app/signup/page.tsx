import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isRegistrationAllowed } from "@/lib/auth/registration";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sign up" };

// There is no standalone signup form — self-serve account creation only
// ever happens through the merged form at /auth/login (bootstrap, or
// ALLOW_PUBLIC_REGISTRATION=true). This route exists purely so a direct
// /signup visit does something sensible either way: hand off to that form
// when registration is actually open, otherwise explain why it isn't.
export default async function SignupPage() {
  if (await isRegistrationAllowed()) {
    redirect("/auth/login");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-[380px]">
        <Link href="/" className="mb-10 flex flex-col items-center gap-3">
          <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={180} height={45} className="h-10 w-auto" />
        </Link>

        <div className="rounded-[var(--radius-xl)] border border-border bg-card px-8 py-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            Registration is disabled
          </h1>
          <p className="mb-7 text-sm text-muted-foreground">
            This WorkFlik instance uses invite-only registration. Ask your
            administrator to send you an invitation.
          </p>

          <div className="space-y-2.5">
            <Button asChild size="default" className="w-full">
              <Link href="/auth/login">Go to Sign In</Link>
            </Button>
            {env.NEXT_PUBLIC_SHOW_LANDING_PAGE && (
              <Button asChild variant="outline" size="default" className="w-full bg-muted/40">
                <Link href="/">Back to Home</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
