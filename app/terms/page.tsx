import Image from "next/image";
import Link from "next/link";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = {
  title: `Terms of Service — ${PRODUCT_NAME}`,
};

const LAST_UPDATED = "June 1, 2025";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    content: `By creating an account or using ${PRODUCT_NAME} in any way, you accept these Terms of Service and our Privacy Policy. If you do not agree, you may not use ${PRODUCT_NAME}.`,
  },
  {
    title: "Description of Service",
    content: `${PRODUCT_NAME} is a collaborative workspace platform that lets individuals and teams create, organize, and share documents, wikis, and notes. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.`,
  },
  {
    title: "User Accounts",
    content: `You are responsible for maintaining the security of your account and all activity that occurs under it. You must provide accurate information when creating your account and keep it up to date. You may not share your account or transfer it to another person.`,
  },
  {
    title: "Acceptable Use",
    content: `You agree not to use ${PRODUCT_NAME} to: (a) upload or share unlawful, harmful, or abusive content; (b) attempt to gain unauthorized access to any part of the platform; (c) use the service to send spam or engage in any form of phishing; (d) reverse engineer or attempt to extract source code from our software.`,
  },
  {
    title: "Your Content",
    content: `You retain ownership of all content you create or upload to ${PRODUCT_NAME}. By using our service, you grant us a limited, non-exclusive licence to store and process your content solely to provide the service to you. We do not sell or share your content with third parties.`,
  },
  {
    title: "Subscriptions and Billing",
    content: `${PRODUCT_NAME} may offer free and paid plans. Paid subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period and no refunds are issued for unused time.`,
  },
  {
    title: "Data and Privacy",
    content: `Our collection and use of personal information is described in our Privacy Policy. By using ${PRODUCT_NAME}, you consent to the data practices described there.`,
  },
  {
    title: "Termination",
    content: `We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from your workspace settings. Upon termination, your data will be retained for 30 days before permanent deletion, giving you time to export it.`,
  },
  {
    title: "Limitation of Liability",
    content: `To the maximum extent permitted by law, ${PRODUCT_NAME} and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.`,
  },
  {
    title: "Changes to These Terms",
    content: `We may update these Terms from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of ${PRODUCT_NAME} after changes take effect constitutes acceptance of the revised Terms.`,
  },
  {
    title: "Contact",
    content: `If you have questions about these Terms, please contact us at legal@workflik.com.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page text-foreground antialiased">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/workflik-logo.png" unoptimized alt="Workflik" loading="eager" priority width={160} height={40} className="h-7 w-auto" />
          </Link>
          <Link
            href="/auth/login"
            className="rounded-[var(--radius-sm)] border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">

        {/* ── Hero title block ── */}
        <div className="mb-12">
          <span className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Legal
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          {/* Intro card */}
          <div className="mt-8 rounded-[var(--radius-lg)] border border-border/60 bg-card px-6 py-5">
            <p className="text-base leading-7 text-muted-foreground">
              By accessing or using {PRODUCT_NAME}, you agree to be bound by these Terms of Service.
              Please read them carefully before using our platform.
            </p>
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <div
              key={section.title}
              className="group rounded-[var(--radius-lg)] border border-border/50 bg-card px-6 py-5 transition-colors hover:border-border"
            >
              <div className="flex items-start gap-4">
                {/* Number badge */}
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="mb-2 text-base font-bold text-foreground">{section.title}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-14 flex items-center justify-center border-t border-border/60 pt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d="M10 12L6 8l4-4"/>
            </svg>
            Back to home
          </Link>
        </div>

      </main>
    </div>
  );
}
