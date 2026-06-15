import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-page px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-none bg-primary font-black text-primary-foreground text-xs">
              KR
            </span>
            <span className="font-black tracking-normal">{PRODUCT_NAME}</span>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-4 font-bold text-success text-xs uppercase tracking-eyebrow">
              Application Scaffold
            </p>
            <h1 className="max-w-4xl font-black text-5xl tracking-normal sm:text-7xl">
              Ship from a clean control plane.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-8">
              {PRODUCT_DESCRIPTION} Bring your own product logic on top of the
              pieces that usually take the first week to wire correctly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login">Start with magic link</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/orbit">Open Orbit</Link>
              </Button>
            </div>
          </div>

          <Card className="bg-primary text-primary-foreground">
            <CardContent className="grid gap-4">
              {[
                "Next.js app router UI",
                "Postgres + Drizzle schema",
                "Better Auth magic links",
                "pg-boss worker queues",
                "Email outbox + events",
                "Orbit admin user management",
              ].map((item) => (
                <div
                  className="flex items-center justify-between border-b border-primary-foreground/15 py-3 last:border-b-0"
                  key={item}
                >
                  <span>{item}</span>
                  <span className="font-mono text-success-light text-xs">on</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
