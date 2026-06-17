import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fallback metadata for routes that don't set their own (e.g. /login, /admin).
// DB-driven pages override this in page-view.tsx's pageMetadata(), which already
// composes "<title> · terminalv2" — so no title.template here (it would
// double-suffix those pages).
export const metadata: Metadata = {
  title: "terminalv2 · airtuerk Brand Hub",
  description:
    "Internal brand and resource hub for airtuerk and the AERTiCKET Group — brand guidelines, assets, documents and tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="ios18-light"
      data-sidebar="expanded"
      data-orbs="on"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
