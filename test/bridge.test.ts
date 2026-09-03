/**
 * The audit bridge: the hub serving another business's site on that
 * business's own hostname.
 *
 * This is the one place the hub stops being a signpost, so it is the one place
 * worth testing hardest. Three things can go wrong and each is silent:
 *
 *  - the apex's own routing leaks onto the bridged hostname, and a paying
 *    visitor is shown the wrong business
 *  - the subdirectory is dropped when mapping a path, so `/legal.html` lands at
 *    the upstream's root — a different product entirely
 *  - this hostname is forwarded upstream, and GitHub Pages answers for a host
 *    it does not recognise
 *
 * The upstream is stubbed rather than fetched. These assert the mapping and
 * the isolation, which are this repo's to get right; whether the audit site
 * itself is up is `redirect-guard`'s job, from a runner, against the real host.
 */

import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { businessById } from '../src/businesses';

const UPSTREAM = businessById('audit')!.upstream!;

function stubFetch() {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input);
    if (url === UPSTREAM) {
      return new Response('<title>Website Health Check</title><a href="legal.html">Terms</a>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    if (url === `${UPSTREAM}legal.html`) {
      return new Response('<title>Terms</title>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url === `${UPSTREAM}assets/report-preview.png`) {
      return new Response('PNG', { status: 200, headers: { 'content-type': 'image/png' } });
    }
    return new Response('not found', { status: 404 });
  });
}

const env = {} as never;
const ctx = { waitUntil() {}, passThroughOnException() {} } as never;
const call = (u: string, init?: RequestInit) => worker.fetch(new Request(u, init), env, ctx);

describe('the audit bridge', () => {
  it('serves the audit site on its own hostname, not the hub', async () => {
    const f = stubFetch();
    vi.stubGlobal('fetch', f);

    const res = await call('https://audit.bbanetwork.org/');
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(body).toContain('Website Health Check');
    // The failure this guards: the hub's homepage under the audit name, which
    // is exactly what audit.bbanetwork.org served on 2026-08-29.
    expect(body).not.toContain('One network. Separate businesses.');
    expect(f.mock.calls[0]![0]).toBe(UPSTREAM);
  });

  it('keeps the subdirectory when mapping a path', async () => {
    const f = stubFetch();
    vi.stubGlobal('fetch', f);

    const res = await call('https://audit.bbanetwork.org/legal.html');

    expect(res.status).toBe(200);
    expect(f.mock.calls[0]![0]).toBe(`${UPSTREAM}legal.html`);
  });

  it('maps a relative asset path, so the page is not text-only', async () => {
    vi.stubGlobal('fetch', stubFetch());

    const res = await call('https://audit.bbanetwork.org/assets/report-preview.png');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  /**
   * GitHub Pages serves by Host header. Forwarding this request's headers
   * would send `Host: audit.bbanetwork.org` to a server that has never heard
   * of it, and the answer would not be the audit site.
   */
  it('never sends this hostname upstream', async () => {
    const f = stubFetch();
    vi.stubGlobal('fetch', f);

    await call('https://audit.bbanetwork.org/');

    const sent = (f.mock.calls[0]![1] as RequestInit | undefined)?.headers;
    expect(JSON.stringify(sent ?? {})).not.toContain('audit.bbanetwork.org');
  });

  it('leaves the apex alone and does not fetch anything for it', async () => {
    const f = stubFetch();
    vi.stubGlobal('fetch', f);

    const res = await call('https://bbanetwork.org/');

    expect(await res.text()).toContain('One network. Separate businesses.');
    expect(f).not.toHaveBeenCalled();
  });

  /**
   * A blank 502 on a page asking for $100 reads as a dead business. If the
   * upstream is unreachable the visitor gets a sentence and an address.
   */
  it('says something honest when the upstream is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    const res = await call('https://audit.bbanetwork.org/');

    expect(res.status).toBe(502);
    expect(await res.text()).toContain('support@bbanetwork.org');
  });

  it('passes an upstream 404 through rather than inventing a page', async () => {
    vi.stubGlobal('fetch', stubFetch());

    const res = await call('https://audit.bbanetwork.org/nope.html');

    expect(res.status).toBe(404);
  });

  it('refuses a method the site has no use for', async () => {
    const f = stubFetch();
    vi.stubGlobal('fetch', f);

    const res = await call('https://audit.bbanetwork.org/', { method: 'POST' });

    expect(res.status).toBe(405);
    expect(f).not.toHaveBeenCalled();
  });
});
