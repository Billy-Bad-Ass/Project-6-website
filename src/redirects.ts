/**
 * Legacy apex paths.
 *
 * The store used to BE `bbanetwork.org`. Moving it to `guides.bbanetwork.org`
 * means every URL a customer bookmarked, every link Google has indexed, and —
 * the dangerous one — every download link already sitting in a paying
 * customer's inbox now points at a host that no longer serves the store.
 *
 * None of those may break. This module is what keeps that promise.
 *
 * ## Why two different status codes
 *
 * `301` for pages: it is the code search engines treat as "move the ranking",
 * and browsers cache it hard. Correct for content that moved.
 *
 * `308` for `/api/*`: a 301 or 302 permits a client to rewrite a POST into a
 * GET when it follows the redirect. For `/api/stripe/webhook` and
 * `/api/checkout` that would silently turn a payment into a no-op. 308 is the
 * permanent redirect that *requires* the method and body to be preserved.
 *
 * ## The webhook still needs a human
 *
 * 308 makes download links keep working, because browsers follow redirects.
 * It does NOT reliably save the Stripe webhook: Stripe treats a 3xx response
 * as a failed delivery rather than following it. The endpoint URL has to be
 * repointed in the Stripe dashboard to `https://guides.bbanetwork.org/api/stripe/webhook`.
 * Until that is done, this redirect is a safety net for customer traffic and
 * nothing more. See docs/DOMAINS.md, "Before you move the apex".
 */

const GUIDES = 'https://guides.bbanetwork.org';

interface Rule {
  /** Matches when the request path equals this, or starts with it plus `/`. */
  prefix: string;
  /** Where it goes. The matched suffix and the query string are carried over. */
  target: string;
  status: 301 | 308;
  why: string;
}

/**
 * Ordered: the first matching rule wins, so put the more specific prefix first.
 * `/api` sits above nothing else today, but the ordering guarantee is what lets
 * a future `/api/download/bulk` rule be added above it without surprises.
 */
export const LEGACY_RULES: Rule[] = [
  {
    prefix: '/api',
    target: `${GUIDES}/api`,
    status: 308,
    why: 'Checkout, webhook and the signed download links already in inboxes. Method-preserving.',
  },
  {
    prefix: '/products',
    target: `${GUIDES}/products`,
    status: 301,
    why: 'Indexed product pages. This is where the store’s search authority lives.',
  },
  {
    prefix: '/success',
    target: `${GUIDES}/success`,
    status: 301,
    why: 'Post-checkout landing. Reached mid-purchase, so it must not 404.',
  },
  {
    prefix: '/licence',
    target: `${GUIDES}/licence`,
    status: 301,
    why: 'The licence a buyer is agreeing to. Linked from receipts.',
  },
];

/**
 * Paths under a redirected prefix that the hub serves itself.
 *
 * `/api` is forwarded wholesale to the store, which is correct for checkout,
 * the webhook and download links — but the hub has its own `/api/stats` and
 * `/api/health`, and without this exception list it would forward its own
 * status endpoints to a store that has never heard of them. Project 4's
 * heartbeat-watchdog polls `/api/health`; a 308 to another host is exactly the
 * kind of "monitoring that monitors the wrong thing" that hides an outage.
 */
const HUB_OWNED = new Set(['/api/stats', '/api/health']);

export interface Redirect {
  location: string;
  status: 301 | 308;
}

/**
 * Resolves a legacy apex path, or null when the hub should serve it itself.
 *
 * Note what is deliberately absent: `/about`. The store had one, and so does
 * the network — at the apex, "about" now means the network. An inbound link
 * lands on a related page rather than a 404, which is the right trade for a
 * page that carries no purchase intent.
 */
export function legacyRedirect(url: URL): Redirect | null {
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (HUB_OWNED.has(path)) return null;

  for (const rule of LEGACY_RULES) {
    if (path !== rule.prefix && !path.startsWith(`${rule.prefix}/`)) continue;

    const suffix = path.slice(rule.prefix.length);
    return {
      location: `${rule.target}${suffix}${url.search}`,
      status: rule.status,
    };
  }

  return null;
}
