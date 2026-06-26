import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { MobileNav } from "@/components/landing/mobile-nav";

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
  { Icon: IconTeam,     title: "Team workspaces",          description: "Invite teammates, set roles, and collaborate in a shared space. Everyone sees the same source of truth, always." },
  { Icon: IconPages,    title: "Nested page tree",         description: "Organise content in a deeply-nested sidebar. Drag, drop, and restructure your docs any way your team thinks." },
  { Icon: IconTemplate, title: "Ready-made templates",     description: "Start fast with sprint notes, briefs, wikis, and SOPs — or save your own pages as templates for your team." },
  { Icon: IconSearch,   title: "Instant full-text search", description: "Find any page, heading, or paragraph in milliseconds. Search across every workspace you belong to." },
  { Icon: IconLock,     title: "Granular permissions",     description: "Page-level sharing with guests, public links, and workspace roles. Share exactly what you want, with exactly who you choose." },
];

const STEPS = [
  { num: "01", title: "Sign in instantly",  desc: "Enter your email. We send a magic link — no password, no friction." },
  { num: "02", title: "Set up your space",  desc: "Name your workspace and invite your first teammates in seconds." },
  { num: "03", title: "Pick a template",    desc: "Start from 50+ templates — or a blank page. Your call." },
  { num: "04", title: "Start writing",      desc: "Your first page is one click away. The whole team can jump in immediately." },
];

