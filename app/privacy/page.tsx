import Image from "next/image";
import Link from "next/link";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata = {
  title: `Privacy Policy — ${PRODUCT_NAME}`,
};

const LAST_UPDATED = "June 1, 2025";

export default function PrivacyPage() {
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
          <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Intro */}
        <div className="space-y-10 text-sm leading-7 text-foreground">

          <section>
            <p className="text-base text-muted-foreground">
              {PRODUCT_NAME} is committed to protecting your personal information. This Privacy Policy explains
              what data we collect, how we use it, and the choices you have.
            </p>
          </section>

          {[
            {
              title: "1. Information We Collect",
              content: `We collect information you provide directly, such as your name, email address, and any content you create in ${PRODUCT_NAME}. We also collect usage data automatically — such as pages visited, features used, and device information — to improve the product.`,
            },
            {
              title: "2. How We Use Your Information",
              content: `We use your information to: (a) provide and maintain the ${PRODUCT_NAME} service; (b) send you important account notifications and product updates; (c) respond to your support requests; (d) improve and develop new features. We do not sell your personal data to third parties.`,
            },
            {
              title: "3. Data Storage and Security",
              content: `Your data is stored on secure servers with industry-standard encryption at rest and in transit. We use reputable cloud infrastructure providers and follow best practices to protect your information. However, no method of transmission over the internet is 100% secure.`,
            },
            {
              title: "4. Cookies and Tracking",
              content: `We use essential cookies to keep you signed in and maintain your session. We may use analytics cookies to understand how ${PRODUCT_NAME} is used. You can disable non-essential cookies in your browser settings, though this may affect some functionality.`,
            },
            {
              title: "5. Third-Party Services",
              content: `We use a limited number of trusted third-party services to operate ${PRODUCT_NAME}, including authentication providers (such as Google OAuth) and infrastructure providers. These services have their own privacy policies and we share only the minimum data necessary.`,
            },
            {
              title: "6. Data Retention",
              content: `We retain your data for as long as your account is active. If you delete your account, we will delete your personal data and content within 30 days, except where we are required by law to retain it longer.`,
            },
            {
              title: "7. Your Rights",
              content: `Depending on your location, you may have rights to: access the personal data we hold about you; correct inaccurate data; request deletion of your data; export your data in a portable format. To exercise any of these rights, contact us at privacy@workflik.com.`,
            },
            {
              title: "8. Children's Privacy",
              content: `${PRODUCT_NAME} is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover we have inadvertently collected such data, we will delete it promptly.`,
            },
            {
              title: "9. International Transfers",
              content: `${PRODUCT_NAME} operates globally. By using our service, you consent to your information being processed in countries other than your own, which may have different data protection laws.`,
            },
            {
              title: "10. Changes to This Policy",
              content: `We may update this Privacy Policy periodically. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Continued use of ${PRODUCT_NAME} after changes take effect constitutes acceptance of the revised policy.`,
            },
            {
              title: "11. Contact Us",
              content: `If you have questions or concerns about this Privacy Policy or our data practices, please contact our privacy team at privacy@workflik.com.`,
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
            href="/terms"
            className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Terms of Service &rarr;
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
