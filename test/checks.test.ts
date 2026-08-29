/**
 * The scheduled checks.
 *
 * These matter as much as the redirect suite, and for the same reason: when
 * they ran as GitHub Actions they were never tested at all, and every bug
 * found in them that day was a bug in how they *reported*, not in what they
 * probed. A check that reports a failure as a success is worse than no check,
 * because it is trusted.
 *
 * So the cases below are mostly about the awkward answers — a redirect where a
 * 200 was expected, a host that does not resolve, a locked door answering 302.
 */

import { describe, expect, it } from 'vitest';
import { linkWarden, redirectGuard, apexIdentity, STORE, type Fetcher } from '../src/checks';
import { LEGACY_RULES } from '../src/redirects';
import { BUSINESSES } from '../src/businesses';

const APEX_BASE = 'https://bbanetwork.org';

/**
 * A fetcher driven by a lookup table.
 *
 * Anything not named answers 200, so each test only has to describe the thing
 * it is actually about. A url mapped to `null` throws, which is how a host
 * that does not resolve behaves.
 */
function stub(routes: Record<string, { status: number; location?: string; body?: unknown } | null>): Fetcher {
  return async (url: string) => {
    const route = routes[url];
    if (route === undefined) return new Response(null, { status: 200 });
    if (route === null) throw new TypeError('fetch failed');

    return new Response(route.body === undefined ? null : JSON.stringify(route.body), {
      status: route.status,
      headers: route.location ? { location: route.location } : undefined,
    });
  };
}

/** The redirect a rule should produce for the path the guard probes. */
function expectedFor(rule: (typeof LEGACY_RULES)[number]) {
  return { status: rule.status, location: `${rule.target}/probe` };
}

function allRulesPassing(): Record<string, { status: number; location?: string }> {
  const routes: Record<string, { status: number; location?: string }> = {};
  for (const rule of LEGACY_RULES) {
    routes[`${APEX_BASE}${rule.prefix}/probe`] = expectedFor(rule);
  }
  return routes;
}

