import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { PatchPerformanceMeasure } from "@/components/patch-performance-measure";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/config/platform";
import { cn } from "@/lib/utils";
import "@fontsource-variable/inter";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={cn("font-sans", geistMono.variable)}
      style={{ colorScheme: "light" }}
      lang="en"
    >
      <body suppressHydrationWarning>
        <PatchPerformanceMeasure />
        {children}
      </body>
    </html>
  );
}
