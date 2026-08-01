import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  weight: "variable",
  style: "normal",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ai-finance-manager",
    template: "%s · ai-finance-manager",
  },
  description:
    "A calm personal ledger for accounts, transactions, budgets, and AI-assisted drafts you approve before recording.",
  openGraph: {
    type: "website",
    siteName: "ai-finance-manager",
    title: "Your money deserves a paper trail.",
    description: "AI drafts. You review. The ledger records.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your money deserves a paper trail.",
    description: "AI drafts. You review. The ledger records.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
