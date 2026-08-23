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

### One thing to check on Project 4's side

`Project-4/config/portfolio.ts` has entries for `project-1` through
`project-5`. There is no `project-6`, so runs posted with
`"project_slug":"project-6"` arrive with a slug the dashboard does not know.
The runs are still recorded — `agent_runs.project_slug` is a plain nullable
column, not a foreign key — but they will not attach to a project page until
that entry exists.

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
