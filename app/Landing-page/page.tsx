import Link from "next/link";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/platform/post-auth");
  }

  return (
    <div className="min-h-screen bg-page text-foreground">

      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground shadow-sm">
              WF
            </span>
            <span className="text-sm font-black tracking-tight text-foreground">{PRODUCT_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10">
          <div className="h-[500px] w-[800px] rounded-full bg-primary/6 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 shadow-sm">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Now in early access</span>
          </div>

          <h1 className="mb-6 text-5xl font-black leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Your team's{" "}
            <span className="text-primary">second brain</span>
            <br />
            — built to move fast.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {PRODUCT_NAME} is where teams write, plan, and organise — pages, docs, wikis,
            and projects, all in one connected workspace. Personal or shared, solo or team.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-[var(--primary-hover)] hover:shadow-primary/30"
            >
              Start for free
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              Sign in with magic link
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/60">No credit card required · Free to get started</p>
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────── */}
      <section className="bg-card/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Everything you need</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              One workspace. Everything in it.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "📝",
                title: "Rich page editor",
                description:
                  "Write anything — quick notes, long-form docs, wikis. A powerful block editor that stays out of your way.",
              },
              {
                emoji: "👥",
                title: "Team workspaces",
                description:
                  "Invite teammates, set roles, and collaborate in a shared space. Everyone sees the same source of truth.",
              },
              {
                emoji: "📂",
                title: "Nested pages",
                description:
                  "Organise content in a nested sidebar just like Notion. Drag, drop, and structure your docs any way you want.",
              },
              {
                emoji: "👤",
                title: "Personal mode",
                description:
                  "Use WORKFLIK solo for private notes, tasks, and projects. Your personal space lives alongside your team's.",
              },
              {
                emoji: "🔍",
                title: "Instant search",
                description:
                  "Find any page, block, or teammate in seconds. Full-text search across every workspace you belong to.",
              },
              {
                emoji: "🔒",
                title: "Granular permissions",
                description:
                  "Page-level sharing with guests, public links, and workspace roles. Share exactly what you want, with exactly who you choose.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-secondary text-2xl">
                  {f.emoji}
                </div>
                <h3 className="mb-2 text-base font-bold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Simple by design</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-4">
            {/* Connector line */}
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block" />

            {[
              { step: "01", title: "Sign in",        desc: "Magic link — no password needed.",         emoji: "✉️" },
              { step: "02", title: "Tell us about you", desc: "3 quick questions to personalise your space.", emoji: "👋" },
              { step: "03", title: "Create workspace", desc: "Name it and invite your team (or go solo).", emoji: "🏗️" },
              { step: "04", title: "Start writing",   desc: "Create your first page and get to work.",   emoji: "🚀" },
            ].map((s) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                <div className="relative mb-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm text-xl">
                  {s.emoji}
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                    {s.step.replace("0", "")}
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────────── */}
      <section className="bg-card/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Who it's for</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Built for every kind of team
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { emoji: "💻", label: "Product & Engineering", desc: "Specs, ADRs, sprint notes, onboarding docs." },
              { emoji: "🎨", label: "Design & Creative",     desc: "Briefs, moodboards, feedback threads." },
              { emoji: "📣", label: "Marketing & Growth",    desc: "Campaigns, content calendars, brand guides." },
              { emoji: "⚙️", label: "Operations & HR",       desc: "SOPs, policies, handbooks, meeting notes." },
            ].map((u) => (
              <div key={u.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 text-3xl">{u.emoji}</div>
                <h3 className="mb-1.5 text-sm font-bold text-foreground">{u.label}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center shadow-xl shadow-primary/20">
          <div className="mb-3 text-4xl">🚀</div>
          <h2 className="mb-4 text-3xl font-black tracking-tight text-primary-foreground">
            Ready to bring your team together?
          </h2>
          <p className="mb-8 text-base leading-relaxed text-primary-foreground/75">
            Sign up in seconds — no setup, no credit card. Start writing in your first workspace today.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-foreground px-7 text-sm font-bold text-primary shadow-lg transition-all hover:bg-primary-foreground/90"
          >
            Get started for free
            <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-primary text-[9px] font-black text-primary-foreground">
              WF
            </span>
            <span className="text-xs font-bold text-foreground">{PRODUCT_NAME}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.
          </p>
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </footer>

    </div>
  );
}
