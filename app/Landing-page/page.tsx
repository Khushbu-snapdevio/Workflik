import Link from "next/link";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

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
function IconArrow() {
  return (
    <svg className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconEditor,
    title: "Rich block editor",
    description: "Write anything — quick notes, long-form docs, wikis. A powerful slash-command editor that stays out of your way.",
  },
  {
    Icon: IconTeam,
    title: "Team workspaces",
    description: "Invite teammates, set roles, and collaborate in a shared space. Everyone sees the same source of truth, always.",
  },
  {
    Icon: IconPages,
    title: "Nested page tree",
    description: "Organise content in a deeply-nested sidebar. Drag, drop, and restructure your docs any way your team thinks.",
  },
  {
    Icon: IconTemplate,
    title: "Ready-made templates",
    description: "Start fast with sprint notes, briefs, wikis, and SOPs — or save your own pages as templates for your team.",
  },
  {
    Icon: IconSearch,
    title: "Instant full-text search",
    description: "Find any page, heading, or paragraph in milliseconds. Search across every workspace you belong to.",
  },
  {
    Icon: IconLock,
    title: "Granular permissions",
    description: "Page-level sharing with guests, public links, and workspace roles. Share exactly what you want, with exactly who you choose.",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Sign in instantly",
    desc: "Enter your email. We send a magic link — no password, no friction.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="2.5" y="5" width="15" height="11" rx="1.5" /><path d="M2.5 8L10 12.5 17.5 8" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Set up your space",
    desc: "Name your workspace, upload a logo, and invite your first teammates.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <circle cx="10" cy="8" r="3.5" /><path d="M3.5 17c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Pick a template",
    desc: "Start from 50+ templates — or a blank page. Your call.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="3" y="3" width="14" height="14" rx="1.5" /><path d="M3 8h14M8 8v9" />
      </svg>
    ),
  },
  {
    step: 4,
    title: "Start writing",
    desc: "Your first page is one click away. The whole team can jump in immediately.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M14.5 3.5L16.5 5.5L7 15H4.5v-2.5L14.5 3.5Z" /><path d="M12 6L14 8" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote: "We replaced both Confluence and Notion with Workflik in a single week. Our team hasn't looked back — the editor is just faster and cleaner.",
    name: "Sarah K.",
    role: "Head of Engineering",
    initials: "SK",
    gradient: "from-primary to-sky-400",
  },
  {
    quote: "The search is incredible. I can find any paragraph across 500 pages in under a second. That alone made it worth switching.",
    name: "Marcus L.",
    role: "Product Manager",
    initials: "ML",
    gradient: "from-sky-600 to-sky-400",
  },
  {
    quote: "Finally a workspace tool that doesn't feel like enterprise software. My whole ops team was onboarded in an afternoon.",
    name: "Priya N.",
    role: "Director of Operations",
    initials: "PN",
    gradient: "from-slate-600 to-slate-400",
  },
];

