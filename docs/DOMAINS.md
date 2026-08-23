# Domains

`bbanetwork.org` is registered with Cloudflare, on the same account as the
Workers plan. This is how the businesses are split across it, what has to happen
in the dashboard, and — read this part — what will break if the order is wrong.

## The plan

| Host | Points at | Repo | Why |
| --- | --- | --- | --- |
| `bbanetwork.org` | This hub | Project 6 | The brand. Names the businesses and sends people to the right one. |
| `guides.bbanetwork.org` | The store | Project 2 | Printable reference guides. Its own checkout, its own support address. |
| `audit.bbanetwork.org` | Website Health Check | Project 1 | The audit service. Project 1 already builds this sales site — see below. |
| `heartbeat.bbanetwork.org` | Heartbeat | Project 4 | Internal, behind Cloudflare Access. Reserved; this repo does not touch it. |
| `www.bbanetwork.org` | redirect to apex | — | Cloudflare bulk redirect, free. Pick one canonical host or split your search authority in half. |

### This is a change from Project 4's plan

`Project-4/docs/DOMAINS.md` puts **the store** at the apex, and argues it well:
the brand name at the apex is a trust signal, and a bare domain is what people
type. That argument is real, and moving the store off the apex is the one part
of this design with a genuine cost.

The trade was made deliberately: separating the businesses was the goal, and a
homepage that has to sell both an espresso guide and a website audit sells
neither. The cost is paid down by `src/redirects.ts`, which moves every store
URL — and its search authority — to `guides.` with a `301`.

If that trade turns out to be wrong, it is reversible: point the apex at the
store's Worker and move this hub to `network.bbanetwork.org`. Nothing else in
this repo assumes otherwise.

### Project 1's site is not built here

Project 1 builds its own audit sales site (`audit/src/pipeline/build-web.ts`,
driven by a `STRIPE_PAYMENT_LINK`). `audit.bbanetwork.org` should point at
**that** Worker. This repo links to it and does not reimplement it.

## Before you move the apex

Do these in order. Skipping the first two costs money.

### 1. Repoint the Stripe webhook — do this FIRST

The store's webhook endpoint is currently on the apex. Once the apex is this
hub, `POST /api/stripe/webhook` gets a `308` to `guides.bbanetwork.org` — and
**Stripe does not follow redirects.** It treats a `3xx` as a failed delivery.

A failed webhook means an order is paid for but never fulfilled: the customer is
charged and no download link is sent.

> Stripe Dashboard → Developers → Webhooks → the endpoint on `bbanetwork.org`
> → **Update details** → set the URL to
> `https://guides.bbanetwork.org/api/stripe/webhook`

The `308` in `src/redirects.ts` is a safety net for *browser* traffic — download
links, checkout returns — not for Stripe. It does not remove this step.

### 2. Set up Email Routing, and fix the dead support address

Project 2's `catalog/products.json` sets:

```json
"supportEmail": "support@bba.network"
```

That is **`bba.network`** — a different domain from `bbanetwork.org`. Unless you
own it, every support email from a paying customer goes nowhere, silently. On a
storefront whose entire delivery mechanism is a signed download link, the support
address is the only channel a buyer has when something fails.

Cloudflare Email Routing is free and forwards to an inbox you already have.

> Cloudflare → `bbanetwork.org` → **Email** → **Email Routing** → Get started.
> Add a destination address, verify it from that inbox, then create routes:

| Address | Forwards to | For |
| --- | --- | --- |
| `support@bbanetwork.org` | your inbox | Buyers with download problems |
| `hello@bbanetwork.org` | your inbox | Everything else |

Cloudflare adds the MX and SPF records itself. It only *receives* — sending as
`support@bbanetwork.org` needs a mail provider, and Gmail's "send as" over SMTP
is the cheap way to do that later.

Then fix the address in Project 2. This repo already uses
`support@bbanetwork.org` (`src/businesses.ts`), so the hub and the store will
disagree until Project 2 is updated.

### 3. Point `guides.` at the store, and check it works

Attach `guides.bbanetwork.org` to the store's Worker (`bba-network-store`) using
the four taps below, and buy something with a test card before moving the apex.
The redirects all target `guides.` — if that host is not live, moving the apex
turns every store URL into a redirect to nowhere.

### 4. Only then, attach the apex to this hub

## Attaching a domain to a Worker

Four taps, in the browser. No token permissions and no config change — which
matters, because a `routes` entry in `wrangler.jsonc` makes the deploy itself
responsible for creating DNS records, and the deploy token does not have that
permission. Doing it in the dashboard keeps the deploy from breaking. This is
why there is deliberately no `routes` block in this repo's `wrangler.jsonc`.

1. Cloudflare → **Workers & Pages** → **bba-network-hub**
2. **Settings** → **Domains & Routes** → **Add** → **Custom domain**
3. Enter `bbanetwork.org`
4. **Add domain**

Cloudflare creates the DNS record and issues the certificate. It works within a
minute or two; the certificate can take longer to go fully green.

The `workers.dev` URL keeps working afterwards. Leave it on until the custom
domain is verified — if the DNS step goes wrong, it is the only way back in.
Once the apex is confirmed working, set `workers_dev: false` in
`wrangler.jsonc` and redeploy, so there is one address to protect rather than
two.

## After pointing anything

- Set the `SITE_URL` repository **variable** to `https://bbanetwork.org`. The
  deploy smoke test and both agent probes fall back to that host by default, but
  setting it explicitly means a preview deploy checks itself rather than
  production.
- Run the redirect guard by hand once — Actions → **Agent · Redirect guard** →
  Run workflow — and confirm it passes against the live apex before you walk
  away.
