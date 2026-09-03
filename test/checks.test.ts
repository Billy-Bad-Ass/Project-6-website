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
import { BRIDGED, BUSINESSES, type Business } from '../src/businesses';

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

/**
 * Every legacy rule answering correctly, and every bridged host answering
 * nothing.
 *
 * The bridged hosts have to be spelled out because the stub's default is 200
 * for anything unnamed — and a bridged host answering 200 while its card says
 * `building` is now a finding in its own right. Left to the default, these
 * fixtures would describe a world where the register is behind reality, which
 * is not what any of these tests are about.
 */
function allRulesPassing(): Record<string, { status: number; location?: string } | null> {
  const routes: Record<string, { status: number; location?: string } | null> = {};
  for (const rule of LEGACY_RULES) {
    routes[`${APEX_BASE}${rule.prefix}/probe`] = expectedFor(rule);
  }
  for (const business of BRIDGED) {
    routes[`https://${business.host}/`] = business.status === 'live' ? { status: 200 } : null;
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
    const routes = allRulesPassing();
    routes[`${STORE}/`] = null;

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('did not answer');
  });

  it('accepts a store that answers 404 — the host is what is being tested', async () => {
    const routes = allRulesPassing();
    routes[`${STORE}/`] = { status: 404 };

    const result = await redirectGuard(stub(routes), APEX_BASE);
    expect(result.ok).toBe(true);
  });

  it("fails when one of the hub's own paths is swallowed by a redirect", async () => {
    const routes = allRulesPassing();
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
   * The two drift cases, driven by a fixture rather than by the register.
   *
   * These used to reach into `BUSINESSES` for whatever happened to be
   * `building`. That worked while the register held a mixture, and stopped
   * working on 2026-09-03 when the last `building` business went live: the
   * array emptied, `pending[0]` became undefined, and two tests that had been
   * guarding a real bug started asserting nothing at all.
   *
   * The logic they cover has not changed and still matters — the next business
   * added will be `building` on the day it lands. So the fixture supplies one
   * of each status, and the coverage no longer depends on what the business is
   * doing this week.
   */
  const pendingFixture: Business = {
    id: 'fixture',
    host: 'fixture.example.org',
    name: 'Fixture',
    tagline: '',
    blurb: '',
    status: 'building',
    revenueModel: 'internal',
    repo: 'Billy-Bad-Ass/fixture',
    portfolioSlug: 'project-0',
    highlights: [],
  };

  /**
   * The drift that actually happened, and the reason this check changed.
   *
   * `guides.` started serving on 2026-08-24. The register said `building`
   * until 2026-08-29, so the hub rendered a disabled card reading "Opening
   * shortly" over a store that was taking checkout. The warden skipped it for
   * not being `live` — it was the one business it most needed to look at.
   */
  it('fails when a host that is not marked live is serving anyway', async () => {
    const routes = { [`https://${pendingFixture.host}/`]: { status: 200 } };

    const result = await linkWarden(stub(routes), [pendingFixture]);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain(pendingFixture.host);
    expect(result.problems[0]).toContain('answered 200');
  });

  /**
   * A `building` host that answers nothing is the honest case, not a fault.
   * A warden that complained about one would cry wolf every day from the
   * moment a business is registered until the day it opens.
   */
  it('accepts a host that is not marked live answering nothing', async () => {
    const routes = { [`https://${pendingFixture.host}/`]: null };

    const result = await linkWarden(stub(routes), [pendingFixture]);
    expect(result.ok).toBe(true);
  });

  /**
   * A bridged host is this Worker's own route, and Cloudflare answers a
   * Worker's subrequest to its own route with `522`. Probing it from here
   * would report a daily outage on a business that is answering fine — the
   * same trap that made `redirect-guard` cry wolf for a fortnight.
   */
  it('skips a host this Worker serves, and says so in the log', async () => {
    const bridged: Business = {
      ...pendingFixture,
      status: 'live',
      upstream: 'https://example.org/somewhere/',
    };
    // Mapped to null: if it were probed at all, it would read as not answering
    // and fail the check. Passing proves it was never probed.
    const routes = { [`https://${bridged.host}/`]: null };

    const result = await linkWarden(stub(routes), [bridged]);
    expect(result.ok).toBe(true);
    expect(result.log.join(' ')).toContain('this Worker serves it');
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

/**
 * The bridged-host assertion, and the false alarm it caused on the day it
 * shipped.
 *
 * The first version fired whenever a bridged host did not answer, regardless
 * of what the card claimed. `audit` was already corrected to `building` by
 * then, so the 07:40 run failed every morning with the words "Its card says
 * live" against a card that said building. An alarm that is wrong daily is the
 * one people learn to scroll past, and then the real one is missed too.
 */
describe('redirectGuard and a bridged host', () => {
  const base: Business = {
    id: 'bridged',
    host: 'bridged.example.org',
    name: 'Bridged',
    tagline: '',
    blurb: '',
    status: 'building',
    revenueModel: 'internal',
    repo: 'Billy-Bad-Ass/fixture',
    portfolioSlug: 'project-0',
    highlights: [],
    upstream: 'https://elsewhere.example.org/site/',
  };

  function rulesOnly() {
    const routes: Record<string, { status: number; location?: string } | null> = {};
    for (const rule of LEGACY_RULES) routes[`${APEX_BASE}${rule.prefix}/probe`] = expectedFor(rule);
    return routes;
  }

  it('does not complain about a dormant bridge whose card says building', async () => {
    const routes = rulesOnly();
    routes[`https://${base.host}/`] = null;

    const result = await redirectGuard(stub(routes), APEX_BASE, [base]);

    expect(result.ok).toBe(true);
    expect(result.log.join(' ')).toContain('bridged.example.org (bridged, building) → 0');
  });

  it('fails when a bridge whose card says live does not answer', async () => {
    const routes = rulesOnly();
    routes[`https://${base.host}/`] = null;

    const result = await redirectGuard(stub(routes), APEX_BASE, [{ ...base, status: 'live' }]);

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('door that does not open');
  });

  it('fails when a bridge is answering but its card still says building', async () => {
    const routes = rulesOnly();
    routes[`https://${base.host}/`] = { status: 200 };

    const result = await redirectGuard(stub(routes), APEX_BASE, [base]);

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('set it to live');
  });
});
