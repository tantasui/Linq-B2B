import { getChain, normalizeNetworkKey } from "@/lib/chains";

/**
 * Network badges, served as the source brand SVGs.
 *
 * These are the one place multi-colour is right: users confirm they are on the
 * correct chain by recognising the brand mark, so the badges stay full-colour
 * in both light and dark mode — only the surface behind them changes. They are
 * never stretched or cropped, only scaled, and sit at a fixed diameter per
 * context: 24px in lists, 32px in the selector, 48px on the receive screen.
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

export function networkLogoSrc(network?: string) {
  const chain = getChain(network);
  const key = chain?.id ?? normalizeNetworkKey(network);
  const file = NETWORK_FILES[key];
  return file ? `/networks/${file}.svg` : undefined;
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
  const src = networkLogoSrc(network);
  const chain = getChain(network);

  // An unrecognised chain still needs a stable-sized placeholder, or rows jump
  // when a new network appears before its badge is added.
  if (!src) {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: chain?.color ?? "hsl(var(--surface-3))",
          display: "block",
          flexShrink: 0,
        }}
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
      className={className}
      style={{ width: size, height: size, display: "block", flexShrink: 0 }}
    />
  );
}