const TESTIMONIALS = [
  { quote: "We replaced both Confluence and Notion with Workflik in a single week. Our team hasn't looked back — the editor is just faster and cleaner.", name: "Sarah K.",  role: "Head of Engineering",    initials: "SK" },
  { quote: "The search is incredible. I can find any paragraph across 500 pages in under a second. That alone made it worth switching.",                  name: "Marcus L.", role: "Product Manager",         initials: "ML" },
  { quote: "Finally a workspace tool that doesn't feel like enterprise software. My whole ops team was onboarded in an afternoon.",                        name: "Priya N.",  role: "Director of Operations",  initials: "PN" },
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
    <div id="top" className="min-h-screen bg-page text-foreground antialiased">
      <SmoothScroll />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-page/80 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#top" className="flex items-center gap-2.5">
            <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-7 w-auto" />
          </a>

          <nav className="hidden items-center gap-7 sm:flex">
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
            <Link href="/auth/login" className="hidden h-9 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 sm:inline-flex">
              Try for free
            </Link>
            {/* Mobile hamburger */}
            <MobileNav />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-4 pb-10 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="mx-auto max-w-4xl">
          <div className="lp-fade-up mb-8 flex justify-center" style={{ animationDelay: "0.05s" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-muted-foreground">Now in early access — free to join</span>
            </span>
          </div>

          <h1 className="lp-fade-up mb-6 text-center text-4xl font-black leading-[1.07] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl" style={{ animationDelay: "0.1s" }}>
            Your team&rsquo;s{" "}
            <span className="text-primary">second brain</span>
            <br className="hidden sm:block" />
            {" "}built to move fast.
          </h1>

          <p className="lp-fade-up mx-auto mb-10 max-w-xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: "0.18s" }}>
            {PRODUCT_NAME} brings your docs, wikis, and projects into one connected workspace — for teams who need clarity at speed.
          </p>

          <div className="lp-fade-up flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.26s" }}>
            <Link href="/auth/login" className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90">
              Get started free
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>

          </div>

          <p className="lp-fade-in mt-4 text-center text-xs text-muted-foreground/60" style={{ animationDelay: "0.34s" }}>
            No credit card required · Set up in under 2 minutes
          </p>
        </div>

        {/* App preview */}
        <div className="lp-scale-in mx-auto mt-14 max-w-4xl" style={{ animationDelay: "0.4s" }}>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
              </div>
              <div className="mx-auto flex h-6 w-56 items-center justify-center rounded-[var(--radius-xs)] bg-muted">
                <span className="text-xs font-medium text-muted-foreground/60">app.workflik.com/project</span>
              </div>
            </div>
            <div className="flex h-56 sm:h-72">
              <div className="hidden w-40 shrink-0 border-r border-border bg-sidebar px-2 py-3 sm:block">
                <div className="mb-3 flex items-center gap-1.5 px-2">
                  <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={80} height={20} className="h-4 w-auto" />
                </div>
                <p className="mb-1 px-2 text-[8px] font-semibold tracking-wide text-muted-foreground/40">Pages</p>
                <div className="space-y-0.5">
                  {[
                    { icon: "📋", label: "Product Roadmap", active: true  },
                    { icon: "📚", label: "Team Wiki",        active: false },
                    { icon: "📝", label: "Sprint Notes",     active: false },
                    { icon: "🎨", label: "Design System",    active: false },
                    { icon: "👋", label: "Onboarding",       active: false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1.5 ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/60"}`}>
                      <span className="text-xs leading-none">{item.icon}</span>
                      <span className="truncate text-xs font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-1 border-b border-border/60 px-5 py-2">
                  <span className="text-xs text-muted-foreground/40">Project</span>
                  <span className="text-xs text-muted-foreground/30">/</span>
                  <span className="text-xs font-medium text-foreground/60">Product Roadmap</span>
                </div>
                <div className="flex-1 px-7 py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <span className="text-sm font-bold text-foreground">Q3 Product Roadmap</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: "✅", text: "Ship new editor blocks", status: "Done",        pill: "bg-success/10 text-success"          },
                      { icon: "🔄", text: "Invite flow redesign",   status: "In progress", pill: "bg-primary/10 text-primary"          },
                      { icon: "📄", text: "Template gallery v2",    status: "Planned",     pill: "bg-muted text-muted-foreground"      },
                      { icon: "📊", text: "Analytics dashboard",    status: "Planned",     pill: "bg-muted text-muted-foreground"      },
                      { icon: "🔔", text: "Notification digest",    status: "Backlog",     pill: "bg-warning/10 text-warning"          },
                    ].map((row) => (
                      <div key={row.text} className="flex items-center justify-between rounded-[var(--radius-xs)] px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{row.icon}</span>
                          <span className="text-xs text-foreground/80">{row.text}</span>
                        </div>
                        <span className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-semibold ${row.pill}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border bg-card px-4 py-8 sm:px-6 sm:py-10">
        <ScrollReveal>
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              {[
                { value: "Unlimited", label: "Pages & docs"      },
                { value: "Real-time", label: "Collaboration"      },
                { value: "50+",       label: "Starter templates"  },
                { value: "< 100ms",   label: "Full-text search"   },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center bg-card px-4 py-5 text-center sm:px-6">
                  <span className="text-xl font-black tracking-tight text-foreground sm:text-2xl">{stat.value}</span>
                  <span className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-border px-4 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal className="mb-10 sm:mb-16">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Features</p>
            <h2 className="max-w-xl text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Everything a team needs.<br className="hidden sm:block" /> Nothing it doesn&rsquo;t.
            </h2>
          </ScrollReveal>
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-16">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 50}>
                <div className="flex gap-4">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
                    <f.Icon />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-base font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-border bg-card px-4 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal className="mb-10 text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Simple by design</p>
            <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Up and running in minutes</h2>
            <p className="mx-auto max-w-md text-base text-muted-foreground">No onboarding call needed. No setup wizard. Just sign in and start writing.</p>
          </ScrollReveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 70}>
                <div className="flex flex-col">
                  <span className="mb-4 text-3xl font-black tracking-tight text-primary/25">{s.num}</span>
                  <h3 className="mb-2 text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t border-border px-4 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-10 text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Loved by teams</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">What early users are saying</h2>
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 sm:p-7">
                  <div className="mb-5 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} className="size-3.5 fill-warning text-warning" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 border-t border-border pt-5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{t.initials}</span>
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

      {/* ── Use cases ── */}
      <section id="for-teams" className="border-t border-border bg-card px-4 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal className="mb-10 text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">Who it&apos;s for</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Built for every kind of team</h2>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <ScrollReveal key={u.label} delay={i * 60}>
                <div className="h-full rounded-[var(--radius-lg)] border border-border bg-page p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 sm:p-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
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

      {/* ── CTA ── */}
      <section className="border-t border-border px-4 py-14 sm:px-6 sm:py-24">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-primary/5 px-6 py-12 text-center sm:px-10 sm:py-16">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-xs font-semibold text-primary">100% free — no credit card needed</span>
            </span>
            <h2 className="mb-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Ready to bring your team together?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground sm:mb-10 sm:text-base">
              Sign up in seconds — no setup, no credit card. Start writing in your first workspace today.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            >
              Create your workspace
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <p className="mt-5 text-xs text-muted-foreground/60">No credit card required · Cancel anytime</p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">

          {/* Top row */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8 lg:grid-cols-[2fr_1fr_1fr]">

            {/* Brand */}
            <div>
              <a href="#top">
                <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-7 w-auto" />
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                The connected workspace for teams — docs, wikis, and projects all in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-wider text-primary/60">Product</h4>
              <ul className="space-y-3.5">
                {[
                  { label: "Features",     href: "#features"     },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "For teams",    href: "#for-teams"    },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-wider text-primary/60">Legal</h4>
              <ul className="space-y-3.5">
                {[
                  { label: "Privacy Policy",   href: "/privacy" },
                  { label: "Terms of Service", href: "/terms"   },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:mt-14 sm:flex-row sm:gap-3">
            <p className="text-xs text-muted-foreground/70">
              &copy; {new Date().getFullYear()} {PRODUCT_NAME}, Inc. All rights reserved.
            </p>
            <a
              href="#top"
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Back to top
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3">
                <path d="M8 12V4M4 8l4-4 4 4"/>
              </svg>
            </a>
            <p className="text-xs text-muted-foreground/70">
              Made with care for teams who build great things.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
