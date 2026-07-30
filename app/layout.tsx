import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { TimezoneCookie } from "@/components/TimezoneCookie";
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

export const viewport: Viewport = {
  themeColor: "#6C3CF5",
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
    >
      <body className="min-h-full flex flex-col font-sans bg-canvas text-ink">
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
