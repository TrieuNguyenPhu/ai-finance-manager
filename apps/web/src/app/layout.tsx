import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Finance Manager",
  description: "Personal finance platform foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
