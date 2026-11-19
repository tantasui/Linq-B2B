"use client";

import type { AnimationEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Home, Link2, LogOut, QrCode, ReceiptText, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearActiveSession, getMerchantMe, setActiveBusinessId } from "@/lib/api-client";
import type { MerchantRecord } from "@/server/types";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { CommandMenu, type CommandItem } from "@/components/dashboard/CommandMenu";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Receive", href: "/dashboard/receive", icon: QrCode },
  { name: "Orders", href: "/dashboard/transactions", icon: ReceiptText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const commands: CommandItem[] = [
  ...navigation.map((item) => ({ id: item.href, label: item.name, group: "Go to", icon: item.icon, href: item.href })),
  { id: "new-open", label: "Create a receive link", group: "Get paid", icon: Link2, href: "/dashboard/receive" },
  {
    id: "new-fixed",
    label: "Request a set amount",
    group: "Get paid",
    icon: ReceiptText,
    href: "/dashboard/receive?mode=fixed",
  },
];

/** A section is active on its own page and on anything below it. */
function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Sessions come from the email sign-in code now, so signing out means
  // clearing the local session rather than disconnecting a wallet provider.
  const signOut = () => {
    clearActiveSession();
    router.replace("/login");
  };

  useEffect(() => {
    getMerchantMe()
      .then((data) => {
        setMerchant(data.merchant);
        if (data.merchant?.id) setActiveBusinessId(data.merchant.id);
      })
      .catch(() => setMerchant(null));
  }, []);

  // The console theme sits on <html> while the dashboard is open, so sheets,
  // the command menu and toasts (portalled to <body>) wear it too. The wrapper
  // below carries the class as well, for the server-rendered first paint.
  useEffect(() => {
    document.documentElement.classList.add("theme-console");
    return () => document.documentElement.classList.remove("theme-console");
  }, []);

  // ⌘K / Ctrl+K anywhere in the dashboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const verified = merchant?.onboardingStatus === "complete";

  return (
    <div className="theme-console min-h-screen bg-bg text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[120] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      {/* ── Sidebar: an icon rail on tablets, full from lg ── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[76px] flex-col border-r border-line bg-surface px-3 pb-6 pt-6 md:flex lg:w-[248px] lg:px-4">
        <Link
          href="/dashboard"
          aria-label="LinqSwitch home"
          className={cn(
            "mb-7 flex items-center justify-center gap-2.5 rounded-md text-[hsl(var(--brand))] transition-opacity duration-fast ease-linq hover:opacity-80 lg:justify-start lg:px-2",
            focusRing,
          )}
        >
          <LinqMark size={30} />
          <span className="hidden lg:inline">
            <LinqWordmark size={17} />
          </span>
        </Link>

        <Link
          href="/dashboard/settings"
          className={cn(
            "mb-5 flex items-center justify-center gap-3 rounded-lg p-1.5 transition-colors duration-fast ease-linq hover:bg-surface-2 lg:justify-start lg:p-2",
            focusRing,
          )}
          title={merchant?.businessName}
        >
          <MerchantAvatar className="h-9 w-9 shrink-0 rounded-full" />
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-medium">{merchant?.businessName ?? "Set up your business"}</p>
            <p className="text-micro text-text-subtle">
              {merchant ? (verified ? "Verified merchant" : "Verification in progress") : "Not set up yet"}
            </p>
          </div>
        </Link>

        <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-md px-3 py-2.5 lg:justify-start",
                  "font-sans font-medium text-[0.8125rem]",
                  "transition-colors duration-fast ease-linq",
                  focusRing,
                  active ? "bg-accent-soft text-accent-text" : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={signOut}
          title="Log out"
          className={cn(
            "mt-4 flex items-center justify-center gap-3 rounded-md px-3 py-2.5 text-text-muted lg:justify-start",
            "font-sans font-medium text-[0.8125rem]",
            "transition-colors duration-fast ease-linq hover:bg-danger-soft hover:text-danger",
            focusRing,
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </aside>

      {/* ── Top bar: one header for every width, so one notification bell
           (and one 15s poll). Phones get the merchant and a search icon;
           tablets and up get the search field beside the sidebar. ── */}
      <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-xl md:ml-[76px] md:px-6 lg:ml-[248px] xl:px-10">
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-md transition-opacity duration-fast ease-linq hover:opacity-80 md:hidden",
            focusRing,
          )}
        >
          {isDashboardHome ? (
            <>
              <MerchantAvatar className="h-10 w-10 rounded-full" />
              <div className="min-w-0">
                <p className="text-micro text-text-subtle">Welcome back</p>
                <p className="truncate text-sm font-medium">{merchant?.businessName ?? "Set up your business"}</p>
              </div>
            </>
          ) : (
            <LinqMark size={30} className="text-[hsl(var(--brand))]" />
          )}
        </Link>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "hidden h-10 w-full max-w-[340px] items-center gap-2.5 rounded-full bg-surface px-4 text-sm text-text-subtle ring-1 ring-inset ring-line md:flex",
            "transition-shadow duration-fast ease-linq hover:ring-line-strong",
            focusRing,
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Search or jump to…</span>
          <kbd className="rounded-xs bg-surface-2 px-1.5 py-0.5 font-sans text-micro ring-1 ring-line">⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full text-text-muted ring-1 ring-inset ring-line transition-colors duration-fast ease-linq hover:text-text md:hidden",
              focusRing,
            )}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* The page renders once, at every width. It used to render in a phone
          shell and a desktop shell at the same time, one of them hidden, which
          mounted every page twice and doubled each fetch and poll. */}
      <main
        id="main"
        key={pathname}
        className="linq-page-in min-h-[calc(100vh-64px)] px-4 pb-32 pt-6 md:ml-[76px] md:px-6 md:pb-16 md:pt-8 lg:ml-[248px] xl:px-10"
        onAnimationEnd={clearPageInAnimation}
      >
        <div className="mx-auto max-w-[1040px]">{children}</div>
      </main>

      {/* ── Tab bar: phones ── */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden"
      >
        {navigation.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2",
                "font-sans font-medium text-micro",
                "transition-[background-color,color,transform] duration-fast ease-linq active:scale-[0.94]",
                focusRing,
                active ? "bg-accent-soft text-accent-text" : "text-text-subtle hover:text-text-muted",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {paletteOpen ? <CommandMenu items={commands} onClose={closePalette} /> : null}
    </div>
  );
}
