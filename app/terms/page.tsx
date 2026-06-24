import Image from "next/image";
import Link from "next/link";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = {
  title: `Terms of Service — ${PRODUCT_NAME}`,
};

const LAST_UPDATED = "June 1, 2025";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page text-foreground antialiased">

      {/* Header */}
      <header className="border-b border-border bg-page">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/workflik-logo.png" alt="Workflik" width={160} height={40} className="h-7 w-auto" />
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Sign in &rarr;
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">

        {/* Page title */}
        <div className="mb-12 border-b border-border pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Legal</p>
          <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-sm leading-7 text-foreground">

          <section>
            <p className="text-base text-muted-foreground">
              By accessing or using {PRODUCT_NAME}, you agree to be bound by these Terms of Service.
              Please read them carefully before using our platform.
            </p>
          </section>

          {[
            {
              title: "1. Acceptance of Terms",
              content: `By creating an account or using ${PRODUCT_NAME} in any way, you accept these Terms of Service and our Privacy Policy. If you do not agree, you may not use ${PRODUCT_NAME}.`,
            },
            {
              title: "2. Description of Service",
              content: `${PRODUCT_NAME} is a collaborative workspace platform that lets individuals and teams create, organize, and share documents, wikis, and notes. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.`,
            },
            {
              title: "3. User Accounts",
              content: `You are responsible for maintaining the security of your account and all activity that occurs under it. You must provide accurate information when creating your account and keep it up to date. You may not share your account or transfer it to another person.`,
            },
            {
              title: "4. Acceptable Use",
              content: `You agree not to use ${PRODUCT_NAME} to: (a) upload or share unlawful, harmful, or abusive content; (b) attempt to gain unauthorized access to any part of the platform; (c) use the service to send spam or engage in any form of phishing; (d) reverse engineer or attempt to extract source code from our software.`,
            },
            {
              title: "5. Your Content",
              content: `You retain ownership of all content you create or upload to ${PRODUCT_NAME}. By using our service, you grant us a limited, non-exclusive licence to store and process your content solely to provide the service to you. We do not sell or share your content with third parties.`,
            },
            {
              title: "6. Subscriptions and Billing",
              content: `${PRODUCT_NAME} may offer free and paid plans. Paid subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period and no refunds are issued for unused time.`,
            },
            {
              title: "7. Data and Privacy",
              content: `Our collection and use of personal information is described in our Privacy Policy. By using ${PRODUCT_NAME}, you consent to the data practices described there.`,
            },
            {
              title: "8. Termination",
              content: `We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from your workspace settings. Upon termination, your data will be retained for 30 days before permanent deletion, giving you time to export it.`,
            },
            {
              title: "9. Limitation of Liability",
              content: `To the maximum extent permitted by law, ${PRODUCT_NAME} and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.`,
            },
            {
              title: "10. Changes to These Terms",
              content: `We may update these Terms from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of ${PRODUCT_NAME} after changes take effect constitutes acceptance of the revised Terms.`,
            },
            {
              title: "11. Contact",
              content: `If you have questions about these Terms, please contact us at legal@workflik.com.`,
            },
          ].map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-base font-bold text-foreground">{section.title}</h2>
              <p className="text-muted-foreground">{section.content}</p>
            </section>
          ))}

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
          <Link
            href="/privacy"
            className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            &larr; Privacy Policy
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Back to home
          </Link>
        </div>

      </main>
    </div>
  );
}
