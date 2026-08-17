"use client";

import type { IconComponentProps } from "@web3icons/react";
import {
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkSolana,
  NetworkSui,
  NetworkTron,
} from "@web3icons/react";
import { getChain } from "@/lib/chains";

/**
 * Official chain brand marks, from the @web3icons/react set.
 *
 * Using the maintained icon package rather than hand-authored paths so the marks
 * are the real brand artwork and stay correct as brands update.
 */
const LOGOS: Record<string, React.ComponentType<IconComponentProps>> = {
  sui: NetworkSui,
  base: NetworkBase,
  bnb: NetworkBinanceSmartChain,
  solana: NetworkSolana,
  tron: NetworkTron,
};

/** Renders a chain's brand logo, falling back to a coloured initial disc. */
export function NetworkLogo({ network, size = 32 }: { network: string; size?: number }) {
  const chain = getChain(network);
  const Logo = chain ? LOGOS[chain.id] : undefined;

  if (Logo) {
    return (
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>
        <Logo size={size} variant="branded" />
      </span>
    );
  }

  const label = chain?.shortName ?? String(network ?? "?").slice(0, 3).toUpperCase();
  return (
    <span
      aria-label={chain?.name ?? network}
      style={{
        width: size,
        height: size,
        background: chain?.color ?? "#8A4FFF",
        color: "#fff",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.round(size * 0.3)),
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