const USE_CASES = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="2" y="3" width="16" height="14" rx="2" /><path d="M7 9h6M7 12h4" />
      </svg>
    ),
    label: "Product & Engineering",
    desc: "Specs, ADRs, sprint retrospectives, incident reports, and onboarding docs — all in one searchable space.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <circle cx="10" cy="10" r="7.5" /><circle cx="10" cy="10" r="3" /><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" />
      </svg>
    ),
    label: "Design & Creative",
    desc: "Creative briefs, moodboards, feedback threads, and brand guidelines your team can find instantly.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M3 10h14M10 3v14" />
      </svg>
    ),
    label: "Marketing & Growth",
    desc: "Campaign plans, content calendars, launch checklists, and brand guides — always up to date.",
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="3" y="3" width="14" height="14" rx="2" /><path d="M3 8h14M8 3v14" />
      </svg>
    ),
    label: "Operations & HR",
    desc: "SOPs, policies, employee handbooks, meeting notes, and checklists — structured for your whole org.",
    accent: "bg-amber-100 text-amber-600",
  },
];

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) redirect("/platform/post-auth");

  return (
    <div className="min-h-screen bg-page text-foreground antialiased">

      {/* Smooth scroll handler (client) */}
      <SmoothScroll />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[11px] font-black text-primary-foreground shadow-[var(--shadow-card)]">
              WF
            </span>
            <span className="text-sm font-black tracking-tight text-foreground">{PRODUCT_NAME}</span>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-7 sm:flex">
            {[
              { label: "Features",     href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "For teams",    href: "#for-teams" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="lp-nav-link text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="lp-nav-link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-raised)] active:scale-[0.97]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24">
        {/* Layered glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute left-1/4 top-20 h-[300px] w-[400px] rounded-full bg-primary/8 blur-2xl" />
          <div className="absolute right-1/4 top-32 h-[250px] w-[350px] rounded-full bg-sky-300/8 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div
            className="lp-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-primary">Now in early access · Free to join</span>
          </div>

          {/* Headline */}
          <h1
            className="lp-fade-up mb-6 text-5xl font-black leading-[1.06] tracking-tight text-foreground sm:text-6xl lg:text-[4.5rem]"
            style={{ animationDelay: "0.12s" }}
          >
            Your team&rsquo;s{" "}
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
              second brain
            </span>
            <br className="hidden sm:block" />
            {" "}built to move fast.
          </h1>

          {/* Subtext */}
          <p
            className="lp-fade-up mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "0.2s" }}
          >
            {PRODUCT_NAME} brings your docs, wikis, and projects together in one connected
            workspace — for teams and individuals who need clarity at speed.
          </p>

          {/* CTAs */}
          <div
            className="lp-fade-up flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.28s" }}
          >
            <Link
              href="/auth/login"
              className="group inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-7 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-[var(--primary-hover)] hover:shadow-primary/35 hover:shadow-xl active:scale-[0.97]"
            >
              Start for free
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                <IconArrow />
              </span>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center rounded-[var(--radius-md)] border border-border bg-card px-7 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-all hover:bg-muted hover:shadow-[var(--shadow-raised)] active:scale-[0.97]"
            >
              Sign in with magic link
            </Link>
          </div>

          <p
            className="lp-fade-in mt-5 text-xs text-muted-foreground/60"
            style={{ animationDelay: "0.38s" }}
          >
            No credit card required · Free to get started · Set up in 2 minutes
          </p>
        </div>

        {/* App preview card */}
        <div
          className="lp-scale-in relative mx-auto mt-16 max-w-4xl"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-float)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="mx-auto flex h-6 w-52 items-center justify-center rounded-[var(--radius-xs)] bg-muted/80">
                <span className="text-[10px] font-medium text-muted-foreground/70">app.workflik.com/workspace</span>
              </div>
            </div>
            {/* App layout */}
            <div className="flex h-72">
              {/* Sidebar */}
              <div className="w-48 shrink-0 border-r border-border bg-sidebar px-2 py-3">
                <div className="mb-3 flex items-center justify-between px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded bg-primary text-[8px] font-black text-primary-foreground">WF</span>
                    <span className="text-[11px] font-bold text-foreground">Acme Corp</span>
                  </div>
                </div>
                <p className="mb-1 px-2 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground/40">Pages</p>
                <div className="space-y-0.5">
                  {[
                    { icon: "📋", label: "Product Roadmap", active: true },
                    { icon: "📚", label: "Team Wiki",        active: false },
                    { icon: "📝", label: "Sprint Notes",     active: false },
                    { icon: "🎨", label: "Design System",    active: false },
                    { icon: "👋", label: "Onboarding Guide", active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1.5 ${
                        item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/60"
                      }`}
                    >
                      <span className="text-[11px] leading-none">{item.icon}</span>
                      <span className="truncate text-[11px] font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Breadcrumb bar */}
                <div className="flex items-center gap-1.5 border-b border-border/60 px-6 py-2">
                  <span className="text-[9.5px] text-muted-foreground/50">Acme Corp</span>
                  <span className="text-[9.5px] text-muted-foreground/30">/</span>
                  <span className="text-[9.5px] font-medium text-foreground/70">Product Roadmap</span>
                </div>

                <div className="flex-1 overflow-hidden px-7 py-5">
                  {/* Page title */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-base leading-none">📋</span>
                    <span className="text-[15px] font-bold text-foreground">Q3 Product Roadmap</span>
                  </div>

                  {/* Task rows */}
                  <div className="space-y-1">
                    {[
                      { icon: "✅", text: "Ship new editor blocks",  status: "Done",        pill: "bg-emerald-100 text-emerald-700" },
                      { icon: "🔄", text: "Invite flow redesign",    status: "In Progress", pill: "bg-primary/10 text-primary" },
                      { icon: "📄", text: "Template gallery v2",     status: "Planned",     pill: "bg-muted/80 text-muted-foreground" },
                      { icon: "📊", text: "Analytics dashboard",     status: "Planned",     pill: "bg-muted/80 text-muted-foreground" },
                      { icon: "🔔", text: "Notification digest",     status: "Backlog",     pill: "bg-amber-100 text-amber-700" },
                    ].map((row) => (
                      <div key={row.text} className="flex items-center justify-between rounded-[var(--radius-xs)] px-2 py-1.5 transition-colors hover:bg-muted/40">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] leading-none">{row.icon}</span>
                          <span className="text-[11px] text-foreground/80">{row.text}</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${row.pill}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card px-6 py-8">
        <ScrollReveal>
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { value: "Unlimited", label: "Pages & docs" },
                { value: "Real-time", label: "Collaboration" },
                { value: "50+",       label: "Starter templates" },
                { value: "< 100ms",   label: "Full-text search" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <span className="text-2xl font-black tracking-tight text-foreground">{stat.value}</span>
                  <span className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-primary">Everything you need</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              One workspace. Everything in it.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Stop switching between tools. {PRODUCT_NAME} brings your writing, planning, and knowledge into one place your whole team can trust.
            </p>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 60}>
                <div className="group h-full rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-raised)]">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-secondary text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
                    <f.Icon />
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-card/60 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-primary">Simple by design</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              No onboarding call needed. No setup wizard. Just sign in and start writing.
            </p>
          </ScrollReveal>

          <div className="relative grid gap-10 sm:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-[22px] hidden h-px bg-border sm:block" />

            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 80} className="flex flex-col items-center text-center">
                <div className="relative mb-5 flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card text-muted-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-raised)] hover:text-primary">
                  {s.icon}
                  <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-sm">
                    {s.step}
                  </span>
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-primary">Loved by teams</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              What early users are saying
            </h2>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 80}>
                <div className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} className="size-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-[11px] font-bold text-white`}>
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section id="for-teams" className="bg-card/60 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-primary">Who it&apos;s for</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Built for every kind of team
            </h2>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <ScrollReveal key={u.label} delay={i * 60}>
                <div className="group h-full rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]">
                  <div className={`mb-4 flex size-10 items-center justify-center rounded-[var(--radius-md)] transition-transform duration-200 group-hover:scale-110 ${u.accent}`}>
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

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <ScrollReveal>
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-primary to-sky-600 px-8 py-16 text-center shadow-[0_20px_60px_rgba(2,132,199,0.35)]">
            <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-black tracking-tight text-primary-foreground">
                Ready to bring your team together?
              </h2>
              <p className="mb-8 text-base leading-relaxed text-primary-foreground/80">
                Sign up in seconds — no setup, no credit card. Start writing in your first workspace today and invite your whole team for free.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/auth/login"
                  className="group inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-white px-7 text-sm font-bold text-primary shadow-lg transition-all hover:bg-white/95 hover:shadow-[var(--shadow-raised)] active:scale-[0.97]"
                >
                  Get started for free
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    <IconArrow />
                  </span>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 items-center rounded-[var(--radius-md)] border border-white/30 px-7 text-sm font-semibold text-primary-foreground transition-all hover:border-white/50 hover:bg-white/10 active:scale-[0.97]"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-5 text-xs text-primary-foreground/60">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card px-6 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[11px] font-black text-primary-foreground shadow-[var(--shadow-card)]">
                  WF
                </span>
                <span className="text-sm font-black tracking-tight text-foreground">{PRODUCT_NAME}</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                The connected workspace for teams who move fast — docs, wikis, and projects in one place.
              </p>
              <div className="mt-5 flex items-center gap-3">
                {/* GitHub */}
                <a
                  href="#"
                  aria-label="GitHub"
                  className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted hover:text-foreground hover:-translate-y-0.5"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M10 .333A9.911 9.911 0 000 10.25c0 4.39 2.852 8.112 6.791 9.428.497.09.679-.215.679-.479 0-.236-.009-.864-.013-1.695-2.762.6-3.345-1.33-3.345-1.33-.452-1.146-1.104-1.45-1.104-1.45-.902-.617.069-.604.069-.604.997.07 1.522 1.024 1.522 1.024.887 1.518 2.327 1.08 2.893.825.089-.641.347-1.08.632-1.328-2.205-.25-4.52-1.104-4.52-4.911 0-1.085.388-1.97 1.023-2.664-.102-.252-.443-1.262.097-2.63 0 0 .835-.267 2.734 1.018A9.54 9.54 0 0110 5.173a9.54 9.54 0 012.496.336c1.898-1.285 2.732-1.018 2.732-1.018.542 1.368.201 2.378.099 2.63.637.694 1.022 1.579 1.022 2.664 0 3.817-2.318 4.657-4.526 4.903.356.307.673.913.673 1.84 0 1.329-.012 2.401-.012 2.728 0 .266.18.574.683.476C17.15 18.36 20 14.636 20 10.25A9.911 9.911 0 0010 .333z" clipRule="evenodd" />
                  </svg>
                </a>
                {/* X / Twitter */}
                <a
                  href="#"
                  aria-label="X (Twitter)"
                  className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted hover:text-foreground hover:-translate-y-0.5"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path d="M11.96 8.48L18.28 1h-1.5l-5.48 6.35L6.8 1H1.6l6.65 9.67L1.6 19h1.5l5.82-6.75L13.2 19h5.2l-6.44-10.52zm-2.06 2.39l-.67-.97L3.2 2.16h2.3l4.32 6.27.67.97 5.6 8.13h-2.3l-3.87-5.66z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-foreground">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Pages & Docs",    href: "#features" },
                  { label: "Templates",       href: "#features" },
                  { label: "Team workspaces", href: "#features" },
                  { label: "Search",          href: "#features" },
                  { label: "Permissions",     href: "#features" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="lp-nav-link text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-foreground">Resources</h4>
              <ul className="space-y-3">
                {[
                  { label: "Documentation", href: "#" },
                  { label: "Changelog",     href: "#" },
                  { label: "Status page",   href: "#" },
                  { label: "Roadmap",       href: "#" },
                  { label: "Blog",          href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="lp-nav-link text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-foreground">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "About",           href: "#" },
                  { label: "Careers",         href: "#" },
                  { label: "Privacy Policy",  href: "/privacy" },
                  { label: "Terms of Service",href: "/terms" },
                  { label: "Contact us",      href: "mailto:hello@workflik.com" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="lp-nav-link text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {PRODUCT_NAME}, Inc. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Made with care for teams who build great things.
            </p>
            <Link
              href="/auth/login"
              className="lp-nav-link text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Sign in to your workspace &rarr;
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
