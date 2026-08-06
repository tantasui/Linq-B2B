import { getChain } from "@/lib/chains";
import type { StablecoinSymbol } from "@/lib/payment-data";

const ICON_URLS: Record<StablecoinSymbol, string> = {
  USDSUI: "https://token-metadata.bridge.xyz/images/usd_sui.png",
  USDC: "https://6778953.fs1.hubspotusercontent-na1.net/hubfs/6778953/Brand/USDC/USDC_Icon.svg",
};

export function NetworkIcon({ network, size = 40 }: { network: string; size?: number }) {
  const chain = getChain(network);
  const color = chain?.color ?? "#8A4FFF";
  const label = chain?.shortName ?? network.slice(0, 3).toUpperCase();
  return (
    <span
      aria-label={chain?.name ?? network}
      style={{
        width: size,
        height: size,
        background: color,
        color: color === "#F0B90B" || color === "#14F195" ? "#111" : "#fff",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.round(size * 0.26)),
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

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
