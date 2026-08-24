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
  const building = BUSINESSES.filter((b) => b.status !== 'live');

  it('passes when every live host answers', async () => {
    const result = await linkWarden(stub({}));
    expect(result.ok).toBe(true);
  });

  /**
   * heartbeat. is behind Cloudflare Access, so an unauthenticated probe is
   * redirected to a login page. That is a healthy locked door, not an outage —
   * and getting this wrong would mean a daily false alarm forever.
   */
  it('treats a 302 as healthy, because Access answers that way', async () => {
    const routes: Record<string, { status: number }> = {};
    for (const business of live) routes[`https://${business.host}/`] = { status: 302 };

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(true);
  });

  it('fails when a live host does not resolve', async () => {
    expect(live.length).toBeGreaterThan(0);
    const routes: Record<string, null> = {};
    routes[`https://${live[0]!.host}/`] = null;

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain(live[0]!.host);
    expect(result.problems[0]).toContain('answered 0');
  });

  it('fails when a live host answers 500', async () => {
    const routes: Record<string, { status: number }> = {};
    routes[`https://${live[0]!.host}/`] = { status: 500 };

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(false);
  });

  /**
   * `building` is allowed to 404. The hub renders it as a disabled card rather
   * than a link, which is the whole point of the status — and a warden that
   * failed on it would make the honest state of the register unreportable.
   */
  it('ignores hosts that are not marked live', async () => {
    expect(building.length).toBeGreaterThan(0);
    const routes: Record<string, null> = {};
    for (const business of building) routes[`https://${business.host}/`] = null;

    const result = await linkWarden(stub(routes));
    expect(result.ok).toBe(true);
    expect(result.log.join(' ')).not.toContain(building[0]!.host);
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
