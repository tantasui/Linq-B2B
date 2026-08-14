import { getChain } from "@/lib/chains";

/**
 * Brand marks for the supported chains, inlined as SVG.
 *
 * Inlined rather than pulled from an icon CDN so the logos render offline, can't
 * break when a remote asset moves, and add no runtime dependency. Each mark is
 * drawn inside a 24x24 viewBox on the chain's brand-coloured disc.
 */

type LogoProps = { size: number };

function Disc({ color, size, children }: { color: string; size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="presentation" style={{ display: "block", borderRadius: "50%" }}>
      <circle cx="12" cy="12" r="12" fill={color} />
      {children}
    </svg>
  );
}

function SuiLogo({ size }: LogoProps) {
  return (
    <Disc color="#4DA2FF" size={size}>
      {/* Water-drop mark */}
      <path
        d="M12 4.6c0 0 4.7 5 4.7 8.3a4.7 4.7 0 1 1-9.4 0C7.3 9.6 12 4.6 12 4.6Zm0 2.9c-.9 1.2-2.9 3.9-2.9 5.4a2.9 2.9 0 1 0 5.8 0c0-1.5-2-4.2-2.9-5.4Z"
        fill="#fff"
      />
    </Disc>
  );
}

function BaseLogo({ size }: LogoProps) {
  return (
    <Disc color="#0052FF" size={size}>
      {/* Circle with a vertical slice removed on the right */}
      <path
        d="M11.9 5.2c3.5 0 6.4 2.9 6.6 6.2h-9.2v1.2h9.2c-.2 3.3-3.1 6.2-6.6 6.2a6.8 6.8 0 1 1 0-13.6Z"
        fill="#fff"
      />
    </Disc>
  );
}

function BnbLogo({ size }: LogoProps) {
  return (
    <Disc color="#F0B90B" size={size}>
      {/* Four diamonds around a centre diamond */}
      <g fill="#fff">
        <path d="m12 4.9 2.1 2.1L12 9.1 9.9 7Z" />
        <path d="m7.1 9.8 2.1 2.1-2.1 2.1L5 11.9Z" />
        <path d="m16.9 9.8 2.1 2.1-2.1 2.1-2.1-2.1Z" />
        <path d="m12 14.7 2.1 2.1L12 18.9 9.9 16.8Z" />
        <path d="m12 9.9 2 2-2 2-2-2Z" />
      </g>
    </Disc>
  );
}

function SolanaLogo({ size }: LogoProps) {
  return (
    <Disc color="#000000" size={size}>
      {/* Three slanted bars */}
      <defs>
        <linearGradient id="sol-g" x1="4" y1="18" x2="20" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <g fill="url(#sol-g)">
        <path d="M7.4 15.6a.6.6 0 0 1 .43-.18h10.1c.27 0 .4.32.21.5l-1.83 1.83a.6.6 0 0 1-.43.18H5.79a.29.29 0 0 1-.21-.5Z" />
        <path d="M7.4 6.07a.6.6 0 0 1 .43-.18h10.1c.27 0 .4.33.21.51l-1.83 1.83a.6.6 0 0 1-.43.18H5.79a.29.29 0 0 1-.21-.5Z" />
        <path d="M16.6 10.8a.6.6 0 0 0-.43-.18H6.07a.29.29 0 0 0-.21.5l1.83 1.83a.6.6 0 0 0 .43.18h10.1c.27 0 .4-.32.21-.5Z" />
      </g>
    </Disc>
  );
}

function TronLogo({ size }: LogoProps) {
  return (
    <Disc color="#EF0027" size={size}>
      {/* Angular delta mark */}
      <path d="M5.4 6.2 18 8.6l-5.7 10.4L5.4 6.2Zm2.4 2 3.6 6.6.3-5.6-3.9-1Zm5.1 1.2-.3 5.3 3.1-5.7-2.8.4Z" fill="#fff" />
    </Disc>
  );
}

const LOGOS: Record<string, (props: LogoProps) => React.ReactElement> = {
  sui: SuiLogo,
  base: BaseLogo,
  bnb: BnbLogo,
  solana: SolanaLogo,
  tron: TronLogo,
};

/** Renders the brand logo for a chain, falling back to a coloured initial disc. */
export function NetworkLogo({ network, size = 32 }: { network: string; size?: number }) {
  const chain = getChain(network);
  const Logo = chain ? LOGOS[chain.id] : undefined;
  if (Logo) return <Logo size={size} />;

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
