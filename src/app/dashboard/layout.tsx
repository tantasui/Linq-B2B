"use client";

import type { AnimationEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Home, LogOut, QrCode, ReceiptText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMerchantMe, setActiveBusinessId, setActiveDynamicUserId, syncMerchantWallets } from "@/lib/api-client";
import { tokensForNetwork } from "@/lib/chains";
import type { MerchantRecord, StablecoinSymbol } from "@/server/types";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Receive", href: "/dashboard/receive", icon: QrCode },
  { name: "Orders", href: "/dashboard/transactions", icon: ReceiptText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

/**
 * Belt-and-braces against a browser/GPU compositor leaving the entrance
 * animation's mid-fade frame on screen: once it actually finishes, drop the
 * class so the final state is an ordinary (non-animated) style, not a
 * composited layer that can get stuck partially transparent.
 */
function clearPageInAnimation(event: AnimationEvent<HTMLElement>) {
  if (event.target !== event.currentTarget || event.animationName !== "linq-page-in") return;
  event.currentTarget.classList.remove("linq-page-in");
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dynamic = useDynamicBridge();
  const isDashboardHome = pathname === "/dashboard";
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const lastWalletSync = useRef("");
  const dynamicUserId = dynamic.user?.id ?? "";
  const walletPayload = useMemo(
    () =>
      dynamic.wallets.map((wallet) => ({
        walletId: wallet.id,
        chain: wallet.chain,
        network: wallet.network,
        address: wallet.address,
        walletType: wallet.walletType,
        tokenSupport: (tokensForNetwork(wallet.network).length
          ? tokensForNetwork(wallet.network)
          : ["USDC"]) as StablecoinSymbol[],
      })),
    [dynamic.wallets],
  );

  useEffect(() => {
    if (dynamicUserId) setActiveDynamicUserId(dynamicUserId);
    getMerchantMe()
      .then((data) => {
        setMerchant(data.merchant);
        if (data.merchant?.id) setActiveBusinessId(data.merchant.id);
      })
      .catch(() => setMerchant(null));
  }, [dynamicUserId]);

  useEffect(() => {
    if (!merchant?.id || !walletPayload.length) return;
    const signature = JSON.stringify({ businessId: merchant.id, walletPayload });
    if (lastWalletSync.current === signature) return;
    lastWalletSync.current = signature;
    syncMerchantWallets({ businessId: merchant.id, wallets: walletPayload })
      .then(({ wallets }) => setMerchant((current) => (current ? { ...current, wallets } : current)))
      .catch(() => {
        lastWalletSync.current = "";
      });
  }, [merchant?.id, walletPayload]);

  const pageTitle = navigation.find((entry) => entry.href === pathname)?.name ?? "Dashboard";

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[248px] flex-col bg-surface px-4 pb-8 pt-6 ring-1 ring-line lg:flex">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-2.5 px-2 text-accent transition-opacity duration-fast ease-linq hover:opacity-80"
        >
          <LinqMark size={30} />
          <LinqWordmark size={17} />
        </Link>

        <div className="mb-6 flex items-center gap-3 rounded-md bg-surface-2 p-3">
          <MerchantAvatar className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{merchant?.businessName ?? "Set up business"}</p>
            <p className="text-micro text-text-subtle">Merchant</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium",
                  "transition-colors duration-fast ease-linq",
                  active
                    ? "bg-accent-soft text-accent-text"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={dynamic.disconnect}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-text-muted",
              "transition-colors duration-fast ease-linq hover:bg-danger-soft hover:text-danger",
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Log out
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Mobile shell (below lg) ── */}
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-bg lg:hidden">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-line bg-bg/85 px-5 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 transition-opacity duration-fast ease-linq hover:opacity-80"
          >
            {isDashboardHome ? (
              <>
                <MerchantAvatar className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="text-micro text-text-muted">Welcome back</p>
                  <p className="truncate text-sm font-medium">
                    {merchant?.businessName ?? "Set up business"}
                  </p>
                </div>
              </>
            ) : (
              <LinqMark size={30} className="text-accent" />
            )}
          </Link>
          <NotificationCenter />
        </header>

        <main
          key={pathname}
          className="linq-page-in min-h-[calc(100vh-68px)] px-5 pb-32 pt-6"
          onAnimationEnd={clearPageInAnimation}
        >
          {children}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 items-stretch justify-around border-t border-line bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[62px] flex-col items-center gap-1 rounded-sm py-2 text-micro",
                  "transition duration-fast ease-linq active:scale-[0.94]",
                  active ? "text-accent-text" : "text-text-subtle hover:text-text-muted",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-colors duration-fast ease-linq",
                    active && "bg-accent-soft",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Desktop content (lg+) ── */}
      <div className="hidden lg:ml-[248px] lg:block">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-bg/85 px-8 backdrop-blur-xl">
          <p className="text-sm font-medium text-text-muted">{pageTitle}</p>
          <NotificationCenter />
        </header>
        <main
          key={pathname}
          className="linq-page-in min-h-[calc(100vh-68px)] px-8 pb-16 pt-8 xl:px-12"
          onAnimationEnd={clearPageInAnimation}
        >
          <div className="mx-auto max-w-[960px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
