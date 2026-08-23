"use client";

import { cn } from "@/lib/utils";

/**
 * The chain-link mark: two links that interlock.
 *
 * Vector-identical to the source SVG — only the fill is swapped for
 * `currentColor`, so the mark inherits the surface it sits on and is never
 * recoloured off-system. Approved states are the accent on light surfaces and
 * off-white on dark or accent surfaces.
 *
 * `spinning` drives the app's signature loader: the two links pull apart and
 * interlock again on a ~1s ease-in-out loop. The metaphor is the product —
 * receiving crypto links a payer to a business — so this is used everywhere a
 * generic spinner would otherwise go: network calls, page loads, the
 * "processing" state before a receipt prints, and pull-to-refresh.
 */
export function LinqMark({
  size = 24,
  spinning = false,
  className,
}: {
  size?: number;
  spinning?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 96.18) / 131.59}
      viewBox="191 152.67 131.59 96.18"
      fill="none"
      role="presentation"
      className={cn("shrink-0", className)}
    >
      <g style={spinning ? { animation: "linq-link-left 1000ms ease-in-out infinite" } : undefined}>
        <path d="M251.773 157.934L277.89 187.63L266.03 198.138L243.5 172.519C241.636 170.399 238.41 170.198 236.297 172.069L210.774 194.683C208.661 196.556 208.461 199.791 210.325 201.912L232.854 227.531C234.718 229.652 237.944 229.853 240.057 227.982L242.709 225.632L253.178 237.537L246.462 243.488C240.042 249.175 230.246 248.562 224.579 242.119L194.881 208.345C189.214 201.902 189.825 192.068 196.243 186.381L229.89 156.567C236.31 150.88 246.107 151.492 251.773 157.934Z" fill="currentColor"/>
        <path d="M247.564 203.386L270.094 229.005C271.96 231.126 275.184 231.326 277.297 229.455L284.587 222.997L295.056 234.902L283.704 244.959C277.286 250.647 267.487 250.034 261.821 243.592L232.118 209.819C226.452 203.375 227.062 193.542 233.48 187.854L244.832 177.797L255.301 189.702L248.011 196.16C245.898 198.031 245.698 201.269 247.562 203.39L247.564 203.386Z" fill="currentColor"/>
      </g>
      <g style={spinning ? { animation: "linq-link-right 1000ms ease-in-out infinite" } : undefined}>
        <path d="M289.01 159.407L318.713 193.18C324.379 199.624 323.769 209.457 317.351 215.145L310.636 221.095L300.167 209.19L302.82 206.841C304.933 204.97 305.133 201.732 303.269 199.611L280.739 173.992C278.873 171.872 275.649 171.671 273.537 173.542L270.883 175.891L260.414 163.986L267.13 158.036C273.547 152.348 283.346 152.961 289.012 159.403L289.01 159.407Z" fill="currentColor"/>
        <path d="M294.195 206.175L318.998 234.376C320.053 235.574 319.683 237.631 318.174 238.968L311.78 244.632C310.271 245.969 308.193 246.083 307.137 244.884L282.335 216.683C281.279 215.485 281.65 213.428 283.158 212.089L289.553 206.425C291.061 205.088 293.14 204.975 294.195 206.175Z" fill="currentColor"/>
      </g>
    </svg>
  );
}

/**
 * The wordmark, straight from the source SVG.
 *
 * This is the only place "LINQ" is drawn as a logo. Nothing else re-sets it in
 * layout with a display font, so it looks identical everywhere and only ever
 * changes size — never stretched, never given a shadow, never recoloured
 * beyond the two approved states that `currentColor` allows.
 */
export function LinqWordmark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={(size * 1060) / 392}
      height={size}
      viewBox="0 0 1060 392"
      fill="none"
      role="img"
      aria-label="Linq"
      className={cn("shrink-0", className)}
    >
      <path d="M94.0952 288.898H198.856C205.407 288.898 210.716 294.226 210.716 300.802V356.423C210.716 362.999 205.407 368.327 198.856 368.327H11.8599C5.30856 368.327 0 362.999 0 356.423V19.1217C0 12.546 5.30856 7.21753 11.8599 7.21753H70.3633C76.9146 7.21753 82.2231 12.546 82.2231 19.1217V276.981C82.2231 283.557 87.5318 288.885 94.0831 288.885L94.0952 288.898Z" fill="currentColor"/>
        <path d="M258.567 7.21753H317.07C323.622 7.21753 328.93 12.546 328.93 19.1217V356.423C328.93 362.999 323.622 368.327 317.07 368.327H258.567C252.016 368.327 246.707 362.999 246.707 356.423V19.1217C246.707 12.546 252.016 7.21753 258.567 7.21753Z" fill="currentColor"/>
        <path d="M582.414 7.21753H640.917C647.468 7.21753 652.777 12.546 652.777 19.1217V356.423C652.777 362.999 647.468 368.327 640.917 368.327H597.23C593.393 368.327 589.785 366.463 587.553 363.314L473.865 202.71C467.169 193.252 452.329 198.012 452.329 209.613V356.411C452.329 362.987 447.02 368.315 440.469 368.315H381.965C375.414 368.315 370.105 362.987 370.105 356.411V19.1217C370.105 12.546 375.414 7.21753 381.965 7.21753H425.653C429.49 7.21753 433.097 9.08248 435.329 12.2311L549.018 172.835C555.714 182.293 570.554 177.533 570.554 165.932V19.1338C570.554 12.5581 575.862 7.22963 582.414 7.22963V7.21753Z" fill="currentColor"/>
        <path d="M1059.94 187.779C1059.94 232.453 1046.26 271.798 1018.9 305.815L1046.35 335.086C1050.97 340.014 1050.62 347.801 1045.58 352.294L1004.38 388.975C999.54 393.286 992.168 392.947 987.728 388.224L957.336 355.83C930.54 368.982 902.392 375.557 872.857 375.557C820.772 375.557 776.566 357.501 740.25 321.389C703.923 285.277 685.765 240.736 685.765 187.779C685.765 134.821 703.923 90.2805 740.25 54.1683C776.566 18.0561 820.772 0 872.857 0C924.942 0 969.136 18.0561 1005.46 54.1683C1041.78 90.2805 1059.95 134.821 1059.95 187.779H1059.94ZM872.99 295.086L900.305 295.062L854.579 246.319C849.958 241.39 850.308 233.591 855.351 229.098L896.553 192.417C901.391 188.106 908.763 188.445 913.202 193.168L962.862 246.089C962.862 246.089 962.995 246.125 963.019 246.064C972.804 228.19 977.702 208.753 977.702 187.779C977.702 156.135 967.676 130.341 947.636 110.395C927.596 90.4501 902.658 80.4714 872.857 80.4714C843.056 80.4714 818.118 90.4501 798.078 110.395C778.038 130.341 768.012 156.135 768.012 187.779C768.012 219.422 778.038 245.217 798.114 265.162C818.178 285.107 843.141 295.086 872.99 295.086Z" fill="currentColor"/>
    </svg>
  );
}

/**
 * Mark + wordmark lockup. Splash, marketing header and shared receipts only —
 * in-app chrome uses the mark alone.
 */
export function LinqLockup({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LinqMark size={size * 1.5} />
      <LinqWordmark size={size} />
    </span>
  );
}

/** The app's one loading indicator. */
export function LinqLoader({
  size = 32,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 text-accent", className)} role="status">
      <LinqMark size={size} spinning />
      {label ? <p className="text-xs text-text-muted">{label}</p> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
