import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { MobileNav } from "@/components/landing/mobile-nav";
import { Button } from "@/components/ui/button";

/* ─── SVG icons ─── */
function IconEditor() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M13.5 3.5L16.5 6.5L7 16H4V13L13.5 3.5Z" /><path d="M11 6L14 9" />
    </svg>
  );
}
function IconTeam() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="7.5" cy="6.5" r="2.5" /><path d="M2 16.5c0-3 2.5-5 5.5-5" />
      <circle cx="13.5" cy="6.5" r="2.5" /><path d="M9 16.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    </svg>
  );
}
function IconPages() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="4" y="3" width="9" height="12" rx="1.5" /><path d="M7 17h9V7" /><path d="M7 7h5M7 10h5M7 13h3" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="8.5" cy="8.5" r="5" /><path d="M17 17l-4.5-4.5" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 016 0V9" />
    </svg>
  );
}
function IconTemplate() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="3" y="3" width="14" height="14" rx="1.5" /><path d="M3 8h14M8 8v9" />
    </svg>
  );
}

const FEATURES = [
  { Icon: IconEditor,   title: "Rich block editor",       description: "Write anything — quick notes, long-form docs, wikis. A powerful slash-command editor that stays out of your way." },
  { Icon: IconTeam,     title: "Role-based workspaces",    description: "Invite teammates as Admin, Member, or Viewer. Only the workspace owner can grant Admin — access stays deliberate, not accidental." },
  { Icon: IconPages,    title: "Nested page tree",         description: "Organise content in a deeply-nested sidebar. Drag, drop, and restructure your docs any way your team thinks." },
  { Icon: IconTemplate, title: "Ready-made templates",     description: "Start fast with sprint notes, briefs, wikis, and SOPs — or save your own pages as templates for your team." },
  { Icon: IconSearch,   title: "Instant full-text search", description: "Find any page, heading, or paragraph in milliseconds. Search across every workspace you belong to." },
  { Icon: IconLock,     title: "Granular permissions",     description: "Page-level sharing with guests, public links, and workspace roles. Share exactly what you want, with exactly who you choose." },
];

const STEPS = [
  { num: "01", title: "Set up the instance",  desc: "The first person to sign in becomes the instance admin — one time only, no public sign-up after that." },
  { num: "02", title: "Invite your team",     desc: "Add teammates by email and assign their role: Admin, Member, or Viewer. You decide who gets in." },
  { num: "03", title: "They sign in",         desc: "Invited teammates set a password from their invite email — no accounts appear that you didn't create." },
  { num: "04", title: "Start writing",        desc: "Pick a template or start blank. The whole team can jump in immediately." },
];

