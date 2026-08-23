/**
 * HTML rendering.
 *
 * Plain template strings, no framework. The hub is a handful of documents whose
 * content changes when a human edits src/businesses.ts — shipping a client-side
 * framework to render that would add a build step, a bundle, and a hydration
 * pass to produce markup that was already static.
 */

import {
  BUSINESSES,
  PUBLIC_BUSINESSES,
  APEX,
  SUPPORT_EMAIL,
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
} from './businesses';
import type { Business } from './businesses';
import { signalField, rule, bullet, icon, CARD_ART } from './motifs';
import { STYLES } from './styles';

/**
 * Escapes text for HTML.
 *
 * Everything interpolated into a template below goes through this. Today every
 * value comes from a TypeScript file in this repo and none of it is hostile —
 * but "the data is trusted" is a property of the current code, not of the
 * template, and the day someone renders a query parameter is the day the
 * missing escape becomes an XSS.
 */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The waveform mark.
 *
 * Inlined rather than <img src="…animated.svg">, which is what the kit's README
 * suggests. Those files reference the keyframes but never define them — only
 * the HTML wrappers carry the @keyframes block — so an <img> embed renders a
 * completely static logo. Inlining also lets the bars take a theme token
 * instead of shipping a light copy and a dark copy.
 *
 * `animated` runs the kit's ambient loop; the timings live in src/styles.ts.
 */
function mark(className: string, animated = false): string {
  // Coordinates from bba-logo-animated-ambient-for-dark.svg. Symmetric about
  // y=48, which is where the blue rail sits.
  //
  // The per-bar delays are the kit's own, expressed as a fraction of the cycle:
  // its ambient (10s) and active (3.6s) files use identical fractions, so
  // --cycle alone switches speed and nothing here has to change.
  const bars: Array<[y: number, x1: number, x2: number, delay: number]> = [
    [20, 33.2, 54.8, 0],
    [27, 22.6, 65.4, -0.09],
    [34, 17.5, 70.5, -0.18],
    [41, 14.8, 73.2, -0.27],
    [55, 14.8, 73.2, -0.45],
    [62, 17.5, 70.5, -0.54],
    [69, 22.6, 65.4, -0.63],
    [76, 33.2, 54.8, -0.72],
  ];

  const lines = bars
    .map(
      ([y, x1, x2, d]) =>
        `<line class="bar" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="--d:${d}"/>`,
    )
    .join('');

  const classes = ['mark', className, animated ? 'mark-animated' : ''].filter(Boolean).join(' ');

  return `<svg class="${classes}" viewBox="12 16 114 64" fill="none" role="img" aria-label="BBA Network" xmlns="http://www.w3.org/2000/svg">
  <g class="mark-bars" stroke="currentColor" stroke-width="3.4">${lines}</g>
  <line x1="14" y1="48" x2="112" y2="48" stroke="#2B5CE6" stroke-width="3.4"/>
  <line class="mark-beam" x1="14" y1="48" x2="112" y2="48" stroke="var(--mark-beam)" stroke-width="3.4" pathLength="100" stroke-dasharray="14 86"/>
  <rect class="mark-node" x="116" y="44" width="8" height="8" fill="#2B5CE6"/>
</svg>`;
}

const STATUS_LABEL: Record<Business['status'], string> = {
  live: 'Live',
  building: 'Building',
  planned: 'Planned',
};

/**
 * A business card.
 *
 * The status drives everything: a `live` business gets a real link and a
 * hoverable card; anything else gets a plain statement of where it is. There is
 * no version of this that renders a button to a host that does not resolve.
 */
