import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import { DynamicBridgeProvider } from "@/components/providers/DynamicBridgeProvider";
import { ThemeProvider, themeBootScript } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";

/**
 * One typeface across the product. Inter is the web counterpart to SF Pro on
 * iOS, so a screen built once from the shared spec reads the same on both.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Linq — Stablecoin payments for modern businesses",
  description:
    "Accept USDC and USDT payments across leading networks with payment links and instant settlement to Naira.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F8" },
    { media: "(prefers-color-scheme: dark)", color: "#141416" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Applied before first paint: without it the page renders light and
            then snaps to dark once React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://nigerianbanklogos.xyz" />
        <link rel="dns-prefetch" href="https://nigerianbanklogos.xyz" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <DynamicBridgeProvider>
              <ClientBody>{children}</ClientBody>
            </DynamicBridgeProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