const USE_CASES = [
  {
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><rect x="2" y="3" width="16" height="14" rx="2" /><path d="M7 9h6M7 12h4" /></svg>,
    label: "Product & Engineering",
    desc: "Specs, ADRs, sprint retros, incident reports, and onboarding docs — all in one searchable space.",
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><circle cx="10" cy="10" r="7.5" /><circle cx="10" cy="10" r="3" /><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" /></svg>,
    label: "Design & Creative",
    desc: "Creative briefs, moodboards, feedback threads, and brand guidelines your team can find instantly.",
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M3 10h14M10 3v14" /></svg>,
    label: "Marketing & Growth",
    desc: "Campaign plans, content calendars, launch checklists, and brand guides — always up to date.",
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M3 8h14M8 3v14" /></svg>,
    label: "Operations & HR",
    desc: "SOPs, policies, employee handbooks, meeting notes, and checklists — structured for your whole org.",
  },
];

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) redirect("/platform/post-auth");

  return (
    <div id="top" className="min-h-screen bg-page pt-14 text-foreground antialiased">
      <SmoothScroll />

      {/* ── Nav ─────────────────────────────────────────── full width */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#top">
            <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-7 w-auto" />
          </a>
          <nav className="hidden items-center gap-8 sm:flex">
            {[
              { label: "Features",     href: "#features"     },
              { label: "How it works", href: "#how-it-works" },
              { label: "For teams",    href: "#for-teams"    },
            ].map(({ label, href }) => (
              <a key={href} href={href} className="lp-nav-link text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── NARROW — centered text */}
      <section className="relative overflow-hidden px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
        {/* Ambient glow — purely decorative, respects reduced-motion via the lp-glow class */}
        <div aria-hidden className="lp-glow pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full" />

        <div className="mx-auto max-w-2xl">
          <h1 className="lp-fade-up mb-5 text-4xl font-black leading-[1.07] tracking-tight sm:text-5xl md:text-6xl" style={{ animationDelay: "0.1s" }}>
            Your team&rsquo;s{" "}
            <span className="text-primary">second brain</span>{" "}
            built to move fast.
          </h1>

          <p className="lp-fade-up mb-9 text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: "0.18s" }}>
            {PRODUCT_NAME} brings your docs, wikis, and projects into one connected workspace — for teams who need clarity at speed.
          </p>

          <div className="lp-fade-up flex justify-center" style={{ animationDelay: "0.26s" }}>
            <Button asChild size="xl">
              <Link href="/auth/login">
                Sign in
                <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </Button>
          </div>

          <p className="lp-fade-in mt-4 text-xs text-muted-foreground/50" style={{ animationDelay: "0.34s" }}>
            Set up your instance in under 2 minutes
          </p>
        </div>

        {/* App preview — breaks wider than the text */}
        <div className="lp-scale-in mx-auto mt-14 max-w-5xl" style={{ animationDelay: "0.4s" }}>
          <div className="group overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card transition-shadow duration-300 hover:shadow-[0_20px_60px_-15px_rgba(2,132,199,0.25)]">
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
              </div>
              <div className="mx-auto flex h-6 w-56 items-center justify-center rounded-[var(--radius-xs)] bg-muted/80">
                <span className="text-xs font-medium text-muted-foreground/60">{PRODUCT_NAME.toLowerCase()}.example.com/workspace</span>
              </div>
            </div>
            <div className="flex h-60 sm:h-80">
              <div className="hidden w-44 shrink-0 border-r border-border bg-sidebar px-2 py-3 sm:block">
                <div className="mb-3 flex items-center gap-1.5 px-2">
                  <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={80} height={20} className="h-4 w-auto" />
                </div>
                <p className="mb-1 px-2 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/40">Pages</p>
                <div className="space-y-0.5">
                  {[
                    { icon: "📋", label: "Product Roadmap", active: true  },
                    { icon: "📚", label: "Team Wiki",        active: false },
                    { icon: "📝", label: "Sprint Notes",     active: false },
                    { icon: "🎨", label: "Design System",    active: false },
                    { icon: "👋", label: "Onboarding",       active: false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1.5 transition-colors duration-150 ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground/80"}`}>
                      <span className="text-xs leading-none">{item.icon}</span>
                      <span className={`truncate text-xs ${item.active ? "font-semibold" : ""}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-1 border-b border-border/50 bg-muted/20 px-5 py-2">
                  <span className="text-xs text-muted-foreground/40">Project</span>
                  <span className="text-xs text-muted-foreground/30">/</span>
                  <span className="text-xs font-medium text-foreground/70">Product Roadmap</span>
                </div>
                <div className="flex-1 px-7 py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <span className="text-sm font-bold text-foreground">Q3 Product Roadmap</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: "✅", text: "Ship new editor blocks", status: "Done",        pill: "bg-success/10 text-success"     },
                      { icon: "🔄", text: "Invite flow redesign",   status: "In progress", pill: "bg-primary/10 text-primary"     },
                      { icon: "📄", text: "Template gallery v2",    status: "Planned",     pill: "bg-muted text-muted-foreground" },
                      { icon: "📊", text: "Analytics dashboard",    status: "Planned",     pill: "bg-muted text-muted-foreground" },
                      { icon: "🔔", text: "Notification digest",    status: "Backlog",     pill: "bg-warning/10 text-warning"     },
                    ].map((row) => (
                      <div key={row.text} className="flex items-center justify-between rounded-[var(--radius-xs)] px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{row.icon}</span>
                          <span className="text-xs text-foreground/80">{row.text}</span>
                        </div>
                        <span className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-[10px] font-semibold ${row.pill}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── FULL WIDTH band */}
      <section className="border-y border-border bg-card">
        <ScrollReveal>
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
              {[
                { value: "Unlimited", label: "Pages & docs"     },
                { value: "Real-time", label: "Collaboration"     },
                { value: "18",        label: "Starter templates" },
                { value: "< 100ms",   label: "Full-text search"  },
              ].map((stat) => (
                <div key={stat.label} className="group flex flex-col items-center px-6 py-10 text-center transition-colors duration-200 hover:bg-accent/40">
                  <span className="text-2xl font-black tracking-tight text-foreground transition-transform duration-200 group-hover:scale-[1.06] sm:text-3xl">{stat.value}</span>
                  <span className="mt-1.5 text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ──────────────────────── CONTAINED — asymmetric layout */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">

            {/* Left: sticky heading panel */}
            <ScrollReveal className="lg:w-64 lg:shrink-0 lg:pt-1">
              <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Features</p>
              <h2 className="mb-4 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                Everything a team needs. Nothing it doesn&rsquo;t.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Built for speed, designed for teams — every feature earns its place.
              </p>
            </ScrollReveal>

            {/* Right: feature grid */}
            <div className="flex-1 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 50}>
                  <div className="group flex gap-4 rounded-[var(--radius-lg)] border border-transparent p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                      <f.Icon />
                    </div>
                    <div>
                      <h3 className="mb-1.5 text-sm font-bold text-foreground">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────── FULL WIDTH bg-card */}
      <section id="how-it-works" className="border-t border-border bg-card px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-12 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Simple by design</p>
            <h2 className="mb-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Access, on your terms</h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">No public sign-up, no waiting on us — just an admin, an invite, and you&rsquo;re in.</p>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 70}>
                <div className="group flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-page p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30">
                  {/* Step badge + arrow row */}
                  <div className="mb-5 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground transition-transform duration-200 group-hover:scale-105">
                      Step {s.num}
                    </span>
                    {i < STEPS.length - 1 && (
                      <svg className="hidden size-4 text-border lg:block" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    )}
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────── FULL WIDTH bg-card */}
      <section id="for-teams" className="border-t border-border bg-card px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-12 text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Who it&apos;s for</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Built for every kind of team</h2>
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <ScrollReveal key={u.label} delay={i * 60}>
                <div className="group h-full rounded-[var(--radius-xl)] border border-border bg-page p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_12px_32px_-12px_rgba(2,132,199,0.2)] sm:p-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                    {u.icon}
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-foreground">{u.label}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{u.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────── FULL WIDTH solid primary band */}
      <section className="bg-primary px-4 py-20 sm:px-6 sm:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">Get started today</p>
            <h2 className="mb-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to bring your team together?
            </h2>
            <p className="mb-10 text-base leading-relaxed text-white/65">
              Sign in to invite your team and start writing together today.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-white px-8 text-sm font-semibold text-primary transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/90"
            >
              Sign in
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ───────────────────────────────── full width bg-card */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8 lg:grid-cols-[2fr_1fr_1fr]">
            <div>
              <a href="#top">
                <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-7 w-auto" />
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                The connected workspace for teams — docs, wikis, and projects all in one place.
              </p>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Features",     href: "#features"     },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "For teams",    href: "#for-teams"    },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Legal</h4>
              <ul className="space-y-3">
                {[
                  { label: "Privacy Policy",   href: "/privacy" },
                  { label: "Terms of Service", href: "/terms"   },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 sm:mt-14 sm:flex-row">
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.
            </p>
            <a
              href="#top"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to top
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3">
                <path d="M8 12V4M4 8l4-4 4 4"/>
              </svg>
            </a>
            <p className="text-xs text-muted-foreground/60">
              Made with care for teams who build great things.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
