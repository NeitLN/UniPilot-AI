import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fredoka, Nunito } from "next/font/google";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "UniPilot AI",
  description: "Personal Student Life OS",
  // F-05: the service worker + offline cache already existed (NFR-05), but
  // with no manifest the browser had no basis to offer "Add to Home
  // Screen" — this was the missing last piece, not a new subsystem.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniPilot AI",
  },
  icons: {
    icon: "/pilo-icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

// SR-06 (docs/PRODUCT_REVIEW_3.md): the manifest's own background_color
// (the PWA splash screen shown while launching from a home-screen icon)
// can't be conditioned on the OS's dark-mode preference — the Web App
// Manifest spec has no supported way to do that, static or server-
// generated (confirmed against this Next.js version's own manifest.ts
// docs: browsers don't reliably send prefers-color-scheme with a
// manifest fetch, and installed PWAs mostly cache the manifest at
// install time regardless). A dark-mode user installing the app will see
// a light splash for a moment; that's a real, known PWA platform limit,
// not something worth a fake partial fix. What *is* actually supported
// and effective here: the browser's own UI chrome color (the address bar
// on Android Chrome), via prefers-color-scheme-scoped <meta
// name="theme-color"> tags — matches --card's dark value so that chrome
// doesn't stay a bright violet bar above an otherwise all-dark shell.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6C3CF5" },
    { media: "(prefers-color-scheme: dark)", color: "#221a3d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* F-06: must run before paint so the page never flashes light-then-dark. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-canvas text-foreground">
        <TimezoneCookie />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
