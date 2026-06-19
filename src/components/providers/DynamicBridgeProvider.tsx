"use client";

import { DynamicContextProvider, useDynamicContext, useRefreshUser, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearActiveSession, setActiveDynamicUserId } from "@/lib/api-client";

export interface DynamicWalletView {
  id: string;
  address: string;
  network: string;
  chain: string;
  walletType: "EMBEDDED" | "EXTERNAL";
}

type DynamicBridge = {
  enabled: boolean;
  connected: boolean;
  user?: { id: string; email: string; name?: string };
  wallets: DynamicWalletView[];
  connect: () => Promise<void>;
  disconnect: () => void;
};

const Context = createContext<DynamicBridge | null>(null);

function normalizeWalletNetwork(value: unknown) {
  const normalized = String(value ?? "sui").trim().toLowerCase();
  if (!normalized || normalized.includes("embedded") || normalized.includes("turnkey")) return "sui";
  return normalized;
}

async function resolveWalletAddress(rawWallet: Record<string, unknown>, connector?: Record<string, unknown>) {
  const direct = String(rawWallet.address ?? "");
  if (direct) return direct;

  const getAddress = connector?.getAddress;
  if (typeof getAddress === "function") {
    const address = await getAddress.call(connector).catch(() => undefined);
    if (address) return String(address);
  }

  const getConnectedAccounts = connector?.getConnectedAccounts;
  if (typeof getConnectedAccounts === "function") {
    const accounts = await getConnectedAccounts.call(connector).catch(() => undefined);
    if (Array.isArray(accounts) && accounts[0]) return String(accounts[0]);
  }

  return "";
}

export function DynamicBridgeProvider({ children }: { children: React.ReactNode }) {
  const environmentId = (process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID ?? "").trim();
  const invalidEnvironmentIds = new Set([
    "",
    "your_dynamic_environment_id",
    "your-dynamic-environment-id",
    "dynamic_environment_id",
    "replace_me",
  ]);
  const enabled =
    Boolean(environmentId) &&
    !invalidEnvironmentIds.has(environmentId.toLowerCase()) &&
    !environmentId.toLowerCase().includes("your_dynamic");

  if (!enabled) {
    return <OfflineDynamicBridgeProvider>{children}</OfflineDynamicBridgeProvider>;
  }

  return (
    <DynamicContextProvider
      settings={{
        appName: "LinqSwitch",
        environmentId,
        walletConnectors: [SuiWalletConnectors],
        cssOverrides: ".dynamic-widget-inline-controls { display: none !important; }",
      }}
    >
      <LiveDynamicBridgeProvider>{children}</LiveDynamicBridgeProvider>
    </DynamicContextProvider>
  );
}

function OfflineDynamicBridgeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<DynamicBridge>(
    () => ({
      enabled: false,
      connected: false,
      user: undefined,
      wallets: [],
      connect: async () => {
        throw new Error("Sign-in is not configured yet. Add the live auth environment id and redeploy.");
      },
      disconnect: () => undefined,
    }),
    [],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function LiveDynamicBridgeProvider({ children }: { children: React.ReactNode }) {
  const { handleLogOut, primaryWallet, setShowAuthFlow, user } = useDynamicContext();
  const refreshUser = useRefreshUser();
  const userWallets = useUserWallets();
  const refreshAttemptedForUser = useRef("");
  const [wallets, setWallets] = useState<DynamicWalletView[]>([]);

  useEffect(() => {
    let cancelled = false;
    const source = userWallets.length ? userWallets : primaryWallet ? [primaryWallet] : [];

    async function loadWallets() {
      const resolved = await Promise.all(
        source.map(async (wallet) => {
          const rawWallet = wallet as unknown as Record<string, unknown>;
          const connector = rawWallet.connector as Record<string, unknown> | undefined;
          const address = await resolveWalletAddress(rawWallet, connector);
          const chain = normalizeWalletNetwork(rawWallet.chain ?? connector?.connectedChain ?? "sui");
          const network = normalizeWalletNetwork(rawWallet.network ?? connector?.connectedNetwork ?? chain);
          const key = String(connector?.key ?? rawWallet.key ?? "");
          const walletType: DynamicWalletView["walletType"] =
            key.toLowerCase().includes("embedded") || key.toLowerCase().includes("turnkey") ? "EMBEDDED" : "EXTERNAL";

          return {
            id: String(rawWallet.id ?? address ?? ""),
            address,
            network,
            chain,
            walletType,
          };
        }),
      );

      if (!cancelled) setWallets(resolved.filter((wallet) => wallet.address));
    }

    void loadWallets();

    return () => {
      cancelled = true;
    };
  }, [primaryWallet, userWallets]);

  useEffect(() => {
    const rawUser = user as unknown as Record<string, unknown> | undefined;
    const id = String(rawUser?.userId ?? rawUser?.id ?? rawUser?.subject ?? "");
    if (!id) return;
    setActiveDynamicUserId(id);
  }, [user]);

  useEffect(() => {
    const rawUser = user as unknown as Record<string, unknown> | undefined;
    const id = String(rawUser?.userId ?? rawUser?.id ?? rawUser?.subject ?? "");
    if (!id || wallets.length || refreshAttemptedForUser.current === id) return;
    refreshAttemptedForUser.current = id;
    const timeout = window.setTimeout(() => {
      void refreshUser().catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [refreshUser, user, wallets.length]);

  const value = useMemo<DynamicBridge>(() => {
    const rawUser = user as unknown as Record<string, unknown> | undefined;
    const email = String(rawUser?.email ?? "");
    const firstName = String(rawUser?.firstName ?? "");
    const lastName = String(rawUser?.lastName ?? "");
    const alias = String(rawUser?.alias ?? "");
    const name = [firstName, lastName].filter(Boolean).join(" ") || alias || undefined;

    return {
      enabled: true,
      connected: Boolean(user || primaryWallet || wallets.length),
      user: rawUser
        ? {
            id: String(rawUser.userId ?? rawUser.id ?? rawUser.subject ?? email),
            email,
            name,
          }
        : undefined,
      wallets,
      connect: async () => {
        setShowAuthFlow(true);
      },
      disconnect: () => {
        clearActiveSession();
        void handleLogOut();
      },
    };
  }, [handleLogOut, primaryWallet, setShowAuthFlow, user, wallets]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDynamicBridge() {
  const value = useContext(Context);
  if (!value) throw new Error("useDynamicBridge must be used inside DynamicBridgeProvider.");
  return value;
}
