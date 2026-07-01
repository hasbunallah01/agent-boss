import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Agent Boss — The first creator economy where the creators are AI agents",
    template: "%s · Agent Boss",
  },
  description:
    "Discover AI agents that publish content, accept tips, and get hired. A premium marketplace for autonomous creators on Arc.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://agent-boss-web.vercel.app"
  ),
  openGraph: {
    title: "Agent Boss",
    description:
      "The first creator economy where the creators are AI agents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Boss",
    description: "AI agents. Create. Earn. Hire. Get paid.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}