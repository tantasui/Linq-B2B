import Link from "next/link";
import { AuthRedirect } from "@/components/AuthRedirect";
import { Receipt } from "@/components/brand/Receipt";
import { LANDING_SOCIALS, LandingCoin, LandingLockup, LandingPlane } from "@/components/landing/LandingArt";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { ENABLED_CHAINS } from "@/lib/chains";
import type { OrderRecord } from "@/server/types";
import "./landing.css";

/**
 * The marketing page.
 *
 * Composition, type scale and motion are the Telegram site's, scene for scene —
 * see landing.css and /landing/main.js. What differs is everything the two
 * products do not share, and those differences are marked `B2B` below:
 *
 *   · There is no bot. Scene 03 is "payment links", and it shows the product's
 *     own <Receipt /> rather than a screenshot of a chat confirmation.
 *   · There are accounts, so the nav carries a log-in and every call to action
 *     points at /onboarding instead of t.me.
 *   · The chain roster is smaller and specific. The Telegram page lists eleven
 *     chains including Bitcoin and Ethereum; this platform settles six, and the
 *     scene is generated from ENABLED_CHAINS so the page cannot claim a chain
 *     the backend cannot issue an address on.
 *
 * The page is a server component: only the motion boot, the receipt and the
 * signed-in nudge are client-side. With JavaScript off every scene is still
 * typeset and readable — the motion is an enhancement, not the content.
 */

/** Where every primary call to action goes. The bot's t.me link has no analogue here. */
const START_HREF = "/onboarding";

/** B2B — a representative settled order, so Scene 03 shows the real surface. */
const sceneReceipt: OrderRecord = {
  id: "ord_8fd21c4a",
  businessId: "biz_1",
  payerName: "Adaeze Okonkwo",
  payerEmail: "adaeze@example.com",
  amountNgn: 485_000,
  token: "USDC",
  network: "stellar",
  quotedRate: 1612,
  cryptoAmountDue: 300.87,
  transactionFee: 0.45,
  paycrestOrderId: "3f8a1c7d92b45e60a1d83c4f7e29b0d6c58a3719fe402bd6183c9a75e4b02d18",
  status: "settled",
  createdAt: "2026-01-14T10:24:00.000Z",
  updatedAt: "2026-01-14T10:24:00.000Z",
};

/**
 * B2B — the roster is the platform's, not the bot's.
 *
 * Both numbers in Scene 04's headline and every row under it come from
 * ENABLED_CHAINS, so adding or removing a chain in one place updates the
 * marketing claim with it.
 */
const CHAIN_COUNT = ENABLED_CHAINS.length;
const TOKEN_COUNT = new Set(ENABLED_CHAINS.flatMap((chain) => chain.tokens)).size;

/**
 * Each row fills with its chain's own brand colour on hover, which means the
 * text on top has to flip between ink and paper per chain. Relative luminance
 * decides it rather than a hand-kept list, so a new chain's colour is handled
 * the moment it is added.
 */
