/**
 * The two scheduled checks. One runs in the Worker, one cannot.
 *
 *   redirect-guard  — the paths a paying customer walks. Someone holding an
 *                     emailed download link must still reach their file.
 *                     Runs from a GitHub runner:
 *                     .github/workflows/agent-redirect-guard.yml.
 *   link-warden     — that every business the register calls `live` actually
 *                     answers. `live` is a promise; this is what keeps it one.
 *                     Runs as a Cloudflare cron on this Worker.
 *
 * Both ran as GitHub Actions until 2026-08-24, when they moved here with the
 * deploy. `redirect-guard` went back on 2026-08-26, and the reason is a rule
 * rather than a preference:
 *
 *   **A check whose subject is this repo's own hostnames cannot run inside
 *   the Worker that serves them.**
 *
 * The note under `apexIdentity` below saw half of this coming and drew the
 * wrong conclusion from it. It says a subrequest to the apex cannot prove the
 * apex is still attached, "if the hostname still points here, the request
 * comes straight back to this same script" — so the result is recorded as a
 * fact rather than a pass. Two things turned out to be wrong with that.
 *
 * The request does not come back to this script. Cloudflare answers a Worker's
 * subrequest to its own route with `522`, so `apexIdentity` returned "apex
 * answered 522" on every run — a sentence that reads like an outage appended
 * to checks that had found nothing wrong.
 *
 * And the mitigation was applied to the wrong thing. `apexIdentity` is one
 * informational line. `redirectGuard` probes that same hostname for all nine
 * of its assertions, and those are asserted as passes. So the check that
 * actually depended on reaching the apex was left asserting failures it could
 * not have avoided, every day, from 2026-08-24 until the reporting gap closed
 * on 2026-08-26 and made it visible.
 *
 * `linkWarden` is unaffected and stays on the Worker: its subject is other
 * people's hostnames, which a Worker reaches perfectly well.
 */

import { APEX, BUSINESSES } from './businesses';
import { LEGACY_RULES } from './redirects';

/** The store every legacy rule points at. */
export const STORE = `https://guides.${APEX}`;

export interface CheckResult {
  agent: 'redirect-guard' | 'link-warden';
  ok: boolean;
  /** One line per problem. Empty when everything passed. */
  problems: string[];
  /** Everything probed, pass or fail, for the log. */
  log: string[];
}

/** Injected so the tests can drive these without touching the network. */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * A HEAD-like probe that never follows redirects and never throws.
 *
 * `redirect: 'manual'` matters more than it looks: the whole point of the
 * redirect guard is the status code and the Location header, and following
 * them would collapse a `308` into whatever the store answered.
 */
async function probe(
  fetcher: Fetcher,
  url: string,
): Promise<{ status: number; location: string | null }> {
  try {
    const response = await fetcher(url, { redirect: 'manual' });
    return { status: response.status, location: response.headers.get('location') };
  } catch {
    // Nothing answered — DNS, TLS, or a host that is simply gone. `0` is the
    // same convention curl uses for it, and is deliberately distinct from any
    // real status code.
    return { status: 0, location: null };
  }
}

/**
 * Every legacy customer path, plus the destination they all point at.
 *
 * The destination probe is the one that was missing when this lived in
 * Actions: each rule was checked for the right status and the right Location
 * header, and nothing asked whether anything answered at the other end. A
 * guard whose subject is the path a paying customer walks has to walk all of
 * it.
 */
export async function redirectGuard(fetcher: Fetcher, base: string): Promise<CheckResult> {
  const problems: string[] = [];
  const log: string[] = [];

  for (const rule of LEGACY_RULES) {
    // A path under the rule rather than the bare prefix, so the suffix-carrying
    // behaviour is exercised too.
    const path = `${rule.prefix}/probe`;
    const { status, location } = await probe(fetcher, `${base}${path}`);
    log.push(`${path} → ${status} → ${location ?? '<none>'}`);

    if (status !== rule.status) {
      problems.push(`${path} expected ${rule.status}, got ${status}`);
      continue;
    }
    const want = `${rule.target}${path.slice(rule.prefix.length)}`;
    if (location !== want) {
      problems.push(`${path} pointed at ${location ?? '<none>'}, expected ${want}`);
    }
  }

  // The hub's own endpoints, which must never be swallowed by a redirect rule.
  // /licence is here because it was a 301 to the store until the hub took it
  // back, and a future rule could quietly reclaim it — taking the terms a
  // customer agreed to at checkout with it.
  for (const own of ['/api/health', '/api/stats', '/licence']) {
    const { status } = await probe(fetcher, `${base}${own}`);
    log.push(`${own} → ${status}`);
    if (status !== 200) problems.push(`${own} expected 200, got ${status}`);
  }

  // Does the place all of that points to actually exist? Deliberately tolerant
  // of the answer: the store may legitimately say 401, 403 or 404 to a probe
  // with no token and no product id. What is being tested is that the host is
  // there at all.
  const store = await probe(fetcher, `${STORE}/`);
  log.push(`${STORE} → ${store.status}`);
  if (store.status === 0) {
    problems.push(
      `${STORE} did not answer. Every redirect above lands here, so all of them ` +
        `are dead ends however correct their status codes look.`,
    );
  }

  return { agent: 'redirect-guard', ok: problems.length === 0, problems, log };
}

/**
 * Every business the register calls `live`.
 *
 * `building` is allowed to answer with nothing — the hub renders it as a
 * disabled card rather than a link, which is the entire point of the status.
 * Only `live` is a promise, and only promises are checked.
 *
 * Anything in the 2xx or 3xx range counts as answering. A `3xx` is not a
 * consolation prize here: `heartbeat.` sits behind Cloudflare Access, so a
 * redirect to a login page is exactly what a healthy locked door looks like.
 */
export async function linkWarden(fetcher: Fetcher): Promise<CheckResult> {
  const problems: string[] = [];
  const log: string[] = [];

  for (const business of BUSINESSES) {
    if (business.status !== 'live') continue;

    const { status } = await probe(fetcher, `https://${business.host}/`);
    log.push(`${business.id} (${business.host}) → ${status}`);

    if (status < 200 || status >= 400) {
      problems.push(
        `${business.id} is marked live in the register but ${business.host} answered ${status}`,
      );
    }
  }

  return { agent: 'link-warden', ok: problems.length === 0, problems, log };
}

/**
 * What is answering on the apex, reported and never asserted.
 *
 * When this check ran on a GitHub runner it could prove the custom domain was
 * still attached, because the runner was genuinely somewhere else. From inside
 * the Worker that proof is not available — and not for the reason first
 * written here. The subrequest is not served by this same script: Cloudflare
 * answers a Worker's request to its own route with `522`, so from in there
 * this function reports an outage that is not happening.
 *
 * So it is only ever called from scripts/redirect-guard.ts, on a runner. The
 * Worker's own runs no longer append it at all — see the note in
 * src/index.ts.
 *
 * It is still worth asking. If the apex has been reassigned to a different
 * Worker, this returns that Worker's answer, which is a real and useful
 * finding. So the result is recorded in the run summary rather than counted as
 * a pass or a failure.
 */
export async function apexIdentity(fetcher: Fetcher): Promise<string> {
  try {
    const response = await fetcher(`https://${APEX}/api/health`, { redirect: 'manual' });
    if (!response.ok) return `apex answered ${response.status}`;
    const body = (await response.json()) as { service?: string };
    return body.service === 'bba-network-hub'
      ? 'apex serves this hub'
      : `apex serves ${body.service ?? 'something unidentified'}`;
  } catch {
    return 'apex did not answer';
  }
}
