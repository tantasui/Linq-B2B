import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Two faces, the same two the marketing site uses, so a heading in the
 * dashboard and a heading on the landing page are literally the same type at
 * the same tracking. Inter Tight carries display and prose (400 for body, 680
 * for headings); JetBrains Mono carries every label, status and column head.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Linq — Receive from anywhere. Settle in Naira.",
  description:
    "Accept USDC, USDT and USDSUI across Sui, Base, BNB, Solana, Stellar and Tron. Payment links, deposit addresses and a receipt for every payment, settled to your Nigerian business account.",
};

/**
 * One mode, so the browser is told once. There is no boot script and no
 * `.dark` class: the tokens in globals.css are the paper palette
 * unconditionally, which also means no dark-flash to suppress. Telling the UA
 * `light` is what keeps form controls, scrollbars and autofill from being
 * rendered in the platform's dark styling over a light page.
 */
export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
      style={{ colorScheme: "light" }}
    >
      <head>
        <link rel="preconnect" href="https://nigerianbanklogos.xyz" />
        <link rel="dns-prefetch" href="https://nigerianbanklogos.xyz" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <ToastProvider>
          <ClientBody>{children}</ClientBody>
        </ToastProvider>
      </body>
    </html>
  );
}
