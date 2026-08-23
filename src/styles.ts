/**
 * The design system.
 *
 * This is not only the hub's stylesheet. It is served at `/brand/v1.css` so
 * `guides.` and `audit.` can adopt the whole system with one `<link>` — see
 * docs/BRAND.md. That is the only realistic way three sites in three
 * repositories stay looking like one network: a copy-pasted stylesheet
 * diverges the first time somebody nudges a colour.
 *
 * Every brand colour is lifted from the kit's own SVGs rather than picked to
 * sit near them — `#2B5CE6`, `#0B0F16`, `#FAFAF8`, `#C7CCD6` and `#12161F` are
 * the literal fill and stroke values in `bba-mark-*.svg`.
 *
 * ## Type
 *
 * Space Grotesk for display, Inter for text. Space Grotesk is a geometric
 * grotesque with just enough oddity in its figures to stop the headlines
 * reading as another system-font startup page, and its mechanical feel suits a
 * mark built from signal bars. Inter carries everything small, because it was
 * drawn for exactly that and Space Grotesk was not.
 *
 * Both are self-hosted variable subsets — 70KB for the pair, one origin, no
 * third party, and no need to widen the Content-Security-Policy to a font CDN.
 *
 * ## Dark first
 *
 * The mark is drawn for a dark ground: the kit ships `-for-dark` as the colour
 * variant and the app icon is a dark rounded square. So dark is the default and
 * light is the override. Both are complete — every token is defined in both, so
 * nothing inherits a colour that exists in only one mode.
 */

/**
 * Font URLs must be absolute in the stylesheet served to other subdomains: a
 * relative `/fonts/…` would resolve against `guides.bbanetwork.org`, which does
 * not host them. The hub renders with an empty base so local development loads
 * its own copies rather than production's.
 */
