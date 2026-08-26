import type { StablecoinSymbol } from "@/lib/payment-data";

/**
 * Single source of truth for every chain the platform supports.
 *
 * Design notes (multi-chain support):
 * - The platform is a crypto -> NGN offramp. A chain is only "real" when the
 *   Linq offramp backend can issue a receive address on it and settle NGN.
 *   Adding a chain here surfaces it in the UI *and* tells the backend which
 *   `network` value to send to Linq's /b2b/offramp.
 * - `linqNetwork` is the exact string sent to Linq. It is kept separate from the
 *   canonical `id` so the wire value can be adjusted in ONE place if Linq expects
 *   a different identifier (e.g. "bsc" vs "bnb") without touching the rest of the app.
 * - USDSUI is a Sui-native coin and only exists on Sui. Every other chain offers
 *   USDC only. This is enforced by `tokens` per chain.
 * - Dynamic (wallet auth) has connectors for Sui, EVM and Solana only. Tron has no
 *   embedded connector, so merchants cannot hold embedded Tron wallets
 *   (`hasWalletConnector: false`); Tron is payer-deposit + external-address only.
 * - Chains enabled here are settled by Linq (the upstream offramp). `linqNetwork` is
 *   the exact chain string sent to Linq's /b2b/offramp; adjust it in one place if Linq
 *   expects a different identifier for a given chain.
 */

export type ChainFamily = "sui" | "evm" | "solana" | "tron" | "stellar";

export interface ChainConfig {
  /** Canonical network key used across the app (DB `network`, order.network, URLs). */
  id: string;
  name: string;
  shortName: string;
  family: ChainFamily;
  /** Stablecoins accepted on this chain. */
  tokens: StablecoinSymbol[];
  /** Exact `network` value sent to Linq's /b2b/offramp. */
  linqNetwork: string;
  /** Whether Dynamic can provide an embedded/external connector for this chain. */
  hasWalletConnector: boolean;
  /** Loose address shape check for UI/validation hints. */
  addressPattern: RegExp;
  /** Brand color used for network badges in the UI. */
  color: string;
  enabled: boolean;
}

export const CHAINS: ChainConfig[] = [
  {
    id: "sui",
    name: "Sui",
    shortName: "Sui",
    family: "sui",
    tokens: ["USDSUI", "USDC"],
    linqNetwork: "sui",
    hasWalletConnector: true,
    // Sui addresses are exactly 32 bytes (64 hex). Kept strict so a 40-hex EVM
    // address cannot pass as a Sui address in isAddressValidForNetwork().
    addressPattern: /^0x[a-fA-F0-9]{64}$/,
    color: "#4DA2FF",
    enabled: true,
  },
  {
    id: "base",
    name: "Base",
    shortName: "Base",
    family: "evm",
    tokens: ["USDC"],
    linqNetwork: "base",
    hasWalletConnector: true,
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    color: "#0052FF",
    enabled: true,
  },
  {
    id: "bnb",
    name: "BNB Smart Chain",
    shortName: "BNB",
    family: "evm",
    tokens: ["USDC"],
    // Linq's backend calls BNB Smart Chain "bsc" (see CoinType.Bsc); wire value must match.
    linqNetwork: "bsc",
    hasWalletConnector: true,
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    color: "#F0B90B",
    enabled: true,
  },
  {
    id: "solana",
    name: "Solana",
    shortName: "SOL",
    family: "solana",
    tokens: ["USDC", "USDT"],
    linqNetwork: "solana",
    hasWalletConnector: true,
    addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    color: "#14F195",
    enabled: true,
  },
  {
    id: "stellar",
    name: "Stellar",
    // The chain, not the asset. Payers send USDC on Stellar, never XLM, so
    // labelling the network "XLM" invited exactly the mistake the SEP-7 QR
    // below exists to prevent.
    shortName: "Stellar",
    family: "stellar",
    tokens: ["USDC"],
    linqNetwork: "stellar",
    // Dynamic has no Stellar connector, so merchants cannot hold an embedded
    // Stellar wallet; this is payer-deposit only, like Tron.
    hasWalletConnector: false,
    // Stellar public keys are 56 chars of base32 (RFC4648, no 0/1/8) starting
    // with G. Strict enough that no other chain's address shape can pass.
    addressPattern: /^G[A-Z2-7]{55}$/,
    color: "#7D00FF",
    enabled: true,
  },
  {
    id: "tron",
    name: "Tron",
    shortName: "TRX",
    family: "tron",
    // Tron is USDT-only: Linq's Tron watcher tracks TRC20 USDT.
    tokens: ["USDT"],
    linqNetwork: "tron",
    hasWalletConnector: false,
    addressPattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    color: "#EF0027",
    enabled: true,
  },
];

export function normalizeNetworkKey(network?: string) {
  return String(network ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/** Aliases so historical / connector-provided network strings resolve to a canonical chain. */
const NETWORK_ALIASES: Record<string, string> = {
  "sui-mainnet": "sui",
  "base-mainnet": "base",
  bsc: "bnb",
  "binance-smart-chain": "bnb",
  "bnb-smart-chain": "bnb",
  sol: "solana",
  "solana-mainnet": "solana",
  trx: "tron",
  xlm: "stellar",
  "stellar-mainnet": "stellar",
  pubnet: "stellar",
};

export function getChain(network?: string): ChainConfig | undefined {
  const key = normalizeNetworkKey(network);
  const canonical = NETWORK_ALIASES[key] ?? key;
  return CHAINS.find((chain) => chain.id === canonical);
}

export const ENABLED_CHAINS = CHAINS.filter((chain) => chain.enabled);

export function chainSupportsToken(network: string, token: StablecoinSymbol) {
  const chain = getChain(network);
  return Boolean(chain?.tokens.includes(token));
}

export function tokensForNetwork(network: string): StablecoinSymbol[] {
  return getChain(network)?.tokens ?? [];
}

export function linqNetworkFor(network: string): string {
  return getChain(network)?.linqNetwork ?? normalizeNetworkKey(network);
}

export function chainDisplayName(network?: string) {
  return getChain(network)?.name ?? String(network ?? "").replace(/-/g, " ");
}

/**
 * True when `address` has the on-chain format expected by `network`.
 *
 * This is a safety net around the offramp provider: a deposit address returned
 * for the wrong chain (e.g. a Sui address handed back for a Solana order) would
 * send the payer's funds somewhere unrecoverable. Callers should refuse to show
 * an address that fails this check rather than display it.
 */
export function isAddressValidForNetwork(address: string, network: string) {
  const chain = getChain(network);
  if (!chain) return false;
  return chain.addressPattern.test(String(address ?? "").trim());
}

/**
 * Chain-selection booleans understood by the Linq order model (CoinType).
 * Linq generates a fresh deposit wallet per chain based on these flags, so the
 * flag set here determines which chain's address comes back.
 */
export function linqCoinFlags(network: string): Record<string, boolean> {
  const chain = getChain(network);
  const key = chain?.linqNetwork ?? normalizeNetworkKey(network);
  return {
    sui: key === "sui",
    base: key === "base",
    solana: key === "solana",
    ethereum: key === "ethereum",
    aptos: key === "aptos",
    bsc: key === "bsc",
    tron: key === "tron",
    stellar: key === "stellar",
  };
}
