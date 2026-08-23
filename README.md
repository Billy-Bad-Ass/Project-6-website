# BBA Network — the hub

The apex site for `bbanetwork.org`. It names the businesses, sends people to the
right one, and keeps every URL the store used to own working.

```
bbanetwork.org            this repo      the hub — names the businesses
├── guides.               Project 2      printable reference guides
├── audit.                Project 1      Website Health Check
└── heartbeat.            Project 4      internal dashboard, behind Access
```

Each business deploys itself, from its own repository, onto its own Worker. This
repo does not build any of them — it points at them, and it is the only thing
that knows the whole set exists.

## The one thing to understand first

**The store used to be this hostname.** Somewhere there is a customer holding a
receipt with a link to `bbanetwork.org/api/download?token=…` that they have not
clicked yet.

`src/redirects.ts` is what keeps that link working. It is the highest-stakes
file here, it is covered by unit tests, it is smoke-tested on every deploy, and
an agent re-checks it against the live site every morning. Read the comment at
the top of it before changing anything in it.

`301` moves the indexed pages. `308` moves `/api/*`, because a `301` lets a
client rewrite a `POST` into a `GET` — which would turn a checkout into a
silent no-op.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:8787
npm run check      # typecheck + tests
```

Deploying is a push to `main`. The workflow gates on the test suite, deploys,
then smoke-tests the live apex — including that download redirect — and fails
the run if it is wrong.

## Layout

| Path | What it is |
| --- | --- |
| `src/businesses.ts` | **The register.** The one file you edit to add or move a business. |
| `src/redirects.ts` | Legacy apex paths. The customer-safety file. |
| `src/render.ts` | The pages. Plain template strings, no framework. |
| `src/styles.ts` | The design system, keyed to the brand kit's own hex values. |
| `src/icons.ts` | Generated from Font Awesome by `npm run icons`. Do not hand-edit. |
| `public/assets/` | The brand kit — SVG and PNG. |
| `docs/DOMAINS.md` | **Read before pointing any DNS.** Order matters; two steps cost money if skipped. |
| `docs/AGENTS.md` | What runs automatically, and why so little of it lives here. |

## How a business gets added

Edit `src/businesses.ts`. Everything else — the cards, the footer, `/api/stats`,
the sitemap, what the link warden probes — reads from that array.

The one rule: **`status: 'live'` is a promise that a customer can reach that
host and pay today.** If that is not true, the value is `'building'`, and the
hub renders an honest "opening shortly" instead of a button to a dead host. An
agent checks this every morning and opens an issue when the register and reality
disagree.

## What this hub deliberately does not do

- **It never touches Stripe.** Money is taken on the businesses' own subdomains
  by their own Workers. This is a signpost, not a store.
- **It ships no JavaScript.** That is what lets the Content-Security-Policy say
  `script-src 'none'` and mean it.
- **It tracks nothing about you.** Outbound clicks are counted per business in
  KV — an integer per business, no identifier of any kind. That is why there is
  no cookie banner.
- **It does not schedule portfolio agents.** Project 4 owns that. See
  `docs/AGENTS.md`.

## Cloudflare

| Resource | Name | For |
| --- | --- | --- |
| Worker | `bba-network-hub` | The site |
| KV | `bba-network-hub-clicks` | Aggregate outbound click counts |
| Static assets | `./public` | The brand kit |

The KV binding is **optional at runtime**: if it is missing, `/go/:id` still
redirects and `/api/stats` reports `null` rather than `0` for the counts —
"nobody measured this" and "measured, genuinely zero" are different facts, and
the API keeps them apart. A missing analytics counter must never break the path
that leads to money.