export function styles(fontBase = ''): string {
  return `
@font-face {
  font-family: 'Space Grotesk';
  src: url('${fontBase}/fonts/space-grotesk-latin-wght-normal.woff2') format('woff2-variations');
  font-weight: 300 700;
  font-display: swap;
  font-style: normal;
}
@font-face {
  font-family: 'Inter';
  src: url('${fontBase}/fonts/inter-latin-wght-normal.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

:root {
  /* Brand, straight from the kit. Do not "adjust" these. */
  --bba-blue: #2B5CE6;
  --bba-ink: #0B0F16;
  --bba-slate: #12161F;
  --bba-grey: #C7CCD6;
  --bba-paper: #FAFAF8;

  /* Roles. Components reference these, never the brand values above, so a
     theme change happens in this block and nowhere else. */
  --bg: var(--bba-ink);
  --bg-raised: #10141D;
  --bg-sunken: #070A10;
  --text: var(--bba-paper);
  --text-muted: #98A1B2;
  --text-dim: #626C7E;
  --line: #1C2331;
  --line-strong: #2B3446;
  --accent: var(--bba-blue);
  --accent-soft: rgba(43, 92, 230, .13);
  --accent-text: #89A4FF;
  --accent-glow: rgba(43, 92, 230, .30);
  --status-live: #4ADE80;
  --status-building: #E4B155;

  /* The mark's bars. The animated kit ships two files that differ only in this
     colour — #C7CCD6 for dark grounds, #12161F for light — so it is a token
     here and the mark is inlined once rather than shipped twice. */
  --mark-bar: var(--bba-grey);
  --mark-beam: #6C93FF;

  --card-sheen: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,0) 42%);
  --shadow: 0 1px 2px rgba(0,0,0,.5), 0 16px 40px -20px rgba(0,0,0,.85);
  --shadow-lift: 0 1px 2px rgba(0,0,0,.5), 0 26px 60px -26px rgba(0,0,0,.95);

  --radius: 18px;
  --radius-sm: 10px;
  --measure: 66ch;

  --display: 'Space Grotesk', ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: var(--bba-paper);
    --bg-raised: #FFFFFF;
    --bg-sunken: #F1F2EF;
    --text: var(--bba-ink);
    --text-muted: #4F5A70;
    --text-dim: #737D91;
    --line: #E4E5E1;
    --line-strong: #CBCEC9;
    --accent-soft: rgba(43, 92, 230, .075);
    --accent-text: #1B40AD;
    --accent-glow: rgba(43, 92, 230, .16);

    /* The status colours are drawn for a dark ground and do not survive being
       moved to a light one — #4ADE80 on near-white is about 1.7:1, and the pill
       renders its text in that colour. Darkened to clear 4.5:1 while still
       reading as the same green and amber. */
    --status-live: #0E7A3C;
    --status-building: #855700;

    --mark-bar: var(--bba-slate);
    --mark-beam: #1E45B8;

    --card-sheen: linear-gradient(180deg, rgba(11,15,22,.028), rgba(11,15,22,0) 42%);
    --shadow: 0 1px 2px rgba(11,15,22,.05), 0 14px 36px -22px rgba(11,15,22,.42);
    --shadow-lift: 0 1px 2px rgba(11,15,22,.06), 0 26px 56px -26px rgba(11,15,22,.5);

    color-scheme: light;
  }
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 17px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, .display {
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.08;
  text-wrap: balance;
}

/* A visible, branded focus ring. Removing focus styling breaks keyboard
   navigation for everyone who depends on it, so this is deliberately loud. */
:where(a, button, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 5px;
}

.wrap { width: min(100% - 2.5rem, 1140px); margin-inline: auto; }

.skip {
  position: absolute; left: -9999px;
  background: var(--accent); color: #fff;
  padding: .7rem 1.1rem; border-radius: var(--radius-sm); z-index: 100;
}
.skip:focus { left: 1rem; top: 1rem; }

.icon { width: 1em; height: 1em; display: inline-block; vertical-align: -.125em; }
.bullet { width: 13px; height: 13px; flex: none; margin-top: .42em; }

/* ---------------------------------------------------------------- header -- */

.masthead {
  position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--line);
}
.masthead .wrap {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding-block: .9rem;
}
.brand { display: flex; align-items: center; gap: .75rem; text-decoration: none; color: inherit; }
.brand svg { width: 40px; height: auto; flex: none; }
.brand-name {
  font-family: var(--display);
  font-weight: 700; letter-spacing: .15em; font-size: .8rem; text-transform: uppercase;
  white-space: nowrap;
}
.brand-name .thin { font-weight: 400; color: var(--text-muted); }

.masthead nav { display: flex; gap: 1.5rem; align-items: center; }
.masthead nav a {
  color: var(--text-muted); text-decoration: none; font-size: .9rem; font-weight: 500;
  transition: color .15s ease;
}
.masthead nav a:hover { color: var(--text); }

/* Below this width the lockup and three nav links cannot both fit, and
   white-space:nowrap turns that from an ugly wrap into "Contact" falling off
   the right edge. The mark plus "BBA" is still an unambiguous lockup, so
   "NETWORK" is what gives way — the navigation is functional, the word is not. */
@media (max-width: 30rem) {
  .masthead .wrap { gap: .6rem; }
  .masthead nav { gap: .95rem; }
  .masthead nav a { font-size: .82rem; }
  .brand { gap: .5rem; }
  .brand svg { width: 32px; }
  .brand-name .thin { display: none; }
}

/* ------------------------------------------------------------------ hero -- */

.hero {
  position: relative; isolation: isolate; overflow: hidden;
  padding-block: clamp(4rem, 11vw, 8.5rem) clamp(3rem, 7vw, 5.5rem);
}

/* Covers the hero exactly. It used to be sized at 120% x 145% with a small
   viewBox, which made preserveAspectRatio=slice magnify the texture into grey
   bands across the headline — the point is that you notice it second. */
.signal-field {
  position: absolute; inset: 0; width: 100%; height: 100%;
  z-index: -1; color: var(--text);
  opacity: .5;
  pointer-events: none;
  /* Weighted to the right, because the hero text is set left. Centred, the
     bars stripe straight through the lede and cost it legibility for the sake
     of a texture nobody asked to read through. Off to the right they fill the
     empty half of the composition instead, and the copy sits on clean ground. */
  -webkit-mask-image: radial-gradient(ellipse 52% 62% at 74% 42%, #000 18%, transparent 72%);
          mask-image: radial-gradient(ellipse 52% 62% at 74% 42%, #000 18%, transparent 72%);
}
@media (prefers-color-scheme: light) { .signal-field { opacity: .34; } }

/* On a narrow screen there is no empty half to fill: the text spans the full
   width, so any texture behind it is just interference. */
@media (max-width: 52rem) {
  .signal-field {
    opacity: .3;
    -webkit-mask-image: radial-gradient(ellipse 80% 34% at 50% 16%, #000 10%, transparent 72%);
            mask-image: radial-gradient(ellipse 80% 34% at 50% 16%, #000 10%, transparent 72%);
  }
}

/* The signal sweeps once on load, left to right, then stays. It is the mark's
   own metaphor; looping it would turn the page into something that moves at
   you while you are trying to read it. */
.sf-signal {
  animation: sweep 1.5s cubic-bezier(.16,.8,.3,1) backwards;
  transform-origin: left center;
}
@keyframes sweep { from { transform: scaleX(0); opacity: 0; } }

.hero-mark { width: clamp(168px, 30vw, 250px); height: auto; margin-bottom: 2.4rem; }

/* ------------------------------------------------------------- the mark -- */
/*
 * The animated logo, from the brand kit's own timings.
 *
 * Three loops, all from bba-logo-animated-*.svg: the bars breathe, a brighter
 * dash travels the centre rail, and the square terminator blinks near the end
 * of each cycle. The kit's per-bar delays are identical fractions of the cycle
 * in both its variants (0, .09, .18, .27, .45, .54, .63, .72), so they are
 * expressed as fractions here and --cycle alone switches between the ambient
 * 10s and active 3.6s timings.
 *
 * Inlined rather than <img src="…animated.svg">, which the kit's README
 * suggests: those files reference the keyframes but do not define them — only
 * the HTML wrappers do — so an <img> embed renders a completely static logo.
 * Inlining also lets the bars take a theme token instead of shipping a
 * light and a dark copy.
 */
.mark { --cycle: 10s; }
.mark-bars { color: var(--mark-bar); }

/* The travelling dash is a highlight, not part of the drawn mark: without the
   animation there is nothing for it to be, so it stays invisible. */
.mark-beam { opacity: 0; }

.mark-animated .bar {
  animation: mark-pulse var(--cycle) ease-in-out infinite;
  animation-delay: calc(var(--cycle) * var(--d, 0));
}
.mark-animated .mark-beam {
  opacity: .5;
  animation: mark-beam var(--cycle) linear infinite;
}
.mark-animated .mark-node { animation: mark-node var(--cycle) linear infinite; }

@keyframes mark-pulse { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
@keyframes mark-beam  { to { stroke-dashoffset: -100 } }
@keyframes mark-node  { 0%, 78%, 100% { opacity: .35 } 86% { opacity: 1 } }

/* An infinitely looping logo is precisely what this setting is for. Everything
   settles to the mark's resting state rather than freezing mid-cycle. */
@media (prefers-reduced-motion: reduce) {
  .mark-animated .bar,
  .mark-animated .mark-beam,
  .mark-animated .mark-node,
  .sf-signal {
    animation: none;
  }
  .mark-animated .bar { opacity: 1; }
  .mark-animated .mark-beam { opacity: 0; }
  .mark-animated .mark-node { opacity: 1; }
}

h1 {
  font-size: clamp(2.5rem, 1.1rem + 5.4vw, 4.6rem);
  margin: 0 0 1.3rem; max-width: 17ch;
}
.hero p.lede {
  font-size: clamp(1.1rem, 1rem + .55vw, 1.36rem);
  color: var(--text-muted); max-width: 54ch; margin: 0 0 2.3rem;
  text-wrap: pretty;
}

.hero-meta {
  display: flex; flex-wrap: wrap; gap: .6rem 1.7rem;
  font-size: .88rem; color: var(--text-dim);
}
.hero-meta span { display: inline-flex; align-items: center; gap: .5rem; }
.hero-meta .icon { color: var(--accent-text); }
.hero-meta a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--line-strong); }
.hero-meta a:hover { color: var(--text); }

/* --------------------------------------------------------------- section -- */

.section { padding-block: clamp(3rem, 7vw, 5rem); position: relative; }
.rule { display: block; width: 100%; height: 1px; color: var(--accent); }

.section-head { margin-bottom: 2.6rem; }
.eyebrow {
  font-family: var(--display);
  font-size: .73rem; letter-spacing: .2em; text-transform: uppercase;
  color: var(--accent-text); font-weight: 500; margin: 0 0 .8rem;
}
h2 { font-size: clamp(1.7rem, 1.2rem + 1.6vw, 2.5rem); margin: 0 0 .7rem; }
.section-head p { color: var(--text-muted); margin: 0; max-width: var(--measure); text-wrap: pretty; }

/* ----------------------------------------------------------------- cards -- */

.cards { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }

.card {
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
/* A hairline of light along the top edge. It is what stops a flat panel from
   reading as a grey box, and it is one gradient rather than an image. */
.card::before {
  content: ""; position: absolute; inset: 0 0 auto; height: 45%;
  background: var(--card-sheen); pointer-events: none;
}
.card.is-live:hover, .card.is-live:focus-within {
  border-color: var(--line-strong);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
}

/* The illustration band. Custom artwork per business, in the mark's own
   language — see src/motifs.ts. */
.card-art-band {
  position: relative;
  background:
    radial-gradient(ellipse 70% 100% at 50% 0%, var(--accent-glow), transparent 70%),
    var(--bg-sunken);
  border-bottom: 1px solid var(--line);
  padding: 1.2rem 1rem .6rem;
}
.card-art {
  display: block; width: 100%; height: auto; max-height: 150px; color: var(--text);
  transition: transform .3s cubic-bezier(.2,.8,.3,1);
}
.card.is-live:hover .card-art { transform: translateY(-2px); }

.card-body { padding: 1.5rem 1.6rem 1.6rem; display: flex; flex-direction: column; flex: 1; }

.card-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
.card h3 { margin: 0; font-size: 1.35rem; letter-spacing: -0.02em; }
.card .tagline { margin: 0 0 1rem; color: var(--text); font-size: 1rem; font-weight: 500; }
.card .blurb { margin: 0 0 1.4rem; color: var(--text-muted); font-size: .93rem; }

.card ul { list-style: none; margin: 0 0 1.6rem; padding: 0; display: grid; gap: .58rem; }
.card li { display: flex; gap: .65rem; align-items: flex-start; font-size: .9rem; color: var(--text-muted); }

.card-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.price { font-family: var(--mono); font-size: .82rem; color: var(--text-dim); }

/* The whole card is the click target on a live business — but the anchor stays
   a real anchor with real text, so it is announced and reachable by keyboard.
   The ::after widens the hit area; it does not replace the link. */
.cta {
  display: inline-flex; align-items: center; gap: .55rem;
  background: var(--accent); color: #fff; text-decoration: none;
  padding: .68rem 1.15rem; border-radius: var(--radius-sm);
  font-weight: 600; font-size: .93rem;
  box-shadow: 0 1px 0 rgba(255,255,255,.14) inset, 0 8px 20px -10px var(--accent-glow);
  transition: background .16s ease, transform .16s ease;
}
.cta:hover { background: #1E45B8; }
.cta:active { transform: translateY(1px); }
.cta::after { content: ""; position: absolute; inset: 0; border-radius: var(--radius); }
.cta .icon { transition: transform .18s ease; }
.cta:hover .icon { transform: translateX(3px); }

.pill {
  display: inline-flex; align-items: center; gap: .45rem;
  font-family: var(--display);
  font-size: .68rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;
  padding: .32rem .62rem; border-radius: 999px; white-space: nowrap;
  border: 1px solid currentColor;
}
.pill.live { color: var(--status-live); }
.pill.building { color: var(--status-building); }
.pill.planned { color: var(--text-dim); }
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex: none; }

.pending-note { font-size: .86rem; color: var(--text-dim); margin: 0; }
.pending-note code { font-family: var(--mono); font-size: .95em; color: var(--text-muted); }

/* ---------------------------------------------------------------- footer -- */

footer { border-top: 1px solid var(--line); padding-block: 3rem 3.5rem; margin-top: 2rem; background: var(--bg-sunken); }
.foot-grid { display: grid; gap: 2.2rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
footer h4 {
  font-family: var(--display);
  font-size: .72rem; letter-spacing: .17em; text-transform: uppercase;
  color: var(--text-dim); margin: 0 0 .9rem; font-weight: 500;
}
footer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
footer a { color: var(--text-muted); text-decoration: none; font-size: .91rem; }
footer a:hover { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.colophon {
  margin-top: 2.6rem; padding-top: 1.6rem; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-size: .82rem; color: var(--text-dim);
}
.colophon a { font-size: inherit; }

/* ------------------------------------------------------------------ prose -- */

.prose { max-width: var(--measure); }
.prose h1 { font-size: clamp(2.1rem, 1.4rem + 2.6vw, 3.2rem); margin-bottom: 1.2rem; }
.prose h2 { margin-top: 2.8rem; font-size: clamp(1.35rem, 1.1rem + .9vw, 1.7rem); }
.prose p { color: var(--text-muted); text-wrap: pretty; }

/* The opening line carries the whole page, so it is set larger than the body
   copy that follows it. */
.prose .lead { font-size: 1.14rem; color: var(--text); }

.checklist { list-style: none; margin: 1.2rem 0 1.6rem; padding: 0; display: grid; gap: .7rem; }
.checklist li { display: flex; gap: .7rem; align-items: flex-start; color: var(--text-muted); }

.contact-line { font-size: 1.1rem; }
.contact-line a { font-weight: 600; }
.prose a { color: var(--accent-text); text-underline-offset: 3px; }

/* =========================================================== subdomains == */
/*
 * Everything below is for guides. and audit. rather than the hub, and it is
 * here rather than in their repositories on purpose: they link this file, so a
 * change to the network's look reaches all three sites without any of them
 * redeploying. See docs/BRAND.md for the markup these expect.
 */

/* A shorter hero for a page that has to get to the product quickly. The hub
   can afford a full screen of atmosphere; a storefront cannot. */
.hero.compact { padding-block: clamp(2.75rem, 7vw, 4.5rem) clamp(2rem, 4vw, 3rem); }
.hero.compact h1 { font-size: clamp(2.1rem, 1.2rem + 3.6vw, 3.4rem); max-width: 20ch; }
.hero.compact .lede { margin-bottom: 1.6rem; }

.products { display: grid; gap: 1.4rem; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); }

.product {
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg-raised); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow);
  transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
.product:hover { border-color: var(--line-strong); transform: translateY(-4px); box-shadow: var(--shadow-lift); }
.product-cover {
  aspect-ratio: 4 / 3; background: var(--bg-sunken);
  border-bottom: 1px solid var(--line);
  display: grid; place-items: center; padding: 1.2rem;
}
.product-cover img { width: 100%; height: 100%; object-fit: contain; }
.product-body { padding: 1.3rem 1.4rem 1.4rem; display: flex; flex-direction: column; flex: 1; }
.product h3 { margin: 0 0 .4rem; font-size: 1.12rem; }
.product .meta { font-family: var(--mono); font-size: .78rem; color: var(--text-dim); margin: 0 0 .7rem; }
.product p { color: var(--text-muted); font-size: .9rem; margin: 0 0 1.2rem; }
.product .product-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
.product .amount { font-family: var(--display); font-size: 1.28rem; font-weight: 700; letter-spacing: -.02em; }

/* The buy button. Bigger than .cta because on a storefront this is the page's
   single purpose, and a primary action that looks like a nav link loses sales. */
.buy {
  display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
  background: var(--accent); color: #fff; text-decoration: none;
  padding: .82rem 1.5rem; border-radius: var(--radius-sm);
  font-weight: 600; font-size: 1rem; border: 0; cursor: pointer;
  font-family: var(--font);
  box-shadow: 0 1px 0 rgba(255,255,255,.16) inset, 0 12px 28px -12px var(--accent-glow);
  transition: background .16s ease, transform .16s ease;
}
.buy:hover { background: #1E45B8; }
.buy:active { transform: translateY(1px); }
.buy.ghost {
  background: transparent; color: var(--text);
  border: 1px solid var(--line-strong); box-shadow: none;
}
.buy.ghost:hover { background: var(--accent-soft); border-color: var(--accent); }

.reassure {
  display: flex; flex-wrap: wrap; gap: .5rem 1.4rem;
  font-size: .86rem; color: var(--text-dim); margin-top: 1rem;
}
.reassure span { display: inline-flex; align-items: center; gap: .45rem; }

/* Numbered steps — "how this works", which is the objection both businesses
   have to answer before anyone pays. */
.steps { display: grid; gap: 1.6rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); list-style: none; padding: 0; margin: 0; counter-reset: step; }
.steps li { counter-increment: step; position: relative; padding-left: 3rem; }
.steps li::before {
  content: counter(step); position: absolute; left: 0; top: -.1rem;
  width: 2.1rem; height: 2.1rem; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent-text);
  font-family: var(--display); font-weight: 700; font-size: .95rem;
  border: 1px solid var(--line-strong);
}
.steps h3 { margin: 0 0 .35rem; font-size: 1.02rem; }
.steps p { margin: 0; color: var(--text-muted); font-size: .9rem; }

.faq { display: grid; gap: 0; border-top: 1px solid var(--line); }
.faq details { border-bottom: 1px solid var(--line); }
.faq summary {
  cursor: pointer; padding: 1.05rem 0; font-weight: 600; font-size: 1rem;
  list-style: none; display: flex; justify-content: space-between; gap: 1rem;
  align-items: center;
}
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after {
  content: "+"; font-family: var(--mono); color: var(--accent-text);
  font-size: 1.15rem; flex: none; transition: transform .2s ease;
}
.faq details[open] summary::after { transform: rotate(45deg); }
.faq p { margin: 0 0 1.15rem; color: var(--text-muted); font-size: .93rem; max-width: var(--measure); }

/* A pull-quote. Left rule in the brand blue rather than a giant curly quote —
   the same gesture as the signal line in the mark. */
.quote {
  margin: 0; padding: .3rem 0 .3rem 1.4rem;
  border-left: 3px solid var(--accent);
  font-size: 1.06rem; color: var(--text);
}
.quote footer { border: 0; background: none; padding: 0; margin-top: .6rem; font-size: .87rem; color: var(--text-dim); }

/* Narrows the reading column WITHOUT re-centring it. Setting a max-width on
   .wrap instead pulls the block into the middle of the page, so its left edge
   stops lining up with every other section — visible as a paragraph that looks
   indented for no reason. */
.narrow { max-width: 760px; }

.band {
  background: var(--bg-sunken); border-block: 1px solid var(--line);
  padding-block: clamp(2.5rem, 6vw, 4rem);
}

.notice {
  background: var(--accent-soft); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); padding: 1rem 1.2rem; font-size: .92rem;
  color: var(--text-muted);
}
`;
}

/** The hub's own copy: relative font URLs, so local development uses local files. */
export const STYLES = styles('');

/** Served at /brand/v1.css for the other subdomains. Absolute font URLs. */
export const BRAND_CSS = styles('https://bbanetwork.org');
