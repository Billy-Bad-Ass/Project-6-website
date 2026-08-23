/**
 * The apex Worker for bbanetwork.org.
 *
 * Three jobs, in this order of importance:
 *
 *   1. Never break a URL that used to work. The store lived here until this
 *      Worker took the apex, and a customer with a download link in their inbox
 *      must still get their file. See src/redirects.ts.
 *   2. Serve the hub — one page that says what the businesses are and sends
 *      people to the right one.
 *   3. Count which business gets clicked, in aggregate, so there is a real
 *      answer to "is the hub doing anything".
 *
 * It is not a store and it never touches Stripe. Money is taken on the
 * businesses' own subdomains, by their own Workers, from their own repos.
 */

import { legacyRedirect } from './redirects';
import { renderHome, renderAbout, renderNotFound, renderSitemap } from './render';
import { BUSINESSES, PUBLIC_BUSINESSES, businessById, destination, APEX } from './businesses';
import { BRAND_CSS } from './styles';

export interface Env {
  /**
   * Static assets (the brand kit). Bound by wrangler's `assets` config.
   */
  ASSETS: Fetcher;
  /**
   * Aggregate outbound click counts. OPTIONAL on purpose — see `countClick`.
   */
  CLICKS?: KVNamespace;
}

/**
 * Security headers applied to every HTML response.
 *
 * `script-src 'none'` is enforceable because the hub genuinely ships no
 * JavaScript. If that ever changes, this is the line that has to change with
 * it — and having to change it deliberately is the point.
 *
 * `style-src 'unsafe-inline'` is the one concession: the stylesheet is inlined
 * into the head to save a round trip. With no script execution allowed at all,
 * an injected style cannot exfiltrate anything.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; '),
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
};

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short shared cache with a long stale window: the content changes only
      // when someone edits and redeploys, and serving a slightly stale hub is
      // strictly better than serving an error while revalidating.
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
      ...SECURITY_HEADERS,
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
    },
  });
}

/**
 * Records an outbound click.
 *
 * Deliberately tolerant. If `CLICKS` is unbound — a fresh account, a preview
 * deploy, a namespace someone deleted — the visitor still gets sent where they
 * asked to go. A redirect that 500s because an analytics counter was missing
 * would be a self-inflicted outage on the one path that leads to money.
 *
 * What is stored: a per-business integer, and nothing else. No IP, no user
 * agent, no identifier of any kind, which is what lets this run without a
 * consent banner.
 */
async function countClick(env: Env, id: string): Promise<void> {
  if (!env.CLICKS) return;

  try {
    const key = `clicks:${id}`;
    const current = Number((await env.CLICKS.get(key)) ?? '0');
    await env.CLICKS.put(key, String(current + 1));
  } catch {
    // Counting is best-effort. Losing a click is a rounding error; failing the
    // redirect is a lost customer.
  }
}

async function readClicks(env: Env): Promise<Record<string, number | null>> {
  const counts: Record<string, number | null> = {};

  for (const business of BUSINESSES) {
    if (!env.CLICKS) {
      // Project 4's convention, and it matters here too: `null` means nobody
      // measured this, `0` means it was measured and is genuinely zero. A
      // missing KV binding must not read as "nobody has ever clicked".
      counts[business.id] = null;
      continue;
    }
    try {
      const raw = await env.CLICKS.get(`clicks:${business.id}`);
      counts[business.id] = raw === null ? 0 : Number(raw);
    } catch {
      counts[business.id] = null;
    }
  }

  return counts;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // 1. Legacy apex paths, before anything else can claim them.
    const moved = legacyRedirect(url);
    if (moved) {
      return new Response(null, {
        status: moved.status,
        headers: { location: moved.location, 'cache-control': 'public, max-age=3600' },
      });
    }

    // 2. Outbound click tracking. `ctx.waitUntil` so the write never delays
    //    the redirect the visitor is waiting on.
    if (path.startsWith('/go/')) {
      const id = path.slice('/go/'.length);
      const business = businessById(id);
      const target = business && destination(business);

      if (!target) return html(renderNotFound(), 404);

      ctx.waitUntil(countClick(env, id));
      return new Response(null, {
        status: 302,
        headers: { location: target, 'cache-control': 'no-store' },
      });
    }

    switch (path) {
      case '/':
        return html(renderHome());

      case '/about':
        return html(renderAbout());

      /**
       * The network's own status, as JSON. Public because there is nothing
       * secret in it, and useful because Project 4's dashboard can poll it
       * instead of scraping the page.
       */
      case '/api/stats': {
        const clicks = await readClicks(env);
        return json({
          apex: APEX,
          generated_at: new Date().toISOString(),
          clicks_measured: Boolean(env.CLICKS),
          businesses: BUSINESSES.map((b) => ({
            id: b.id,
            name: b.name,
            host: b.host,
            status: b.status,
            listed: !b.unlisted,
            repo: b.repo,
            portfolio_slug: b.portfolioSlug,
            outbound_clicks: clicks[b.id],
          })),
        });
      }

      case '/robots.txt':
        return new Response(
          `User-agent: *\nAllow: /\nDisallow: /go/\n\nSitemap: https://${APEX}/sitemap.xml\n`,
          { headers: { 'content-type': 'text/plain; charset=utf-8' } },
        );

      case '/sitemap.xml':
        return new Response(renderSitemap(), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        });

      /** Cheap liveness probe for Project 4's heartbeat-watchdog. */
      case '/api/health':
        return json({ ok: true, service: 'bba-network-hub', businesses: PUBLIC_BUSINESSES.length });

      /**
       * The design system, for the other subdomains.
       *
       * `guides.` and `audit.` are built in different repositories by different
       * sessions. The only way three sites stay looking like one network is a
       * single stylesheet they all link — a copy diverges the first time
       * somebody nudges a colour, and then the network looks like three
       * unrelated products that happen to share a logo.
       *
       * Versioned in the path rather than by a query string so a future
       * breaking change can ship as `/brand/v2.css` while v1 keeps serving the
       * sites that have not migrated. Cached for a day at the edge; a colour
       * fix reaches every subdomain without any of them redeploying.
       */
      case '/brand/v1.css':
        return new Response(BRAND_CSS, {
          headers: {
            'content-type': 'text/css; charset=utf-8',
            'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
            // Read cross-origin by design — that is the entire point of it.
            'access-control-allow-origin': '*',
            'x-content-type-options': 'nosniff',
          },
        });
    }

    // 3. Static assets — the brand kit and the fonts.
    //
    //    In normal operation this block does not run: Cloudflare serves a
    //    matching asset before the Worker is invoked at all, which is also why
    //    their cache and CORS headers live in public/_headers rather than here.
    //    This is the miss path, and it exists so an unmatched /assets/ URL gets
    //    the branded 404 below instead of the platform's bare one.
    if (path.startsWith('/assets/') || path.startsWith('/fonts/')) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    }

    return html(renderNotFound(), 404);
  },
};
