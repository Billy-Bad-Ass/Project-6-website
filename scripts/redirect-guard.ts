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
 */

import { APEX } from '../src/businesses';
import { apexIdentity, redirectGuard } from '../src/checks';
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

// The reporting result deliberately does not affect this. A dashboard that
// will not take a log entry is not a reason to call a passing check failed,
// and it is not a reason to call a failing one passed either.
if (!result.ok) process.exit(1);
