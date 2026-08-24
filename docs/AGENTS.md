# Agent orchestration

Project 6 owns a small slice of the portfolio's automation, and deliberately no
more than that. This is the boundary and the contract.

## Project 4 owns orchestration. This repo reports to it.

`Project-4/docs/AGENTS.md` sets the split, and it is worth quoting because it is
the reason this repo has no cron Worker and no agent-run table:

> **Project agents** — "These run from their **own** repositories. This
> dashboard does not schedule them — it shows their runs, because they report
> to `/api/agent-runs`."

So: portfolio-level agents (`portfolio-analyst`, `spend-auditor`,
`pipeline-nudge`, `heartbeat-watchdog`, `mention-router`) belong to Project 4 and
are not duplicated here. This repo runs the two checks that only make sense with
knowledge of the hub, and posts the outcome to Project 4's console.

**Nothing scheduled here may look beyond this repo's own hostnames.** If
something needs to run on a schedule against the whole portfolio, it belongs in
Project 4. That is the line, and it is unchanged.

What did change, on 2026-08-24: those two checks now run as **Cloudflare Cron
Triggers on this Worker** rather than as GitHub Actions. The deploy moved to
Cloudflare Workers Builds, and leaving two cron workflows behind in a repository
that otherwise no longer uses Actions is how you end up with checks nobody
remembers exist.

An earlier version of this file, and rule 4 in `CLAUDE.md`, said "do not add a
Worker cron to this repo" without qualification. That was written to stop two
systems competing over portfolio orchestration, not to stop this repo watching
its own two hostnames — but it did say what it said, so the change is recorded
here rather than quietly made.

## The agents that run here

| Agent | Owns | Runs | Where |
| --- | --- | --- | --- |
| `link-warden` | Every business the register calls `live` is actually reachable. | Daily 07:20 UTC | Worker cron |
| `redirect-guard` | The legacy apex paths that carry paying customers to their downloads. | Daily 07:40 UTC | Worker cron |
| `deploy` | Reports each production deploy and its smoke test. | On push to `main` | Actions, for now |
| mention | Routes an `@claude` mention on an issue or PR here. | On mention | Actions |

The two scheduled checks live in `src/checks.ts`; the mapping from cron
expression to check is in `src/index.ts`, and the expressions themselves are in
`wrangler.jsonc`. An expression added in one place without the other logs that
it ran nothing, rather than silently doing nothing.

Both are **deterministic probes**: they fetch, they compare, they report. No
model is involved on either path, which is why they cost nothing to run daily
and why they can be unit-tested — `test/checks.test.ts` covers the awkward
answers, including the ones that used to be read as passes.

The half that is genuinely gone is the investigation. On GitHub Actions a
failing probe handed its finding to Claude, which opened an issue. A Worker
cannot open a GitHub issue without a GitHub token, so a failing check now
surfaces in two places: the Worker's own logs, and Project 4's console. Neither
of those is a notification. Getting told rather than having to look is the next
thing to build, and email through Cloudflare's own routing is the obvious
candidate.

## Reporting a run

`src/report.ts` posts the outcome of every scheduled run:

```json
{ "agent": "redirect-guard", "project_slug": "project-6", "trigger": "cron",
  "status": "ok", "summary": "All checks passed — apex serves this hub." }
```

Valid `status`: `queued`, `running`, `ok`, `failed`, `skipped`.
Valid `trigger`: `cron`, `manual`, `github`, `webhook`.

**A reporting failure never fails the check that already ran.** The dashboard
being unreachable must not bury a redirect failure behind a logging failure —
losing a log entry is a much smaller problem than losing the finding.

**And a reporting failure is never reported as a success.** That sentence looks
redundant and is not: the previous version of this got it wrong three separate
times in one day. A bare `|| true` made an unset URL indistinguishable from a
successful post. `curl -f` does not fail on a `3xx`, so Cloudflare Access
answering `302` with a login page was logged as a completed write. Both were
written *as* the fix for the previous one.

`reportRun` therefore returns a sentence rather than a boolean, requires a
`2xx`, and names each failure as what it is — a redirect means Access with no
service token, a `401` means a token mismatch, no answer means the host is
gone.

### Project 4's side

