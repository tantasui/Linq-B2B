import { handleApiError, ok } from "@/server/http";
import { USDC_SUI_COIN_TYPE, USDSUI_COIN_TYPE } from "@/server/linq-offramp";

const SUI_TOKENS = [
  {
    symbol: "USDSUI",
    network: "sui",
    name: "USD SUI",
    decimals: 6,
    contractAddress: USDSUI_COIN_TYPE,
  },
  {
    symbol: "USDC",
    network: "sui",
    name: "USD Coin (Sui)",
    decimals: 6,
    contractAddress: USDC_SUI_COIN_TYPE,
  },
];

export async function GET() {
  try {
    return ok({ tokens: SUI_TOKENS, cacheTtlSeconds: 900 });
  } catch (error) {
    return handleApiError(error);
  }
}
