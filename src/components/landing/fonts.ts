import localFont from "next/font/local";

/**
 * The three faces the Framer design sets, at exactly the weights it loads.
 *
 * Roboto carries every heading (400), the hero country ticker (500) and the
 * menu links (700); the big step numerals are its 800 italic, loaded on its
 * own so the other weights do not pull italics too. Space Grotesk carries
 * prose. Mozilla Headline is used once, for the USELINQ wordmark in the footer.
 *
 * All four are self-hosted (latin subset, woff2, in src/app/fonts). They used
 * to come from next/font/google, which downloads them from Google Fonts on
 * every build: a production build on Netlify failed when Google answered with
 * font URLs this Next version's loader could not parse ("Cannot read
 * properties of null (reading '1')"). Local files make the build independent
 * of Google. Roboto (Apache 2.0) and Space Grotesk (OFL) allow redistribution.
 *
 * roboto-latin and space-grotesk-latin are variable fonts (wght 100–900 and
 * 300–700), so one file covers every weight declared below.
 */
export const roboto = localFont({
  src: "../../app/fonts/roboto-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--ls-roboto",
  display: "swap",
});

export const robotoItalic = localFont({
  src: "../../app/fonts/roboto-italic-latin.woff2",
  weight: "800",
  style: "italic",
  variable: "--ls-roboto-italic",
  display: "swap",
});

export const spaceGrotesk = localFont({
  src: "../../app/fonts/space-grotesk-latin.woff2",
  weight: "300 500",
  style: "normal",
  variable: "--ls-grotesk",
  display: "swap",
});

export const mozillaHeadline = localFont({
  src: "../../app/fonts/mozilla-headline-700-latin.woff2",
  weight: "700",
  variable: "--ls-mozilla",
  display: "swap",
});
