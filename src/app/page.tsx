import { AuthRedirect } from "@/components/AuthRedirect";
import { BizCard, type Tilt } from "@/components/landing/BizCard";
import { ChainRail } from "@/components/landing/ChainRail";
import { DottedGlobe } from "@/components/landing/DottedGlobe";
import { mozillaHeadline, roboto, robotoItalic, spaceGrotesk } from "@/components/landing/fonts";
import { LazyVideo } from "@/components/landing/LazyVideo";
import { LottiePlayer } from "@/components/landing/LottiePlayer";
import { PillButton } from "@/components/landing/PillButton";
import { HeroReveal, Reveal, RevealSection } from "@/components/landing/Reveal";
import { type MenuLink, SiteMenu } from "@/components/landing/SiteMenu";
import { type Step, StepsAccordion } from "@/components/landing/StepsAccordion";
import { WhyTicker } from "@/components/landing/WhyTicker";
import { WordRotator } from "@/components/landing/WordRotator";
import "./landing.css";

/**
 * The marketing page: a rebuild of the designer's Framer site
 * (linqswitch.framer.website). Layout, type, colour and motion were measured
 * off the running page; see landing.css for the frame/zoom model and the
 * components in /components/landing for each effect's source values.
 *
 * Where this differs from the Framer page, on purpose:
 *   · Laptops (1024–1439) get the desktop frame scaled down, where Framer
 *     falls back to the phone column.
 *   · Menu links point at real destinations; "Terms of use" is left out until
 *     a terms page exists.
 *   · The two background videos are re-encoded (42MB → 7MB) and only load
 *     near the viewport.
 */

const LOGIN_HREF = "/login";
const START_HREF = "/onboarding";

const LINKS = {
  x: "https://x.com/uselinq",
  telegram: "https://t.me/uselinq/1",
  support: "https://t.me/uselinq/2",
  personal: "https://uselinq.xyz",
};

const MENU: MenuLink[] = [
  { label: "HOME", href: "#hero" },
  { label: "FEATURES", href: "#features" },
  { label: "WHO IS IT FOR?", href: "#business" },
  { label: "LINQ PERSONAL", href: LINKS.personal, external: true },
  { label: "CONTACT US", href: LINKS.support, external: true },
];

/** The hero ticker's words, trailing spaces and all, as the designer typed them. */
const COUNTRIES = ["UK ", "GERMANY ", "USA ", "GHANA ", "KENYA ", "BELGIUM "] as const;

const STEPS: Step[] = [
  {
    title: "Payment link creation",
    body: "Create a payment link in seconds and share it with your customers anywhere.",
    art: "/landing/lottie/step-1-link.json",
  },
  {
    title: "Pay with crypto",
    body: "Customers input the link or scan the code with their phone to start payment",
    art: "/landing/lottie/step-2-pay.json",
  },
  {
    title: "Send crypto",
    body: "Customers enter the amount, choose their network and stablecoin, and complete the payment in their wallet",
    art: "/landing/lottie/step-3-send.json",
  },
  {
    title: "Payment received",
    body: "You receive the equivalent naira in your bank account in seconds",
    art: "/landing/lottie/step-4-received.json",
  },
];

const WHY = [
  {
    key: "global",
    title: "Global Settlements",
    body: "Your customers pay in their preferred stablecoin. You receive Naira. We handle the routing, real-time conversion, and bank payout behind the scenes.",
    down: false,
  },
  {
    key: "security",
    title: "Secure Payments",
    body: "Zero fraud, zero chargebacks. Every payment is fully verified and finalized before settlement.",
    down: true,
  },
  {
    key: "support",
    title: "Dedicated supports",
    body: "Our dedicated support team is on standby to resolve issues fast and keep your payments flowing.",
    down: false,
  },
  {
    key: "integration",
    title: "Simple integration",
    body: "Plug Linq into your business, Generate instant payment links, use our checkout options and Start accepting payments in minutes.",
    down: true,
  },
  {
    key: "rate",
    title: "Transparent rates",
    body: "No hidden fees, no surprise exchange rate markups. Always know exactly how much Naira will land in your account before a payment is made.",
    down: false,
  },
  {
    key: "qr",
    title: "QR integration",
    body: "Generate a unique QR code for your business so your customers can scan, confirm, and pay instantly. Also suitable for in-store payments",
    down: true,
  },
] as const;