`project-6` is registered in `Project-4/config/portfolio.ts` (on its
`claude/audit-business` branch, PR #9), with `revenueModel: 'none'` — a visitor
who buys an audit is project-1's revenue, and counting it here too would double
it. Runs posted with `"project_slug":"project-6"` attach to a project page once
that merges.

Flagging Project 1's pivot to Project 4 also surfaced a bug in its own ledger:
`reconcileStripe` attributed every charge to the first project with
`revenueModel: 'stripe'`, which was correct with one seller and silently wrong
with two — the $100 audit would have landed on the store's ROI permanently.
That is fixed on the same branch. Worth knowing, because it is the reason the
hub carries `portfolioSlug` on every business: the two sides must agree on names
for any of this to reconcile.

## What an agent here must never do

Project 4's guardrails apply, plus two specific to this repo:

- **No agent writes to Stripe.** Refunds and price changes are human decisions.
- **No agent marks a business `live`** in `src/businesses.ts` without confirming
  the host resolves. The register's honesty is the hub's only real product.
- **No agent weakens `src/redirects.ts` to make a check pass.** That file is the
  reason a customer who paid last week can still download what they bought.
  A failing redirect check is the system working.
- **Silence is a valid output.** Neither scheduled agent writes anything on a
  clean run.

## Secrets and variables

The scheduled checks read these as **Worker secrets**, not GitHub secrets.
Set them on the Worker — Cloudflare → Compute → `bba-network-hub` → Settings →
Variables and Secrets, or `npx wrangler secret put NAME`:

| Worker secret | Used by | Required? |
| --- | --- | --- |
| `DASHBOARD_URL` | reporting a scheduled run | No — unset means the run is not reported, and says so |
| `DASHBOARD_TOKEN` | reporting a scheduled run | No, but a set dashboard will answer `401` without it |
| `CF_ACCESS_CLIENT_ID` | reporting through Cloudflare Access | Yes, while the dashboard is behind Access |
| `CF_ACCESS_CLIENT_SECRET` | reporting through Cloudflare Access | Yes, while the dashboard is behind Access |

Every one is optional in the sense that the checks run without them. What
changes is whether anybody is told.

Repository **secrets**, for what is left on GitHub Actions:

| Secret | Used by |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | deploy — until Workers Builds replaces it |
| `CLOUDFLARE_ACCOUNT_ID` | deploy — until Workers Builds replaces it |
| `DASHBOARD_URL` | the deploy's own reporting step |
| `DASHBOARD_TOKEN` | the deploy's own reporting step |
| `CF_ACCESS_CLIENT_ID` | the deploy's own reporting step |
| `CF_ACCESS_CLIENT_SECRET` | the deploy's own reporting step |

The duplication is temporary and deliberate: the GitHub deploy stays until
Workers Builds is set up and has deployed successfully at least once. Removing
a working deploy path in the same change that adds an untested one is how you
end up unable to ship the fix.

Prefer `CLAUDE_CODE_OAUTH_TOKEN`: on a Max plan those runs cost nothing, where
an API key bills per token. The action gives the API key precedence when both
are present, so the workflows deliberately blank the key when a subscription
token exists.

Repository **variable**:

| Variable | Used by |
| --- | --- |
| `SITE_URL` | the deploy smoke test and both agent probes (defaults to `https://bbanetwork.org`) |

`GITHUB_TOKEN` is provided automatically by Actions.

### What happens with no Claude credential

Each agent is two halves: a deterministic `curl` probe, and a step that hands
any finding to Claude to investigate and open an issue. Only the second half
needs a credential.

With neither secret set, that step used to start anyway and fail — turning a
probe that had worked into a red X, and burying the finding it was reporting
inside a failed job. Both of the link warden's first two real findings were
reported that way: the probe was right and said so, and the run still showed
as failed for an unrelated reason.

The step is now gated on a credential existing, and when there is none the
finding is emitted as a `::warning` carrying the same detail. You lose the
investigation and the issue; you do not lose the fact. The probe half — the
half that actually knows whether a customer can reach anything — has never
needed a credential and still does not.

### Reporting through Cloudflare Access

`heartbeat.bbanetwork.org` is protected by Cloudflare Access, and the policy is
scoped to the **Worker** rather than to a hostname. That is the right choice for
a dashboard showing revenue — it covers every hostname routed there, including
ones added later — but it also covers `/api/agent-runs`, which is not a page a
human visits. It is the endpoint every project's CI posts to.

So an unauthenticated `POST` from a runner does not reach the API at all. Access
answers first, with a `302` to its login page, and `curl -f` reports failure.
No amount of correct `DASHBOARD_TOKEN` helps: that token is checked by the
application, and the request never gets to the application.

A machine gets through with an **Access service token** — a client ID and
secret sent as headers, which Access checks at the edge before passing the
request on. Set one up once:

1. Zero Trust → **Access controls** → **Service credentials** → **Service
   Tokens** → **Create Service Token**. Copy the Client ID and Client Secret;
   the secret is shown once.
2. Open the `bba-heartbeat` application → **Policies** → add a second policy
   with Action **Service Auth**, Include → **Service Token** → the one you just
   made. Leave the existing "Only me" policy alone: that is what lets *you* in
   from a browser, and Service Auth is what lets the runner in. An application
   needs both.
3. Put the pair in this repository's Actions secrets as `CF_ACCESS_CLIENT_ID`
   and `CF_ACCESS_CLIENT_SECRET`.

The workflows send both headers only when both are set, so nothing breaks if
the dashboard is ever moved out from behind Access.

### Why the reporting steps warn

Every reporting step ends without failing the job, because losing a log entry
must not fail a deploy that succeeded. For a long time it did that with a bare
`|| true`, which meant an unset URL, a rejected token and a successful post all
looked identical — and the steps reported nothing at all, in every run, for as
long as `DASHBOARD_URL` went unset.

They now distinguish the cases and emit a `::warning` for each one that is not
success. The job still passes; the log says what happened. A silent integration
is worse than a missing one, because a missing one gets noticed.

They also read the **status code** rather than trusting curl's exit code, which
took two attempts to get right. `curl -sf` does not fail on a `3xx` — `-f`
covers 4xx and 5xx only — so the first version of this fix accepted Access's
`302` to its login page as a successful post and printed "Reported to" over a
run that was never recorded. For an API call, a redirect is not a success; it
is the single most likely symptom of the Access problem described above, and
it now says so by name.
