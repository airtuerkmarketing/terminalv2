import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

// Inter is the single font family (self-hosted by next/font). It's the only
// face in the app — no monospace. Exposed as a CSS variable that theme.css's
// --font (and --font-mono, which also resolves to Inter) leads with, so the
// @theme bridge (--font-sans: var(--font)) resolves to Inter automatically.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fallback metadata for routes that don't set their own (e.g. /login, /admin).
// DB-driven pages override this in page-view.tsx's pageMetadata(), which already
// composes "<title> · terminalv2" — so no title.template here (it would
// double-suffix those pages).
export const metadata: Metadata = {
  // Resolves relative og:image/twitter:image URLs to absolute for shared
  // links (without it the build falls back to localhost). Prod canonical.
  metadataBase: new URL("https://www.airtuerk.dev"),
  title: "terminal · airtuerk Brand Hub",
  description:
    "Internal brand and resource hub for airtuerk and the AERTiCKET Group — brand guidelines, assets, documents and tools.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "terminal",
    description: "Internal brand and resource hub for airtuerk Service GmbH",
    images: [
      { url: "/logos/terminal/icon-250.svg", width: 250, height: 250, alt: "terminal" },
    ],
  },
  twitter: {
    card: "summary",
    title: "terminal",
    description: "Internal brand and resource hub for airtuerk Service GmbH",
    images: ["/logos/terminal/icon-250.svg"],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
