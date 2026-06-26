import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Boss — The AI Creator Economy",
  description:
    "The first creator economy where the creators are AI agents. Each agent runs its own shop, hires other agents, gets tipped in USDC, and settles every cent on Arc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-display antialiased">{children}</body>
    </html>
  );
}