function readableOn(hex: string) {
  const value = hex.replace("#", "");
  const channel = (offset: number) => {
    const srgb = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.4 ? "var(--ink)" : "var(--paper)";
}

/** The word the rates headline rolls through. Coins first, then the chains they land on. */
const RATE_WORDS = ["CRYPTO.", "USDC.", "USDT.", "USDSUI.", ...ENABLED_CHAINS.map((c) => `${c.shortName.toUpperCase()}.`)];

/**
 * The cards that ride the rail. Every one names a chain the platform actually
 * settles and carries that chain's coin — the Telegram page's Bitcoin and
 * Ethereum cards would be a promise this product does not make.
 */
const RAIL_CARDS = [
  { coin: "base", sent: "Sent 300 USDC", got: "Ravel Studio received ₦483,600", short: "Received ₦483,600" },
  { coin: "sui", sent: "Sent 1,200 USDSUI", got: "Sable & Co received ₦1,934,400", short: "Received ₦1,934,400" },
  { coin: "sol", sent: "Sent 850 USDC", got: "Nnamdi Ltd received ₦1,370,200", short: "Received ₦1,370,200" },
  { coin: "bnb", sent: "Sent 590 USDC", got: "Mama Tolu Foods received ₦951,080", short: "Received ₦951,080" },
  { coin: "base", sent: "Sent 500 USDC", got: "Lagos Print Co received ₦806,000", short: "Received ₦806,000" },
  { coin: "sol", sent: "Sent 135 USDT", got: "Kọ́lá Logistics received ₦217,620", short: "Received ₦217,620" },
  { coin: "sui", sent: "Sent 623 USDC", got: "Verde Farms received ₦1,004,276", short: "Received ₦1,004,276" },
  { coin: "bnb", sent: "Sent 2,400 USDC", got: "Ayo Motors received ₦3,868,800", short: "Received ₦3,868,800" },
];

/** B2B — set up once, get paid forever. Written against the dashboard, not a chat. */
const STEPS = [
  ["01", "CREATE YOUR ACCOUNT", "Business name and email. No paperwork to upload."],
  ["02", "VERIFY YOUR PAYOUT", "Link the bank account we settle into. About a minute, once."],
  ["03", "SHARE A PAYMENT LINK", "Price it once. Your customer picks the chain and the coin."],
  ["04", "GET NAIRA", "We convert and settle, with a receipt. Usually before the tab closes."],
];

/** The 19 stamps, in the passport grid's own order. `null` is a deliberate gap. */
const FLAGS: Array<[string, string, number] | null> = [
  ["US.svg", "United States", -3],
  ["UK.svg", "United Kingdom", 4],
  ["ARG 1.svg", "Argentina", -6],
  null,
  ["AUT 1.svg", "Austria", 5],
  ["BEL 1.svg", "Belgium", -2],
  ["CIV 1.svg", "Côte d’Ivoire", 7],
  ["COD 1.svg", "DR Congo", -5],
  ["COL 1.svg", "Colombia", 3],
  ["CPV 1.svg", "Cape Verde", -4],
  ["CRO 1.svg", "Croatia", 6],
  null,
  ["ESP 1.svg", "Spain", -7],
  ["FRA 1.svg", "France", 2],
  ["GHA 1.svg", "Ghana", -3],
  ["MAR 1.svg", "Morocco", 5],
  ["NED 1.svg", "Netherlands", -6],
  null,
  ["NOR 1.svg", "Norway", 4],
  ["POR 1.svg", "Portugal", -2],
  ["SEN 1.svg", "Senegal", 6],
  ["SWE 1.svg", "Sweden", -4],
];

export default function Home() {
  return (
    <div className="linq-landing">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      {/* Client-side, and only for a merchant who already has a session. */}
      <AuthRedirect />

      {/* ===================== NAV ===================== */}
      <header className="site-header">
        <nav className="nav" aria-label="Primary">
          <Link className="nav__brand" href="#hero" aria-label="Linq — home">
            <LandingLockup />
          </Link>

          <ul className="nav__links">
            <li>
              <a href="#receive">
                <span className="nav__num">01</span> ACCEPT
              </a>
            </li>
            <li>
              <a href="#payment-links">
                <span className="nav__num">02</span> PAYMENT LINKS
              </a>
            </li>
            <li>
              <a href="#chains">
                <span className="nav__num">03</span> CHAINS
              </a>
            </li>
            <li>
              <a href="#rates">
                <span className="nav__num">04</span> RATES
              </a>
            </li>
          </ul>

          {/* B2B — the bot has no account to return to; a dashboard does. */}
          <Link className="nav__login" href="/login">
            LOG IN
          </Link>
          <Link className="btn btn--nav" href={START_HREF}>
            START ACCEPTING <span aria-hidden="true">↗</span>
          </Link>
        </nav>
        <span className="nav__progress" aria-hidden="true" />
      </header>

      <main id="content">
        {/* ===================== SCENE 01 — HERO ===================== */}
        <section id="hero" className="scene scene--hero" aria-labelledby="hero-h">
          <span className="hero__stars" aria-hidden="true" />
          <div className="globe" aria-hidden="true" />
          <div className="l-grid scene__inner">
            <h1 id="hero-h" className="display hero__title">
              RECEIVE
              <br />
              FROM ANYWHERE.
              <br />
              SETTLE IN
              <br />
              NAIRA.
            </h1>
            {/* B2B — the bot's promise was "inside Telegram, no app". This one's
                is the dashboard the merchant runs their business from. */}
            <p className="mono hero__sub">CRYPTO &rarr; NAIRA. PAYMENT LINKS, RECEIPTS, ONE DASHBOARD.</p>
          </div>
        </section>

        {/* ===================== SCENE 02 — ACCEPT / FLAG STAMPS ===================== */}
        <section id="receive" className="scene scene--receive" aria-labelledby="receive-h">
          <span className="marker mono" aria-hidden="true">
            01 — ACCEPT
          </span>
          <div className="l-grid scene__inner">
            <div className="receive__copy">
              <h2 id="receive-h" className="display scene__title">
                195+ COUNTRIES PAY YOU.
                <br />
                YOU GET NAIRA.
              </h2>
              <p className="body scene__body">
                A customer in Lisbon checks out in USDC. A client in Toronto settles an invoice in
                USDT. It lands in your Nigerian business account in Naira, in under a minute, at a
                rate you&rsquo;d actually accept.
              </p>
            </div>

            <div className="stamps" role="list" aria-label="Countries your customers can pay from">
              {FLAGS.map((flag, index) =>
                flag === null ? (
                  <span key={`gap-${index}`} className="stamp stamp--empty" aria-hidden="true" />
                ) : (
                  <span
                    key={flag[0]}
                    className="stamp"
                    style={{ "--r": `${flag[2]}deg` } as React.CSSProperties}
                    role="listitem"
                  >
                    {/* Deliberately not next/image: these are rendered at or below
                        native size and the stamp grid is measured by main.js. */}
                    <img
                      src={`/landing/assets/source/flags/${encodeURIComponent(flag[0])}`}
                      width={104}
                      height={69}
                      alt={flag[1]}
                    />
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* ===================== SCENE 03 — PAYMENT LINKS ===================== */}
        {/* B2B — the Telegram site's "THE BOT". Same beat in the composition, a
            different object: a payment link and the receipt it prints. */}
        <section id="payment-links" className="scene scene--links" aria-labelledby="links-h">
          <span className="marker mono" aria-hidden="true">
            02 — PAYMENT LINKS
          </span>
          <div className="l-grid scene__inner">
            <div className="links__copy">
              <h2 id="links-h" className="display scene__title">
                ONE LINK.
                <br />
                ANY CHAIN.
                <br />
                PAID IN
                <br />
                NAIRA.
              </h2>
              <p className="body scene__body">
                Send a customer one payment link. They pick the chain and the stablecoin they
                already hold. You get Naira in your business account, and every payment lands in
                your dashboard with a receipt attached. No exchange account, no P2P merchant, no
                waiting on a &ldquo;vendor&rdquo; to come online.
              </p>
              <p className="mono scene__handle">A RECEIPT FOR EVERY PAYMENT</p>
            </div>

            {/* The receipt is the product's signature surface — show it, don't
                describe it. This is the same component the dashboard and the
                PDF export render. */}
            <div className="links__screen" aria-hidden="true">
              <Receipt order={sceneReceipt} merchant={{ businessName: "Mama Tolu Foods" }} printing />
            </div>
          </div>
        </section>

        {/* ===================== SCENE 04 — CHAINS ===================== */}
        <section id="chains" className="scene scene--chains" aria-labelledby="chains-h">
          <span className="marker mono" aria-hidden="true">
            03 — CHAINS
          </span>
          <div className="l-grid scene__inner">
            <div className="chains__copy">
              <h2 id="chains-h" className="display scene__title">
                {TOKEN_COUNT} STABLECOINS.
                <br />
                {CHAIN_COUNT} CHAINS.
              </h2>
              <ul className="chain-list">
                {ENABLED_CHAINS.map((chain) => (
                  <li
                    key={chain.id}
                    style={
                      {
                        "--chain-bg": chain.color,
                        "--chain-fg": readableOn(chain.color),
                      } as React.CSSProperties
                    }
                  >
                    <span className="chain-list__name display">{chain.name.toUpperCase()}</span>
                    <span className="chain-list__ticker mono">{chain.tokens.join(" / ")}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="chains__coins" aria-hidden="true">
              <span className="cc cc--main">
                <LandingCoin />
              </span>
              <span className="cc cc--2">
                <img src="/landing/assets/source/coins/Group.svg" alt="" />
              </span>
              <span className="cc cc--3">
                <img src="/landing/assets/source/coins/Group%20427319602.svg" alt="" />
              </span>
            </div>
          </div>
        </section>

        {/* ===================== SCENE 05 — RATES / PURPLE CLIMAX ===================== */}
        <section id="rates" className="scene scene--rates" aria-labelledby="rates-h">
          <span className="marker mono" aria-hidden="true">
            04 — RATES
          </span>
          <div className="l-grid scene__inner">
            <div className="rates__copy">
              {/* The last word rides a picker wheel that clicks over as you
                  scroll. The wheel is hidden from assistive tech and the real
                  word is carried by .sr-only, so the heading still reads as one
                  sentence. */}
              <h2 id="rates-h" className="display scene__title rates__title">
                <span className="rates__lead">
                  YOU GET MORE
                  <br />
                  FOR YOUR
                </span>
                <span className="picker" aria-hidden="true">
                  <span className="picker__list">
                    {RATE_WORDS.map((word) => (
                      <span key={word} className="picker__item">
                        {word}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="sr-only">CRYPTO.</span>
              </h2>
            </div>
          </div>

          {/* The rail. Cards ride a wire across the scene, carried by the
              scrollbar rather than a clock, so scrolling back runs them the
              other way. main.js writes the pills as cards hit either end. */}
          <div className="rail" aria-hidden="true">
            <span className="rail__wire" />
            <ul className="rail__track">
              {RAIL_CARDS.map((card) => (
                <li
                  key={card.got}
                  className="rail__card"
                  data-sent={card.sent}
                  data-got={card.got}
                  data-short={card.short}
                >
                  <span className="rail__thread" aria-hidden="true" />
                  <img
                    className="rail__coin"
                    src={`/landing/assets/rails/${card.coin}.png`}
                    alt=""
                    width={76}
                    height={76}
                  />
                  <img
                    className="rail__naira"
                    src="/landing/assets/rails/naira.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Outside .rail: the rail is masked so cards vanish behind the copy,
              and a pill caught in that mask would fade out mid-pop. */}
          <span className="rail__pills rail__pills--left" aria-hidden="true" />
          <span className="rail__pills rail__pills--right" aria-hidden="true" />
        </section>

        {/* ===================== SCENE 06 — SET UP ===================== */}
        <section id="how-it-works" className="scene scene--steps" aria-labelledby="steps-h">
          <span className="marker mono" aria-hidden="true">
            05 — SET UP
          </span>
          <div className="l-grid scene__inner">
            <h2 id="steps-h" className="display scene__title steps__title">
              SET UP ONCE.
              <br />
              GET PAID FOREVER.
            </h2>
            <ol className="steps">
              {STEPS.map(([num, name, desc]) => (
                <li key={num} className="step">
                  <span className="step__node" aria-hidden="true" />
                  <span className="step__num mono">{num}</span>
                  <span className="step__name display">{name}</span>
                  <span className="step__desc body">{desc}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===================== SCENE 07 — SOCIALS ===================== */}
        <section id="socials" className="scene scene--socials" aria-labelledby="socials-h">
          <span className="marker mono" aria-hidden="true">
            06 — SOCIALS
          </span>
          <div className="l-grid scene__inner">
            <div className="socials__block">
              <h2 id="socials-h" className="display scene__title socials__title">
                LINQ IS BUILDING IN PUBLIC.
              </h2>
              <div className="socials__icons">
                {LANDING_SOCIALS.map((social) => (
                  <a
                    key={social.key}
                    className="social"
                    href={social.href}
                    target="_blank"
                    rel="noopener"
                    aria-label={social.label}
                  >
                    {social.glyph}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SCENE 08 — FOOTER / CTA ===================== */}
        <section id="footer" className="scene scene--footer" aria-labelledby="footer-h">
          <div className="l-grid scene__inner">
            <Link className="footer__brand" href="#hero" aria-label="Linq — home">
              <LandingLockup />
            </Link>

            <div className="footer__cta-block">
              <h2 id="footer-h" className="display footer__title">
                START ACCEPTING
                <br />
                CRYPTO.
              </h2>
              {/* B2B — this opens an account, it does not open a chat. */}
              <Link className="btn btn--cta" href={START_HREF}>
                CREATE YOUR ACCOUNT <span aria-hidden="true">↗</span>
              </Link>
              <p className="mono footer__tech">
                ALREADY SET UP?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  LOG IN
                </Link>
              </p>
            </div>

            <p className="mono footer__copyright">RINKU TECHNOLOGY LIMITED — 2026</p>
          </div>

          <div className="footer__plane" aria-hidden="true">
            <img
              src="/landing/assets/source/Group%20427319588%20(1).svg"
              alt=""
              width={755}
              height={716}
            />
          </div>
        </section>
      </main>

      {/* The plane: one fixed layer above the content, below the nav. On a
          pointer device it becomes the cursor; on touch it parks per scene. */}
      <div className="plane-layer" aria-hidden="true">
        <div className="plane-pos">
          <div className="plane-depth">
            <div className="plane-idle">
              <LandingPlane />
            </div>
            {/* Inside the plane's transform stack, so it rides along with no
                motion of its own and cannot desync. */}
            <span className="plane-coin" aria-hidden="true">
              <img src="/landing/assets/source/coins/Group%20427319602.svg" alt="" />
            </span>
          </div>
        </div>
      </div>

      <LandingMotion />
    </div>
  );
}
