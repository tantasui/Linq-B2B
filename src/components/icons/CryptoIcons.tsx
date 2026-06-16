import type { StablecoinSymbol } from "@/lib/payment-data";

const ICON_URLS: Record<StablecoinSymbol, string> = {
  USDSUI: "https://token-metadata.bridge.xyz/images/usd_sui.png",
  USDC: "https://6778953.fs1.hubspotusercontent-na1.net/hubfs/6778953/Brand/USDC/USDC_Icon.svg",
};

export function TokenIcon({ token, size = 40 }: { token: StablecoinSymbol; size?: number }) {
  return (
    <img
      src={ICON_URLS[token]}
      alt={token}
      width={size}
      height={size}
      style={{ borderRadius: "50%", display: "block", objectFit: "cover" }}
      onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
    />
  );
}