const FLAGS = [
  { key: "fr", src: "/landing/flags/fr.png" },
  { key: "us", src: "/landing/flags/us.png" },
  { key: "eng", src: "/landing/flags/gb-eng.png" },
  { key: "gh", src: "/landing/flags/gh.png" },
  { key: "es", src: "/landing/flags/es.png" },
] as const;

const SETUP = [
  ["01", "Create account", "With just your business and email. No paperwork upload needed."],
  ["02", "Verify payout", "Link the bank account we settle into. About a minute, once."],
  ["03", "Share payment link", "Share it once. Your customer picks the chain and the coin whenever they pay."],
  ["04", "Get Paid", "We convert and settle, with a receipt. Usually before the tab closes."],
] as const;

/** Each card's hover tilt is the designer's, card by card. */
const BUSINESSES: { title: string; body: string; tilt: Tilt }[] = [
  {
    title: "Physical stores",
    body: "Generate dynamic QR codes at the counter and let customers pay with their preferred crypto wallet and get settled in Naira instantly",
    tilt: { rotateY: 10 },
  },
  {
    title: "Restaurants",
    body: "Bring modern payments to your restaurants. Guests can pay their tab in stablecoins from their phone, and you receive the exact Naira value directly in your account.",
    tilt: { rotateX: -10 },
  },
  {
    title: "Online stores",
    body: "Keep customers on your site from cart to confirmation. Our native checkout integration ensures a frictionless payment flow that actually converts your international traffic.",
    tilt: { rotateY: -10 },
  },
  {
    title: "Hotels",
    body: "Attract international guests by letting them pay for their stay in stablecoins. You receive the exact room rate in Naira instantly, with zero foreign exchange friction or card declines.",
    tilt: { rotateY: -10 },
  },
  {
    title: "Freelancers",
    body: "Work with anyone, anywhere. Bypass expensive freelance platform fees and let your global clients pay you in USDC, USDT, or USDSUI instantly.",
    tilt: { rotateX: 10 },
  },
  {
    title: "Transporters",
    body: "Get paid instantly, right from the driver’s seat. Passengers and clients can scan a dynamic QR code to pay in stablecoins, while your fare settles securely in Naira before the trip even ends.",
    tilt: { rotateY: 10 },
  },
];

const RAIL_COINS = [
  { src: "/landing/art/rail-coin-0.svg", label: "Sui" },
  { src: "/landing/art/rail-coin-1.svg", label: "BNB Chain" },
  { src: "/landing/art/rail-coin-2.svg", label: "Solana" },
  { src: "/landing/art/rail-coin-3.svg", label: "Base" },
  { src: "/landing/art/rail-coin-4.svg", label: "Stellar" },
];

/**
 * Sets --ls-zoom before first paint: 1 at ≥1440 (the design's own size), the
 * 1440 frame scaled to fit at 1024–1439, 1 again for the phone frame, and the
 * 390 frame scaled to fit below 390.
 */
const ZOOM_SCRIPT = `(function(){var s=document.currentScript,r=s&&s.parentElement;if(!r)return;function f(){var w=document.documentElement.clientWidth,z=w>=1440?1:w>=1024?w/1440:w>=390?1:w/390;r.style.setProperty("--ls-zoom",String(z))}f();addEventListener("resize",f)})();`;

/** Decorative art. Anything below the hero loads lazily, as it does on Framer. */
function Art({ src, className, eager = false }: { src: string; className: string; eager?: boolean }) {
  // biome-ignore lint/a11y/useAltText: decorative illustration
  return <img className={className} src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" />;
}

