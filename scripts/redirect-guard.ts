/**
 * redirect-guard, run from outside the network.
 *
 * This check probes `https://bbanetwork.org/...` for every legacy customer
 * path. When it ran as a Worker cron it was probing the hostname that the
 * Worker itself serves, and Cloudflare answers a Worker's subrequest to its
 * own route with `522`. Every probe failed, every run since 2026-08-24
 * reported `failed`, and nothing said so out loud until the reporting gap
 * closed on 2026-08-26.
 *
 * `src/checks.ts` half-anticipated this. Its note on `apexIdentity` says a
 * subrequest from inside cannot prove the apex is still attached, and records
 * that result as a fact rather than a pass. What the note missed is that
 * `redirectGuard` probes the same hostname for all nine of its assertions, and
 * those are asserted as passes. The mitigation was applied to the one line
 * that was informational and not to the check that depended on it.
 *
 * There is no version of this that works from inside: the apex *is* the
 * Worker. So the check runs where it can — a GitHub runner, genuinely
 * somewhere else, which is where it ran before 2026-08-24 and where it
 * worked.
 *
 * It imports the same `redirectGuard` the Worker did. A verification path that
 * runs different code from the thing it verifies proves nothing about the
 * thing it verifies.
 *
 * ## It probes the business hosts too, since 2026-09-03
 *
 * `link-warden` runs on the Worker's own cron and skips the hosts this Worker
 * serves, with a note saying `redirect-guard` covers them from a runner. It
 * did not. This script probed the apex and nothing else, so
 * `audit.bbanetwork.org` — the one bridged host in the register — was skipped
 * in one place and absent from the other, and was the only host in the network
 * with no automated check on it whatsoever.
 *
 * So the warden runs here as well, with `skipBridged` off. Two things follow
 * that are worth having on purpose:
 *
 *   - Every host is now probed from genuinely outside the network, which is
 *     the only place an answer about DNS is evidence rather than a statement
 *     about this process.
 *   - The two runs can disagree. If the Worker's own pass ever reports a host
 *     down that the runner finds up, that is the `522` trap showing itself,
 *     and it now shows as two runs saying different things rather than as one
 *     unchallenged wrong answer.
 *
 * They report as two runs under their own names rather than one merged run.
 * An agent is one subject: merging them would put host findings under the name
 * of the check that watches customer download links, and the day one of them
 * breaks nobody would know which.
 */

import { APEX } from '../src/businesses';
import { apexIdentity, hostIdentities, linkWarden, redirectGuard } from '../src/checks';
import { reportRun } from '../src/report';

const env = {
  DASHBOARD_URL: process.env.DASHBOARD_URL,
  DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN,
  CF_ACCESS_CLIENT_ID: process.env.CF_ACCESS_CLIENT_ID,
  CF_ACCESS_CLIENT_SECRET: process.env.CF_ACCESS_CLIENT_SECRET,
};

const result = await redirectGuard(fetch, `https://${APEX}`);
for (const line of result.log) console.log(`  ${line}`);

// From here this genuinely means something. A runner is somewhere else, so an
// answer from the apex is evidence about DNS rather than about this process.
const apex = await apexIdentity(fetch);

const summary = result.ok
  ? `All checks passed — ${apex}.`
  : `${result.problems.join('; ')} — ${apex}.`;

console.log(`redirect-guard: ${result.ok ? 'ok' : 'FAILED'} — ${summary}`);
console.log(`redirect-guard: ${await reportRun(env, {
  agent: 'redirect-guard',
  status: result.ok ? 'ok' : 'failed',
  summary,
})}`);

/**
 * Every business host, bridged ones included, from out here.
 *
 * `skipBridged: false` is the whole reason this runs on a runner rather than
 * on the Worker. Read the run log before the verdict — the log line for a host
 * is the evidence, and the verdict is only what the register makes of it.
 */
console.log('');
// SMOKE TEST ONLY — never merged. A host that does not exist, so the alarm
// path can be proved end to end without touching the register or the site.
const { BUSINESSES } = await import('../src/businesses');
const hosts = await linkWarden(fetch, [...BUSINESSES, {
  id: 'smoketest', host: 'this-host-does-not-exist.bbanetwork.org', name: 'Smoke Test',
  tagline: '', blurb: '', status: 'live' as const, revenueModel: 'internal' as const,
  repo: 'Billy-Bad-Ass/web-6', portfolioSlug: 'project-0', highlights: [],
}], false);
for (const line of hosts.log) console.log(`  ${line}`);

/**
 * And what each of them actually served.
 *
 * Printed even when every status passed, because the failure this catches is
 * the one where they all do: a hostname answering `200` with somebody else's
 * site. Recorded, never asserted — see the note on `hostIdentities`.
 */
console.log('');
for (const line of await hostIdentities(fetch)) console.log(`  ${line}`);
console.log('');

const hostSummary = hosts.ok
  ? 'Every business host answered, and the register agrees with all of them.'
  : hosts.problems.join('; ');

console.log(`link-warden: ${hosts.ok ? 'ok' : 'FAILED'} — ${hostSummary}`);
console.log(`link-warden: ${await reportRun(env, {
  agent: 'link-warden',
  status: hosts.ok ? 'ok' : 'failed',
  summary: `${hostSummary} Probed from a GitHub runner, so bridged hosts are included.`,
})}`);

// The reporting result deliberately does not affect this. A dashboard that
// will not take a log entry is not a reason to call a passing check failed,
// and it is not a reason to call a failing one passed either.
//
// Both checks run before either can exit: a failing apex must not hide the
// state of the hosts, which is the half a human is more likely to act on.
if (!result.ok || !hosts.ok) process.exit(1);
