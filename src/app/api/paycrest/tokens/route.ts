import { CHAINS } from "@/lib/chains";
import { handleApiError, ok } from "@/server/http";
import { USDC_SUI_COIN_TYPE, USDSUI_COIN_TYPE } from "@/server/linq-offramp";
import type { StablecoinSymbol } from "@/server/types";

const TOKEN_NAMES: Record<StablecoinSymbol, string> = {
  USDSUI: "USD SUI",
  USDC: "USD Coin",
  USDT: "Tether USD",
};

// Sui move-types are the only on-chain contract identifiers we hardcode; other
// chains' USDC contract addresses are resolved by the offramp provider.
const SUI_CONTRACTS: Partial<Record<StablecoinSymbol, string>> = {
  USDSUI: USDSUI_COIN_TYPE,
  USDC: USDC_SUI_COIN_TYPE,
};

const TOKENS = CHAINS.filter((chain) => chain.enabled).flatMap((chain) =>
  chain.tokens.map((symbol) => ({
    symbol,
    network: chain.id,
    name: chain.family === "sui" && symbol === "USDC" ? "USD Coin (Sui)" : TOKEN_NAMES[symbol],
    decimals: 6,
    contractAddress: chain.family === "sui" ? SUI_CONTRACTS[symbol] : undefined,
  })),
);

export async function GET() {
  try {
    return ok({ tokens: TOKENS, cacheTtlSeconds: 900 });
  } catch (error) {
    return handleApiError(error);
  }
}
