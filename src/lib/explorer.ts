import { getChain } from "./chains";

/**
 * Explorer transaction URLs, keyed by the app's canonical network id.
 *
 * Kept apart from CHAINS because it is display-only: a missing entry here
 * costs a link, never a payment. Each is the explorer's transaction route with
 * the digest or hash appended.
 */
const TX_URL_BY_NETWORK: Record<string, (hash: string) => string> = {
  sui: (hash) => `https://suivision.xyz/txblock/${hash}`,
  solana: (hash) => `https://solscan.io/tx/${hash}`,
  base: (hash) => `https://basescan.org/tx/${hash}`,
  bnb: (hash) => `https://bscscan.com/tx/${hash}`,
  tron: (hash) => `https://tronscan.org/#/transaction/${hash}`,
  stellar: (hash) => `https://stellar.expert/explorer/public/tx/${hash}`,
};

/** Human name of the explorer a network's links point at, for link text. */
const EXPLORER_NAME_BY_NETWORK: Record<string, string> = {
  sui: "SuiVision",
  solana: "Solscan",
  base: "BaseScan",
  bnb: "BscScan",
  tron: "Tronscan",
  stellar: "Stellar Expert",
};

/**
 * Builds an explorer link for a transaction, or null when the network is
 * unknown or there is no hash yet. Callers render nothing on null — an
 * explorer link that goes nowhere is worse than no link.
 */
export function explorerTxUrl(network: string | undefined, hash: string | undefined | null) {
  if (!hash?.trim()) return null;
  const chain = getChain(network);
  const build = TX_URL_BY_NETWORK[chain?.id ?? String(network ?? "")];
  return build ? build(hash.trim()) : null;
}

/** Name of the explorer for a network, defaulting to a neutral label. */
export function explorerName(network: string | undefined) {
  const chain = getChain(network);
  return EXPLORER_NAME_BY_NETWORK[chain?.id ?? String(network ?? "")] ?? "explorer";
}

/** Shortens a hash for display: first 6 and last 6 characters. */
export function shortenHash(hash: string, lead = 6, tail = 6) {
  return hash.length <= lead + tail + 1 ? hash : `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}