describe('redirectGuard', () => {
  it('passes when every rule redirects correctly and the store answers', async () => {
    const result = await redirectGuard(stub(allRulesPassing()), APEX_BASE);
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('fails when a rule returns the wrong status', async () => {
    const routes = allRulesPassing();
    const rule = LEGACY_RULES[0]!;
    routes[`${APEX_BASE}${rule.prefix}/probe`] = { status: 200 };

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain(`expected ${rule.status}, got 200`);
  });

  it('fails when a rule points somewhere else', async () => {
    const routes = allRulesPassing();
    const rule = LEGACY_RULES[0]!;
    routes[`${APEX_BASE}${rule.prefix}/probe`] = {
      status: rule.status,
      location: 'https://example.com/elsewhere',
    };

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('https://example.com/elsewhere');
  });

  /**
   * The gap that existed for the whole life of the Actions version: every
   * redirect correct, and nothing at the other end of any of them.
   */
  it('fails when the store the rules point at does not resolve', async () => {
    const routes: Record<string, { status: number; location?: string } | null> = allRulesPassing();
    routes[`${STORE}/`] = null;

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('did not answer');
  });

  it('accepts a store that answers 404 — the host is what is being tested', async () => {
    const routes: Record<string, { status: number; location?: string }> = allRulesPassing();
    routes[`${STORE}/`] = { status: 404 };

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(true);
  });

  it("fails when one of the hub's own paths is swallowed by a redirect", async () => {
    const routes: Record<string, { status: number; location?: string }> = allRulesPassing();
    routes[`${APEX_BASE}/licence`] = { status: 301, location: `${STORE}/licence` };

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('/licence expected 200, got 301');
  });
});

describe('linkWarden', () => {
  const live = BUSINESSES.filter((b) => b.status === 'live');
  const pending = BUSINESSES.filter((b) => b.status !== 'live');

  /**
   * The world the register describes when it is telling the truth: every
   * `live` host answers, and every host that is not `live` answers nothing.
   *
   * Spelled out rather than leaning on the stub's default, which is 200 for
   * anything unnamed. That default is now itself a drift finding for a
   * `building` business, so a test resting on it would assert the opposite of
   * what its name claims.
   */
  function agreeing(): Record<string, { status: number } | null> {
    const routes: Record<string, { status: number } | null> = {};
    for (const business of live) routes[`https://${business.host}/`] = { status: 200 };
    for (const business of pending) routes[`https://${business.host}/`] = null;
    return routes;
  }

  it('passes when the register and the hosts agree', async () => {
    const result = await linkWarden(stub(agreeing()));
    expect(result.ok).toBe(true);
  });

  /**
   * heartbeat. is behind Cloudflare Access, so an unauthenticated probe is
   * redirected to a login page. That is a healthy locked door, not an outage —
   * and getting this wrong would mean a daily false alarm forever.
   */
  it('treats a 302 as healthy, because Access answers that way', async () => {
    const routes = agreeing();
    for (const business of live) routes[`https://${business.host}/`] = { status: 302 };

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(true);
  });

  it('fails when a live host does not resolve', async () => {
    expect(live.length).toBeGreaterThan(0);
    const routes = agreeing();
    routes[`https://${live[0]!.host}/`] = null;

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain(live[0]!.host);
    expect(result.problems[0]).toContain('answered 0');
  });

  it('fails when a live host answers 500', async () => {
    const routes = agreeing();
    routes[`https://${live[0]!.host}/`] = { status: 500 };

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(false);
  });

  /**
   * The drift that actually happened, and the reason this check changed.
   *
   * `guides.` started serving on 2026-08-24. The register said `building`
   * until 2026-08-29, so the hub rendered a disabled card reading "Opening
   * shortly" over a store that was taking checkout. The warden skipped it for
   * not being `live` — it was the one business it most needed to look at.
   */
  it('fails when a host that is not marked live is serving anyway', async () => {
    expect(pending.length).toBeGreaterThan(0);
    const routes = agreeing();
    routes[`https://${pending[0]!.host}/`] = { status: 200 };

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain(pending[0]!.host);
    expect(result.problems[0]).toContain('answered 200');
  });

  /**
   * A `building` host that answers nothing is the honest case, not a fault.
   * `audit.` is exactly that today — no DNS record, Project 1 still building
   * it — and a warden that complained would cry wolf every day until nobody
   * read it.
   */
  it('accepts a host that is not marked live answering nothing', async () => {
    const routes = agreeing();
    routes[`https://${pending[0]!.host}/`] = null;

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(true);
  });

  /**
   * Every business is probed now, whatever its status. The old warden logged
   * only the `live` ones, so a `building` business was absent from the run log
   * as well as unchecked — there was nothing for a human to notice either.
   */
  it('logs every business, not only the live ones', async () => {
    const result = await linkWarden(stub(agreeing()));
    for (const business of BUSINESSES) {
      expect(result.log.join(' ')).toContain(business.host);
    }
  });
});

describe('apexIdentity', () => {
  it('recognises this hub', async () => {
    const answer = await apexIdentity(
      stub({ [`${APEX_BASE}/api/health`]: { status: 200, body: { service: 'bba-network-hub' } } }),
    );
    expect(answer).toBe('apex serves this hub');
  });

  it('names a different service rather than passing it off as ours', async () => {
    const answer = await apexIdentity(
      stub({ [`${APEX_BASE}/api/health`]: { status: 200, body: { service: 'someone-else' } } }),
    );
    expect(answer).toContain('someone-else');
  });

  it('says so when the apex does not answer', async () => {
    const answer = await apexIdentity(stub({ [`${APEX_BASE}/api/health`]: null }));
    expect(answer).toBe('apex did not answer');
  });
});
