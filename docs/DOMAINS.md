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
| `www.bbanetwork.org` | This hub | Project 6 | Attached to the same Worker rather than redirected. Safe because every page declares `<link rel="canonical">` on the apex regardless of the host it was served from — so the two hosts do not split search authority. |

### This is a change from Project 4's plan

`Project-4/docs/DOMAINS.md` puts **the store** at the apex, and argues it well:
the brand name at the apex is a trust signal, and a bare domain is what people
type. That argument is real, and moving the store off the apex is the one part
of this design with a genuine cost.

The trade was made deliberately: separating the businesses was the goal, and a
homepage that has to sell both an espresso guide and a website audit sells
neither. The cost is paid down by `src/redirects.ts`, which moves every store
URL — and its search authority — to `guides.` with a `301`.

Project 4 has since agreed the apex should become a brand hub with the
businesses on subdomains, with one dissent: it argues **no redirect layer is
needed**, because the store has no accumulated search authority yet, so a 301
protects nothing.

That is true of SEO today, and it is why the redirects are framed as insurance
rather than a rescue (see the comment at the top of `src/redirects.ts`). They
are kept because the window they cover opens on the *first sale*, not on this
deploy — a download link lives in an inbox for months — and because `HUB_OWNED`
in that same file is what stops the hub forwarding its own `/api/health` to the
store and leaving Project 4's watchdog monitoring the wrong service.

If the trade turns out to be wrong, it is reversible: point the apex at the
store's Worker and move this hub to `network.bbanetwork.org`. Nothing else in
this repo assumes otherwise.

### Project 1's site is not built here

Project 1 builds its own audit sales site (`audit/src/pipeline/build-web.ts`,
driven by a `STRIPE_PAYMENT_LINK`). `audit.bbanetwork.org` should point at
**that** Worker. This repo links to it and does not reimplement it.

## The apex has moved

`bbanetwork.org` is attached to `bba-network-hub` and serving this repo. The
deploy's smoke test proved it on 2026-08-24: `/api/health` identifies as
`bba-network-hub`, and every check now runs against the apex rather than the
`workers.dev` hostname.

The list below was written as a running order to do *before* the move. It was
not followed in that order — the domain was attached first. That is recorded
rather than tidied away, because it changes what each remaining item now means:
these are no longer preparations, they are open gaps on a live domain.

| Step | State |
| --- | --- |
| 1. Repoint the Stripe webhook | **Outstanding.** Test mode only — see below. |
| 2. Email Routing for `support@` | **Outstanding.** No mailbox behind the address. |
| 3. `guides.` points at the store | Done. |
| 4. Apex attached to this hub | **Done.** |
| 5. `www.` attached to this hub | Check the deploy log — the job reports it every run. |

### 1. Repoint the Stripe webhook

The store's webhook endpoint is on the apex. Now that the apex is this hub,
`POST /api/stripe/webhook` gets a `308` to `guides.bbanetwork.org` — and
**Stripe does not follow redirects.** It treats a `3xx` as a failed delivery.

A failed webhook means an order is paid for but never fulfilled: the customer is
charged and no download link is sent.

What stops that being an emergency today is that **no Stripe account is live**.
The only enabled endpoint pointing here belongs to the sandbox account, so what
breaks is test purchases — which is exactly the thing you would use to check the
store works before the first real sale. Fix it before you trust a test run, and
certainly before any account goes live.

> Stripe Dashboard → Developers → Webhooks → the endpoint on `bbanetwork.org`
> → **Update details** → set the URL to
> `https://guides.bbanetwork.org/api/stripe/webhook`

The `308` in `src/redirects.ts` is a safety net for *browser* traffic — download
links, checkout returns — not for Stripe. It does not remove this step.

*(Unrelated to this repo, found while checking: the main Stripe test account has
an enabled webhook pointing at a Worker that does not exist. Its deliveries have
been failing silently. Nobody owns it; it is noted here so it is written down
somewhere.)*

### 2. Set up Email Routing, so the support address actually receives

Project 2 sends buyers to `support@bbanetwork.org` — its `catalog/products.json`
and `catalog/generated.json` both read that correctly on `main`.

*(An earlier draft of this file claimed Project 2 still used `support@bba.network`,
a different domain. That was taken from Project 4's `docs/DOMAINS.md`, which had
not caught up with a fix already merged in Project 2. Verified against Project 2
directly: it is correct. Noted here because the wrong version of this claim was
acted on once already.)*

The address being right in code is only half of it. **Mail to it still goes
nowhere until Email Routing exists** — there is no mailbox at that domain by
default. On a storefront whose entire delivery mechanism is a signed download
link, the support address is the only channel a buyer has when something fails,
so this is worth doing before the first sale rather than after.

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

The hub uses the same address (`src/businesses.ts`), so once routing exists the
hub and the store agree.

### 3. Point `guides.` at the store, and check it works

`guides.bbanetwork.org` is attached to the store's Worker
(`bba-network-store`). This mattered before the apex moved and it still does:
every redirect in `src/redirects.ts` targets `guides.`, so if that host is ever
detached, the whole legacy path becomes a redirect to nowhere. The daily
redirect guard checks the destination, not just the status code, for this
reason.

### 4. Attach the apex to this hub

Done. The four taps are below, and they are the same four for any host — `www.`
included.

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

- **You do not need to set `SITE_URL`.** The deploy and both agent probes fall
  back to `https://bbanetwork.org`, which is now the right answer. The variable
  remains as an override for one case: pointing the checks somewhere else,
  such as a `workers.dev` hostname, while the apex is deliberately detached.

  This fallback used to be the Worker's own `workers.dev` URL, because the apex
  was serving Project 2's store and testing it would have failed every
  successful deploy. Testing the customer-facing host is the stricter check and
  the one worth having — an unattached apex is an outage, and the identity
  check is what distinguishes it from a broken deploy.

  For the same reason, neither daily agent has a `skipped` outcome any more. A
  stranger answering on this hostname used to mean "not yet"; it now means the
  domain has been detached or reassigned, and both agents report it as the
  failure it is.
- `www.bbanetwork.org` is reported by every deploy, as a notice rather than a
  failure. A missing `www` costs the visitors who type it and nobody else,
  which is not worth failing a good deploy over — but it is worth saying out
  loud, because otherwise the way you find out is a customer telling you.
- Run the redirect guard by hand once — Actions → **Agent · Redirect guard** →
  Run workflow — and confirm it passes against the live apex before you walk
  away.
