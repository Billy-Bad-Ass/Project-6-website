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
knowledge of the hub, on GitHub Actions, and posts the outcome to Project 4's
console.

**Do not add a Worker cron to this repo.** If something needs to run on a
schedule against the whole portfolio, it belongs in Project 4.

## The agents that run here

| Agent | Owns | Runs |
| --- | --- | --- |
| `link-warden` | Every business the register calls `live` is actually reachable. | Daily 07:20 UTC |
| `redirect-guard` | The legacy apex paths that carry paying customers to their downloads. | Daily 07:40 UTC |
| `deploy` | Reports each production deploy and its smoke test. | On push to `main` |
| mention | Routes an `@claude` mention on an issue or PR here. | On mention |

Both scheduled agents run a **deterministic `curl` probe first** and only spend
an agent run when the probe fails. On a healthy day neither costs anything
beyond a few seconds of runner time. That is Project 4's pattern and it is worth
keeping: an agent that reports "all good" every morning is an agent whose issues
nobody reads.

## Reporting a run

Every workflow posts its outcome:

```bash
curl -sf -X POST "$DASHBOARD_URL/api/agent-runs" \
  -H "Authorization: Bearer $DASHBOARD_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"agent":"redirect-guard","project_slug":"project-6","trigger":"cron",
       "status":"ok","summary":"Legacy customer paths all redirect correctly.",
       "artifact_url":"https://github.com/.../runs/123"}' \
  || true
```

Valid `status`: `queued`, `running`, `ok`, `failed`, `skipped`.
Valid `trigger`: `cron`, `manual`, `github`, `webhook`.

**Every reporting step ends in `|| true`.** The dashboard being down must not
fail a deploy that already succeeded, or bury a redirect failure behind a
logging failure. Losing a log entry is a much smaller problem.

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

Repository **secrets**:

| Secret | Used by |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | deploy |
| `CLOUDFLARE_ACCOUNT_ID` | deploy |
| `DASHBOARD_URL` | every reporting step |
| `DASHBOARD_TOKEN` | every reporting step |
| `CF_ACCESS_CLIENT_ID` | every reporting step, if the dashboard is behind Access |
| `CF_ACCESS_CLIENT_SECRET` | every reporting step, if the dashboard is behind Access |
| `CLAUDE_CODE_OAUTH_TOKEN` *or* `ANTHROPIC_API_KEY` | the agent workflows |

Prefer `CLAUDE_CODE_OAUTH_TOKEN`: on a Max plan those runs cost nothing, where
an API key bills per token. The action gives the API key precedence when both
are present, so the workflows deliberately blank the key when a subscription
token exists.

Repository **variable**:

| Variable | Used by |
| --- | --- |
| `SITE_URL` | the deploy smoke test and both agent probes (defaults to `https://bbanetwork.org`) |

`GITHUB_TOKEN` is provided automatically by Actions.

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

They now distinguish the three cases and emit a `::warning` for the two that
are not success. The job still passes; the log says what happened. A silent
integration is worse than a missing one, because a missing one gets noticed.
