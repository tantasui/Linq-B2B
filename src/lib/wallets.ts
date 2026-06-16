import type { MerchantWalletRecord } from "@/server/types";

export function normalizeNetworkKey(network?: string) {
  return String(network ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

export function isSuiNetwork(network?: string) {
  const normalized = normalizeNetworkKey(network);
  return normalized === "sui" || normalized === "sui-mainnet" || normalized.startsWith("sui");
}

export function findWalletForNetwork(wallets: MerchantWalletRecord[] = [], network: string, token?: string) {
  const normalizedNetwork = normalizeNetworkKey(network);
  const tokenMatches = (wallet: MerchantWalletRecord) =>
    !token || wallet.tokenSupport.includes(token as MerchantWalletRecord["tokenSupport"][number]);
  return wallets.find((wallet) => normalizeNetworkKey(wallet.network) === normalizedNetwork && tokenMatches(wallet));
}

export function formatWalletLabel(wallet: Pick<MerchantWalletRecord, "network" | "chain" | "walletType">) {
  const network = wallet.network || wallet.chain || "sui";
  const type = wallet.walletType.toLowerCase();
  return `${network.replaceAll("-", " ")} ${type}`;
}

export function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-6)}` : address;
}
