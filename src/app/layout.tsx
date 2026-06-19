import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { DynamicBridgeProvider } from "@/components/providers/DynamicBridgeProvider";

export const metadata: Metadata = {
  title: "LinqSwitch | Stablecoin Payments for Modern Businesses",
  description: "Accept USDC and USDT payments across leading networks with payment links and instant settlement analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://nigerianbanklogos.xyz" />
        <link rel="dns-prefetch" href="https://nigerianbanklogos.xyz" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <DynamicBridgeProvider>
          <ClientBody>{children}</ClientBody>
        </DynamicBridgeProvider>
      </body>
    </html>
  );
}