function card(business: Business): string {
  const live = business.status === 'live';

  const highlights = business.highlights.length
    ? `<ul>${business.highlights
        .map((h) => `<li>${bullet()}<span>${esc(h)}</span></li>`)
        .join('')}</ul>`
    : '';

  // The click is counted server-side via /go/:id rather than with an inline
  // handler, so it works with JavaScript disabled and needs no consent banner —
  // nothing is stored about the visitor, only that the link was followed.
  const action = live
    ? `<a class="cta" href="/go/${esc(business.id)}">Visit ${esc(business.name)} ${icon('arrow-right')}</a>`
    : `<p class="pending-note">Opening at <code>${esc(business.host)}</code> shortly.</p>`;

  // Custom artwork per business, drawn in the mark's own language. A business
  // without one still renders — it just leads with the heading instead of a
  // band, which is better than a broken or generic placeholder.
  const art = CARD_ART[business.id];
  const band = art ? `<div class="card-art-band">${art()}</div>` : '';

  return `<article class="card ${live ? 'is-live' : 'is-pending'}">
  ${band}
  <div class="card-body">
    <div class="card-top">
      <h3>${esc(business.name)}</h3>
      <span class="pill ${business.status}"><span class="dot"></span>${STATUS_LABEL[business.status]}</span>
    </div>
    <p class="tagline">${esc(business.tagline)}</p>
    <p class="blurb">${esc(business.blurb)}</p>
    ${highlights}
    <div class="card-foot">
      ${action}
      ${business.priceHint ? `<span class="price">${esc(business.priceHint)}</span>` : ''}
    </div>
  </div>
</article>`;
}

interface PageOptions {
  title: string;
  description: string;
  path: string;
  body: string;
}

function layout({ title, description, path, body }: PageOptions): string {
  const canonical = `https://${APEX}${path}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="https://${APEX}/assets/png/bba-logo-stacked-for-dark.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B0F16" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#FAFAF8" media="(prefers-color-scheme: light)">
<link rel="icon" href="/assets/svg/bba-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/png/bba-app-icon.png">
<!-- Preloaded because the stylesheet is inline: without this the browser does
     not discover the fonts until it has parsed the whole head, and the
     headline flashes in a system face first. -->
<link rel="preload" href="/fonts/space-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${STYLES}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <div class="wrap">
    <a class="brand" href="/">
      ${mark('')}
      <span class="brand-name">BBA <span class="thin">Network</span></span>
    </a>
    <nav aria-label="Primary">
      <a href="/#businesses">Businesses</a>
      <a href="/about">About</a>
      <a href="mailto:${CONTACT_EMAIL}">Contact</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4>Businesses</h4>
        <ul>${PUBLIC_BUSINESSES.map(
          (b) => `<li><a href="https://${esc(b.host)}/">${esc(b.name)}</a></li>`,
        ).join('')}</ul>
      </div>
      <div>
        <h4>Support</h4>
        <ul>
          <li><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
          <li><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></li>
        </ul>
      </div>
      <div>
        <h4>Network</h4>
        <ul>
          <li><a href="/about">About BBA Network</a></li>
          <li><a href="/api/stats">Network status</a></li>
        </ul>
      </div>
    </div>
    <div class="colophon">
      <span>&copy; ${new Date().getUTCFullYear()} BBA Network</span>
      <a class="social" href="${INSTAGRAM_URL}" rel="me noopener">
        ${icon('instagram')}<span>${INSTAGRAM_HANDLE}</span>
      </a>
    </div>
  </div>
</footer>
</body>
</html>`;
}

export function renderHome(): string {
  const liveCount = PUBLIC_BUSINESSES.filter((b) => b.status === 'live').length;

  const body = `
<section class="hero">
  ${signalField()}
  <div class="wrap">
    ${mark('hero-mark', true)}
    <h1>One network. Separate businesses.</h1>
    <p class="lede">
      BBA Network builds small, self-contained products that solve one problem properly.
      Each one runs on its own domain, takes its own payments, and stands or falls on its own.
      This page is the index.
    </p>
    <div class="hero-meta">
      <span>${icon('lock')} Payments handled by Stripe</span>
      <span>${icon('envelope')} <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></span>
    </div>
  </div>
</section>

${rule()}

<section class="section" id="businesses">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The businesses</p>
      <h2>What BBA Network sells</h2>
      <p>
        ${
          liveCount === PUBLIC_BUSINESSES.length
            ? 'Both are live. Each has its own site, its own checkout and its own support address.'
            : 'Each gets its own subdomain, its own checkout and its own support address. Anything not yet reachable says so here rather than sending you to a dead link.'
        }
      </p>
    </div>
    <div class="cards">
      ${PUBLIC_BUSINESSES.map(card).join('\n')}
    </div>
  </div>
</section>`;

  return layout({
    title: 'BBA Network — small products that solve one problem properly',
    description:
      'BBA Network builds small, self-contained products: printable reference guides, and ' +
      'plain-English website health checks. Each runs on its own domain.',
    path: '/',
    body,
  });
}