function whyArt(key: (typeof WHY)[number]["key"]) {
  if (key === "global") {
    return (
      <>
        <Art src="/landing/art/why-globe.svg" className="ls-why__art ls-why__art--globe" />
        {FLAGS.map((flag) => (
          <span key={flag.key} className={`ls-flag ls-flag--${flag.key}`}>
            <Art src={flag.src} className="" />
          </span>
        ))}
      </>
    );
  }
  return <Art src={`/landing/art/why-${key}.svg`} className={`ls-why__art ls-why__art--${key}`} />;
}

export default function Home() {
  return (
    <div className={`ls ${roboto.variable} ${robotoItalic.variable} ${spaceGrotesk.variable} ${mozillaHeadline.variable}`} suppressHydrationWarning>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, sets the frame zoom before paint */}
      <script dangerouslySetInnerHTML={{ __html: ZOOM_SCRIPT }} />
      <a className="ls-skip" href="#steps">
        Skip to content
      </a>

      <SiteMenu links={MENU} />
      {/* Client-side, and only for a merchant who already has a session. */}
      <AuthRedirect />

      <main className="ls-main">
        {/* ============================ HERO ============================ */}
        <section id="hero" className="ls-hero" aria-labelledby="hero-h">
          <a className="ls-hero__logo" href="#hero" aria-label="Linq — home">
            <Art src="/landing/art/logo.svg" className="" eager />
          </a>
          <div className="ls-hero__body">
            <div className="ls-hero__top">
              <div className="ls-hero__copy">
                <HeroReveal delay={0.4}>
                  <h1 id="hero-h" className="ls-hero__heading">
                    <span>Receive from anywhere.</span>
                    <span>Settle in Naira.</span>
                  </h1>
                </HeroReveal>
                <HeroReveal delay={0.8}>
                  <p className="ls-hero__sub">
                    Accept stablecoin payments from anywhere in the world and settle directly to your nigerian bank account
                  </p>
                </HeroReveal>
              </div>
              <HeroReveal delay={1.2}>
                <div className="ls-pills">
                  <PillButton href={LOGIN_HREF} variant="dark">
                    Login
                  </PillButton>
                  <PillButton href={START_HREF} variant="primary">
                    Get started
                  </PillButton>
                </div>
              </HeroReveal>
            </div>

            <div className="ls-hero__card">
              <p className="ls-hero__to">NIGERIA</p>
              <DottedGlobe className="ls-hero__globe" size={{ desktop: 903, phone: 271 }} density={{ desktop: 42, phone: 27 }} />
              <LottiePlayer src="/landing/lottie/hero-flow.json" className="ls-hero__flow" />
              <div className="ls-hero__from">
                <Art src="/landing/art/hero-arrow.svg" className="ls-hero__from-arrow" eager />
                <WordRotator words={COUNTRIES} holdSeconds={4} />
              </div>
            </div>
          </div>
        </section>

        <div className="ls-body">
          {/* ============================ STEPS ============================ */}
          <RevealSection id="steps" className="ls-section ls-section--wide" aria-labelledby="steps-h">
            <Reveal from="left">
              <h2 id="steps-h" className="ls-h2 ls-steps__heading">
                Accept payments from anywhere and get your money in Naira, effortlessly.
              </h2>
            </Reveal>
            <Reveal from="up" delay={0.7}>
              <StepsAccordion steps={STEPS} />
            </Reveal>
          </RevealSection>

          {/* =========================== FEATURES =========================== */}
          <RevealSection id="features" className="ls-section ls-section--wide" aria-labelledby="features-h">
            <Reveal from="left">
              <h2 id="features-h" className="ls-h2 ls-features__heading">
                Unlock global customers with a payment gateway designed for modern business growth.
              </h2>
            </Reveal>
            <div className="ls-features__grid">
              <Reveal from="left" delay={0.4} duration={0.4} className="ls-feature ls-feature--plane">
                <h3 className="ls-feature__title">Instant settlement</h3>
                <Art src="/landing/art/feature-plane.svg" className="ls-feature__art ls-feature__art--d" />
                <Art src="/landing/art/feature-plane-m.svg" className="ls-feature__art ls-feature__art--m" />
                <div className="ls-feature__box">
                  <p className="ls-feature__text">
                    <span className="ls-only-desktop">
                      Turn stablecoin payments into Naira quickly and seamlessly, giving you faster access to the money your
                      business has earned while eliminating the delays and complexity of manual conversion and settlement
                    </span>
                    <span className="ls-only-phone">
                      Turn stablecoin payments into Naira seamlessly, giving you faster access to the money your business has
                      earned while eliminating the delays and complexity of manual conversion and settlement
                    </span>
                  </p>
                </div>
              </Reveal>
              <Reveal from="right" delay={0.6} duration={0.4} className="ls-feature ls-feature--chains">
                <h3 className="ls-feature__title">Multiple chain support</h3>
                <Art src="/landing/art/feature-chains.svg" className="ls-feature__art ls-feature__art--d" />
                <Art src="/landing/art/feature-chains-m.svg" className="ls-feature__art ls-feature__art--m" />
                <div className="ls-feature__box">
                  <p className="ls-feature__text">
                    Never lose a sale because a customer prefers a different network. Let customers pay across six chains
                    while you settle in Naira
                  </p>
                </div>
              </Reveal>
              <Reveal from="left" delay={0.8} duration={0.4} className="ls-feature ls-feature--api">
                <h3 className="ls-feature__title">Checkout(API integration) </h3>
                <Art src="/landing/art/feature-api.svg" className="ls-feature__art ls-feature__art--d" />
                <Art src="/landing/art/feature-api-m.svg" className="ls-feature__art ls-feature__art--m" />
                <div className="ls-feature__box">
                  <p className="ls-feature__text">
                    Keep customers on your site. Use our API to build a native checkout that processes stablecoins and
                    settles in Naira automatically
                  </p>
                </div>
              </Reveal>
              <Reveal from="right" delay={1} duration={0.4} className="ls-feature ls-feature--sales">
                <h3 className="ls-feature__title">Sales analysis</h3>
                <Art src="/landing/art/sales-folders.svg" className="ls-feature__folders" />
                <div className="ls-feature__box">
                  <p className="ls-feature__text">
                    Track payments across six different networks in one simple interface. We consolidate all your
                    stablecoin volume into clear, actionable Naira metrics
                  </p>
                </div>
              </Reveal>
            </div>
          </RevealSection>

          {/* ============================ WHY US ============================ */}
          <section id="why" className="ls-section ls-why" aria-labelledby="why-h">
            <h2 id="why-h" className="ls-h2 ls-why__heading">
              Accept payments from anywhere, get settled in Naira: The Linq advantage for growing companies.
            </h2>
            <WhyTicker
              items={WHY.map((item) => ({
                key: item.key,
                down: item.down,
                node: (
                  <>
                    {whyArt(item.key)}
                    <div className="ls-why__copy">
                      <h3 className={`ls-why__title${item.key === "qr" ? " ls-why__title--qr" : ""}`}>{item.title}</h3>
                      <p className={`ls-why__desc${item.key === "qr" ? " ls-why__desc--qr" : ""}`}>{item.body}</p>
                    </div>
                  </>
                ),
              }))}
            />
          </section>

          {/* ========================= VIDEO CTA 1 ========================= */}
          <section className="ls-cta ls-cta--customers" aria-labelledby="cta1-h">
            <LazyVideo src="/landing/video/customers.mp4" className="ls-cta__video" />
            <div className="ls-cta__overlay">
              <h2 id="cta1-h" className="ls-cta__text">
                Your customers should not have to think about how you get paid
              </h2>
              <div className="ls-pills">
                <PillButton href={LOGIN_HREF} variant="dark">
                  Login
                </PillButton>
                <PillButton href={START_HREF} variant="primary">
                  Get started
                </PillButton>
              </div>
            </div>
          </section>

          {/* ============================ SET UP ============================ */}
          <section id="setup" className="ls-section ls-section--wide" aria-labelledby="setup-h">
            <h2 id="setup-h" className="ls-h2 ls-setup__heading">
              Set up your account in minutes and start accepting payments
            </h2>
            <ol className="ls-setup__row">
              {SETUP.map(([num, title, body]) => (
                <li key={num} className="ls-setup__panel">
                  {/* "01 " in an inline span inside a pre-wrap block, the live page's own
                      structure: the trailing space hangs and the digits sit flush right. */}
                  <p className="ls-setup__num" aria-hidden="true">
                    <span>{`${num} `}</span>
                  </p>
                  <div className="ls-setup__copy">
                    <h3 className="ls-setup__title">{title}</h3>
                    <p className="ls-setup__desc">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ========================== BUSINESSES ========================== */}
          <RevealSection id="business" className="ls-section" aria-labelledby="biz-h">
            <Reveal from="left">
              <h2 id="biz-h" className="ls-h2 ls-biz__heading">
                Built for businesses ready to go global and get paid from anywhere
              </h2>
            </Reveal>
            <div className="ls-biz__grid">
              {BUSINESSES.map((biz, i) => (
                <BizCard key={biz.title} tilt={biz.tilt}>
                  <div className="ls-biz__content">
                    <div className="ls-biz__head">
                      <Art src={`/landing/art/biz-${i}.svg`} className="ls-biz__icon" />
                      <h3 className="ls-biz__title">{biz.title}</h3>
                    </div>
                    <p className="ls-biz__desc">{biz.body}</p>
                  </div>
                </BizCard>
              ))}
            </div>
          </RevealSection>

          {/* ========================= VIDEO CTA 2 ========================= */}
          <section className="ls-cta ls-cta--naira" aria-labelledby="cta2-h">
            <LazyVideo src="/landing/video/naira.mp4" className="ls-cta__video" />
            <div className="ls-cta__overlay">
              <h2 id="cta2-h" className="ls-cta__text">
                Ready to turn global payments into instant Naira?
              </h2>
              <div className="ls-pills">
                <PillButton href={LOGIN_HREF} variant="dark">
                  Login
                </PillButton>
                <PillButton href={START_HREF} variant="primary">
                  Get started
                </PillButton>
              </div>
            </div>
          </section>

          {/* ============================= RAIL ============================= */}
          <ChainRail coins={RAIL_COINS} />
        </div>

        {/* ============================ FOOTER ============================ */}
        <footer className="ls-footer">
          <div className="ls-footer__community">
            <div className="ls-footer__intro">
              <h2 className="ls-footer__title">Join our communities to stay ahead</h2>
              <p className="ls-footer__sub">Get instant support, request new features, and catch exclusive community updates.</p>
            </div>
            <div className="ls-footer__links">
              <a className="ls-footer__link" href={LINKS.x} target="_blank" rel="noreferrer">
                <Art src="/landing/art/footer-x.svg" className="" />
                Twitter
              </a>
              <a className="ls-footer__link ls-footer__link--telegram" href={LINKS.telegram} target="_blank" rel="noreferrer">
                <Art src="/landing/art/footer-telegram.svg" className="" />
                Telegram
              </a>
            </div>
          </div>
          <div className="ls-footer__base">
            <a href="#hero" aria-label="Linq — back to top">
              <Art src="/landing/art/footer-logo.svg" className="ls-footer__logo" />
            </a>
            <p className="ls-footer__copy">© 2026 copyright all rights reserved.</p>
          </div>
          {/* The trailing space is the designer's; it shifts the centred wordmark. */}
          <p className="ls-footer__wordmark" aria-hidden="true">
            {"USELINQ "}
          </p>
        </footer>
      </main>
    </div>
  );
}
