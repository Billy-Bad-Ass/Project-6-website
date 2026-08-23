/**
 * The business register.
 *
 * This is the one file you edit when a business is added, renamed, moved to a
 * different host, or starts actually selling something. The hub page, the
 * redirect map, the sitemap and /api/stats all read from here.
 *
 * What is deliberately NOT here: any claim that changes on its own. Whether a
 * business is *earning* is Stripe's business and Project 4's dashboard shows
 * it. This file records what a business IS and WHERE it lives — facts that
 * only change when a human changes them.
 *
 * The honesty rule, inherited from Project 4: a status of `live` is a promise
 * that a customer can reach that host and give you money today. If that is not
 * true, the correct value is `building`, and the hub renders it as such rather
 * than shipping a card that leads to a dead link.
 */

/** How a business takes money. Drives which call-to-action the card renders. */
export type RevenueModel =
  | 'stripe-checkout' // self-serve — Stripe Checkout, instant delivery
  | 'stripe-payment-link' // self-serve — a hosted Payment Link, delivery by hand
  | 'internal'; // not for sale; internal tooling

export type Status =
  | 'live' // reachable, and a customer can buy today
  | 'building' // exists, not yet reachable at its host
  | 'planned'; // named and reserved, nothing built

export interface Business {
  /** URL-safe id. Stable — the redirect map and KV click counters key on it. */
  id: string;
  /** The subdomain this business owns. The whole point of the split. */
  host: string;
  name: string;
  /** What it sells, in the customer's words. One line, no hype. */
  tagline: string;
  /**
   * The longer pitch. Two or three sentences — this is a hub, not a landing
   * page; the business's own site does the selling.
   */
  blurb: string;
  status: Status;
  revenueModel: RevenueModel;
  /** Which repo builds and deploys this. Not this one, for every entry below. */
  repo: string;
  /** Project 4's portfolio slug, so its runs and this hub agree on names. */
  portfolioSlug: string;
  /** Font Awesome Free icon id — see brand/icons.ts for the inlined set. */
  icon: string;
  /** Shown on the card. Kept vague on purpose: exact prices live on the sites. */
  priceHint?: string;
  /** Listed on the card so a visitor knows what they are getting before a click. */
  highlights: string[];
  /** Excluded from the public hub and from the sitemap. */
  unlisted?: boolean;
}

export const APEX = 'bbanetwork.org';
export const SUPPORT_EMAIL = `support@${APEX}`;
export const CONTACT_EMAIL = `hello@${APEX}`;

/**
 * Note on hosts: nothing here is pointed automatically. Adding a custom domain
 * to a Worker is done in the Cloudflare dashboard, on purpose — a `routes`
 * entry in wrangler.jsonc makes the deploy responsible for creating DNS
 * records, and the deploy token does not have that permission. See
 * docs/DOMAINS.md.
 */
export const BUSINESSES: Business[] = [
  {
    id: 'guides',
    host: `guides.${APEX}`,
    name: 'BBA Guides',
    tagline: 'Printable reference guides that actually fix the problem.',
    blurb:
      'One page, one problem, printed and stuck where the problem happens. No login, no app, ' +
      'no fifty-minute video. Buy it, print it, put it next to the machine.',
    status: 'building',
    revenueModel: 'stripe-checkout',
    repo: 'Billy-Bad-Ass/Project-2',
    portfolioSlug: 'project-2',
    icon: 'print',
    priceHint: 'From a few pounds',
    highlights: [
      'Espresso dial-in troubleshooting card',
      'Keyboard sound & mod chart',
      'Miniature speed-paint recipe sheet',
      'A4 and US Letter, instant download',
    ],
  },
  {
    id: 'audit',
    host: `audit.${APEX}`,
    name: 'Website Health Check',
    tagline: "A plain-English review of what's broken on your website.",
    blurb:
      'What is broken, what each problem costs you in lost customers, and exactly how to fix ' +
      'it. Written by a human who looked at your actual site. Delivered within one working day.',
    status: 'building',
    revenueModel: 'stripe-payment-link',
    repo: 'Billy-Bad-Ass/Project-1',
    portfolioSlug: 'project-1',
    icon: 'stethoscope',
    priceHint: '$100 one-off',
    highlights: [
      'Every issue ranked by what it costs you',
      'Plain English — no jargon, no dashboard to learn',
      'Fixes you can hand straight to a developer',
      'One working day',
    ],
  },
  {
    id: 'heartbeat',
    host: `heartbeat.${APEX}`,
    name: 'Heartbeat',
    tagline: 'The instrument panel for the portfolio.',
    blurb:
      'Internal. Live numbers for every project — what it earns, what it costs, and what the ' +
      'agent fleet did about any of it. Behind Cloudflare Access.',
    status: 'live',
    revenueModel: 'internal',
    repo: 'Billy-Bad-Ass/Project-4',
    portfolioSlug: 'project-4',
    icon: 'heart-pulse',
    highlights: [],
    unlisted: true,
  },
];

/** The businesses the public hub renders, in the order it renders them. */
export const PUBLIC_BUSINESSES = BUSINESSES.filter((b) => !b.unlisted);

export function businessById(id: string): Business | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

/**
 * A business is only linked as a destination once it is reachable. `building`
 * renders as a disabled card with an honest label rather than a link to a host
 * that does not resolve yet — a dead link on the hub is worse than an absent
 * one, because it looks like the whole network is broken.
 */
export function destination(business: Business): string | null {
  return business.status === 'live' ? `https://${business.host}/` : null;
}