export function renderAbout(): string {
  const body = `
<section class="section">
  <div class="wrap">
    <div class="prose">
    <p class="eyebrow">About BBA Network</p>
    <h1>Small businesses. Useful products. Built with care.</h1>

    <p class="lead">
      BBA Network is a collection of independent businesses and products built to solve
      specific problems well.
    </p>
    <p>
      Rather than trying to build one company that does everything, each business has its own
      purpose, audience, and identity. That means you can find exactly what you&rsquo;re looking
      for without sorting through a collection of things that don&rsquo;t apply to you.
    </p>

    <h2>What we believe</h2>
    <p>
      The internet is full of products that are overcomplicated, overpromised, and difficult
      to use.
    </p>
    <p>We take a different approach.</p>
    <p>
      We build things that are clear, useful, straightforward, and worth paying for.
    </p>
    <p>
      That means putting time into the details that actually matter: making products easy to
      understand, making the buying experience simple, and making sure customers can get help
      when they need it.
    </p>

    <h2>Different businesses, one standard</h2>
    <p>
      The businesses within BBA Network may be completely different from one another. What
      connects them is the standard behind them.
    </p>
    <p>Every product should:</p>
    <ul class="checklist">
      <li>${bullet()}<span>Have a clear reason to exist.</span></li>
      <li>${bullet()}<span>Deliver what it promises.</span></li>
      <li>${bullet()}<span>Be simple to purchase and use.</span></li>
      <li>${bullet()}<span>Respect the customer&rsquo;s time and information.</span></li>
      <li>${bullet()}<span>Be supported by a real person when help is needed.</span></li>
    </ul>
    <p>
      Whether you&rsquo;re buying a digital product, using a service, or discovering something
      new, the goal is the same: make it useful and make it worth your time.
    </p>

    <h2>Built for customers</h2>
    <p>BBA Network is intentionally made up of independent businesses.</p>
    <p>
      Each one has its own website, products, support, and customer experience. This lets each
      business stay focused on the people it serves instead of becoming part of a large,
      complicated platform.
    </p>
    <p>You don&rsquo;t need to know how everything behind the scenes works.</p>
    <p>
      You just need to know that when you find something here that&rsquo;s useful to you,
      there&rsquo;s a real business behind it and someone who cares about making it better.
    </p>

    <h2>Have a question?</h2>
    <p>
      If you have a question about a product or purchase, contact the business directly through
      its support information.
    </p>
    <p>For general questions about BBA Network:</p>
    <p class="contact-line">
      <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
    </p>
    </div>
  </div>
</section>`;

  return layout({
    title: 'About — BBA Network',
    description:
      'BBA Network is a collection of independent businesses and products built to solve ' +
      'specific problems well. Different businesses, one standard.',
    path: '/about',
    body,
  });
}

export function renderNotFound(): string {
  const body = `
<section class="section">
  <div class="wrap">
    <div class="prose">
    <p class="eyebrow">404</p>
    <h1>That page is not here.</h1>
    <p>
      If you followed a link to a product or a download, it has moved to its own site. The
      businesses are listed below.
    </p>
    </div>
  </div>
  <div class="wrap" style="margin-top:2.5rem">
    <div class="cards">
      ${PUBLIC_BUSINESSES.map(card).join('\n')}
    </div>
  </div>
</section>`;

  return layout({
    title: 'Not found — BBA Network',
    description: 'That page is not here.',
    path: '/404',
    body,
  });
}

/** Only live, listed businesses belong in a sitemap. */
export function renderSitemap(): string {
  const urls = ['/', '/about']
    .map((p) => `  <url><loc>https://${APEX}${p}</loc></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export { BUSINESSES, PUBLIC_BUSINESSES };
