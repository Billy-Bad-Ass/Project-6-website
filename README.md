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

**The store used to be this hostname.** Once it takes a sale, a customer holds a
receipt with a link to `bbanetwork.org/api/download?token=…` and may not click it
for months.

The live Stripe account has taken no charges yet, so nothing is at risk today —
which is precisely why the redirects are cheap to get right now rather than
after the first customer cannot reach their file. `src/redirects.ts` is what
keeps that link working. It is the highest-stakes
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

Deploying is a push to `main`. **Cloudflare Workers Builds** watches the
repository and runs two commands in order — `npm run check`, then
`npx wrangler deploy`. A failing test suite fails the build, and a failed build
never reaches the deploy, which is what keeps the redirect suite standing
between a refactor and a customer who cannot download what they paid for.

There is no deploy workflow in `.github/`, and no Cloudflare credential in this
repository's secrets. Both live on Cloudflare's side of the Git integration.
What is left in Actions is the test suite on pull requests and the `@claude`
mention router.

### Configuration that lives on the Worker

The two scheduled checks run as Cloudflare Cron Triggers and report into
Project 4's console, which needs four **Worker** secrets — set under Settings →
Variables and Secrets, or with `npx wrangler secret put NAME`:

| Secret | For |
| --- | --- |
| `DASHBOARD_URL` | Where to post a run |
| `DASHBOARD_TOKEN` | Project 4's own bearer check |
| `CF_ACCESS_CLIENT_ID` | Getting past Cloudflare Access, which fronts the dashboard |
| `CF_ACCESS_CLIENT_SECRET` | The other half of that |

All four are optional. Without them the checks still run and still say what
they found; what changes is whether anybody is told. See `docs/AGENTS.md`.

`CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) is needed only by the agent
workflows — see [`docs/AGENTS.md`](docs/AGENTS.md).

## Layout

| Path | What it is |
| --- | --- |
| `src/businesses.ts` | **The register.** The one file you edit to add or move a business. |
| `src/redirects.ts` | Legacy apex paths. The customer-safety file. |
| `src/render.ts` | The pages. Plain template strings, no framework. |
| `src/styles.ts` | **The design system.** Also served at `/brand/v1.css` for the other subdomains. |
| `src/motifs.ts` | **All artwork.** The hero signal field, the product illustrations, the bullet and the interface icons. All original. |
| `templates/` | Ready-to-use pages for `guides.` and `audit.`, in the network's design. |
| `public/assets/`, `public/fonts/` | The brand kit, and the two self-hosted variable faces. |
| `docs/BRAND.md` | How the other repos adopt the design system. |
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

## One design system, three sites

The hub, the store and the audit service are built in three repositories by
three different sessions. They stay looking like one network because they all
link the same stylesheet:

```html
<link rel="stylesheet" href="https://bbanetwork.org/brand/v1.css">
```

That is the whole integration — no build step, no package, and a colour fix
reaches every subdomain without any of them redeploying. Working templates for
both subdomains are in [`templates/`](templates), and
[`docs/BRAND.md`](docs/BRAND.md) documents the components.

Type is Space Grotesk over Inter, self-hosted as variable subsets (70KB for the
pair) and served with CORS so the subdomains can use them. The product artwork
is drawn in `src/motifs.ts` from the mark's own vocabulary — a bar, a line, a
square terminator — rather than assembled from an icon font.

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
