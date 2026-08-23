"use client";

import { useState } from "react";
import { getChain, normalizeNetworkKey } from "@/lib/chains";

/**
 * Network badges, served as the source brand SVGs.
 *
 * These are the one place multi-colour is right: users confirm they are on the
 * correct chain by recognising the brand mark, so the badges stay full-colour
 * in both light and dark mode — only the surface behind them changes. They are
 * never stretched or cropped, only scaled, and sit at a fixed diameter per
 * context: 24px in lists, 32px in the selector, 48px on the receive screen.
 *
 * Local files are preferred over a hosted URL: they render offline, cannot
 * break when a remote asset moves, and are the vector the brand actually ships.
 * REMOTE_LOGOS covers the chains we have no local file for, and falls back to
 * the lettered disc if the fetch fails — never to a gap.
 */

const NETWORK_FILES: Record<string, string> = {
  sui: "sui",
  base: "base",
  bnb: "bnb",
  solana: "solana",
  tron: "tron",
  polygon: "polygon",
  arbitrum: "arbitrum",
};

/** Chains with no local brand SVG yet. */
const REMOTE_LOGOS: Record<string, string> = {
  stellar: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
};

export function networkLogoSrc(network?: string) {
  const chain = getChain(network);
  const key = chain?.id ?? normalizeNetworkKey(network);
  const file = NETWORK_FILES[key];
  return file ? `/networks/${file}.svg` : REMOTE_LOGOS[key];
}

/** The fallback for every path: the chain's short name on its brand colour. */
function InitialDisc({ label, color, size }: { label: string; color: string; size: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: color,
        color: "#fff",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.round(size * 0.3)),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

export function NetworkLogo({
  network,
  size = 24,
  className,
}: {
  network?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = networkLogoSrc(network);
  const chain = getChain(network);

  // An unrecognised chain — or a hosted mark that would not load — still needs
  // a stable-sized badge, or rows jump when a new network appears.
  if (!src || failed) {
    return (
      <InitialDisc
        label={chain?.shortName ?? String(network ?? "?").slice(0, 3).toUpperCase()}
        color={chain?.color ?? "hsl(var(--accent))"}
        size={size}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ width: size, height: size, display: "block", flexShrink: 0, borderRadius: "50%" }}
    />
  );
}
