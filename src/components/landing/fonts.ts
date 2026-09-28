import { Roboto, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";

/**
 * The three faces the Framer design sets, at exactly the weights it loads.
 *
 * Roboto carries every heading (400), the hero country ticker (500) and the
 * menu links (700); the big step numerals are its 800 italic, loaded on its
 * own so the other weights do not pull italics too. Space Grotesk carries
 * prose.
 * Mozilla Headline is used once, for the USELINQ wordmark in the footer; it is
 * self-hosted because this Next version's Google font index predates it.
 */
export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--ls-roboto",
  display: "swap",
});

export const robotoItalic = Roboto({
  subsets: ["latin"],
  weight: "800",
  style: "italic",
  variable: "--ls-roboto-italic",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--ls-grotesk",
  display: "swap",
});

export const mozillaHeadline = localFont({
  src: "../../app/fonts/mozilla-headline-700-latin.woff2",
  weight: "700",
  variable: "--ls-mozilla",
  display: "swap",
});
