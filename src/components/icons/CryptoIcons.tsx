import type { StablecoinSymbol } from "@/lib/payment-data";

export function TokenIcon({ token, size = 40 }: { token: StablecoinSymbol; size?: number }) {
  if (token === "USDSUI") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-label="USDSUI" role="img">
        <circle cx="20" cy="20" r="20" fill="#4DA2FF" />
        <text x="20" y="17" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="sans-serif">USD</text>
        <text x="20" y="27" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="sans-serif">SUI</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="USDC" role="img">
      <circle cx="20" cy="20" r="20" fill="#2775CA" />
      <circle cx="20" cy="20" r="12.8" fill="none" stroke="white" strokeWidth="2" />
      <path d="M23.8 14.9a8 8 0 0 0-3.2-.7c-2.2 0-3.8 1.2-3.8 3 0 4.3 7.1 2.3 7.1 5.7 0 1.8-1.6 2.9-3.7 2.9a8.2 8.2 0 0 1-4-1.1M20.2 12v16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
