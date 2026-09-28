import Link from "next/link";

/**
 * The design's glossy pill: a rim gradient, a radial face inset 1px, and an
 * inset highlight. "dark" is the Login pill, "primary" is Get started. Hover
 * (desktop frame only) is pure CSS, in landing.css.
 */
export function PillButton({ href, variant, children }: { href: string; variant: "dark" | "primary"; children: string }) {
  return (
    <Link href={href} className={`ls-pill ls-pill--${variant}`}>
      <span className="ls-pill__face">
        <span className="ls-pill__rim" />
        <span className="ls-pill__core" />
        <span className="ls-pill__label">{children}</span>
      </span>
    </Link>
  );
}
