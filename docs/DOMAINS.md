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
| `www.bbanetwork.org` | Nothing yet | — | No DNS record exists. Either attachment works: a Worker custom domain on `bba-network-hub`, or a proxied `CNAME` to the apex plus a redirect rule. Serving it from the hub directly is safe because every page declares `<link rel="canonical">` on the apex regardless of the host it was served from, so the two hosts do not split search authority. |

### This is a change from Project 4's plan

`dashboard-4/docs/DOMAINS.md` puts **the store** at the apex, and argues it well:
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
| 1. Repoint the Stripe webhook | Done, 2026-08-24. Sandbox account, test mode. |
| 2. Email Routing for `support@` | Enabled on the zone. Routes still to be confirmed — see below. |
| 3. `guides.` points at the store | Done. Probed reachable 2026-08-24 12:04. |
| 4. Apex attached to this hub | **Done.** |
| 5. `www.` attached to this hub | **No. There is no DNS record for it.** |
| 6. `heartbeat.` attached, behind Access | Done. Probed `302` 2026-08-24 12:11. |

### What the zone actually contains

Read off the dashboard on 2026-08-24. Eight records, and the absences are the
interesting part:

| Name | Type | Points at |
| --- | --- | --- |
| `bbanetwork.org` | MX ×3, TXT ×2 | Cloudflare Email Routing, SPF, DKIM |
| `bbanetwork.org` | Worker | `bba-network-hub` |
| `go.bbanetwork.org` | Worker | `bba-growth-os` |
| `ops.bbanetwork.org` | Worker | `bba-growth-os` |

That table shows no `www`, `guides`, `audit` or `heartbeat` row — but do not
read absence there as absence in reality. `guides.bbanetwork.org` was probed
reachable at 12:04 the same day, so a Worker custom domain can serve without
appearing where you expect it to. Treat the records table as one input and a
probe as the answer.

`audit.` is genuinely absent, and genuinely fine: it is `building` in the
register, and the hub renders a `building` business as a disabled card rather
than a link, which is exactly what that status is for.

`go.` and `ops.` belong to `bba-growth-os`, which is not built here. Noted so
nobody assumes an unfamiliar record is stale and deletes it. Worth knowing that
this hub also uses a `/go/` *path* for outbound click counting — same word,
different host, no collision, but do not let the two be confused.

### `guides.` works — and a note on how this file got that wrong

`src/redirects.ts` sends every legacy store URL to `guides.bbanetwork.org`, and
that host answers. The redirect guard probed the whole path on 2026-08-24 at
12:04 and reported `https://guides.bbanetwork.org  reachable`, with all four
legacy paths returning the right status to the right destination.

An earlier version of this section stated the opposite, in detail and with
confidence: that the hostname resolved to nothing and every receipt link ended
in "could not resolve host". That was never measured. It was inferred from a
screenshot of the DNS records table which showed no `guides` row, and written
up as established fact — including into a code comment on the guard itself.

The lesson is worth more than the correction. **The DNS table and the Worker's
own Custom Domains list can disagree, and neither is the thing that matters.**
What matters is whether the host answers, which is a probe, not a reading. That
is now exactly what the guard does, so the question does not have to be settled
by looking at a dashboard again.

The destination check that settled it is still worth having: it was added
because the guard genuinely could not tell a live store from a dead one, and
that gap was real even though the failure it was written for was not.

### `heartbeat.` — resolved, and how

`src/businesses.ts` records `heartbeat` as `status: 'live'`, which by the rule
at the top of that file is a promise that the host is reachable. For a while it
was not: the link warden's first scheduled run reported
`heartbeat=heartbeat.bbanetwork.org:000000` at 09:32 on 2026-08-24, `000` being
no connection at all.

The register was deliberately **not** edited to match. Rule 2 in `CLAUDE.md`
says never flip `live` back to `building` to make a failing check pass, because
that hides an outage instead of reporting one. The register was right about what
was supposed to exist; the infrastructure was what disagreed. It was fixed by
attaching the host, and the warden read `302` at 12:11.

`302`, not `200`, and that is the healthy answer: the Worker is protected by
Cloudflare Access, so an unauthenticated probe gets redirected to a login page.
The warden accepts `2*` or `3*` for exactly this reason — a locked door is a
door that answers.

**The Access policy is scoped to the Worker, not to a hostname.** That
distinction cost an afternoon and is worth keeping: an application whose
destination is `bba-heartbeat.bbacentralworkspace.workers.dev` protects that
name and nothing else, so attaching a custom domain would have opened an
unprotected second door onto the same revenue figures. Worker scope covers
every hostname routed to it, including ones added later.

### 1. Repoint the Stripe webhook — done

The store's webhook endpoint was on the apex. Once the apex became this hub,
`POST /api/stripe/webhook` got a `308` to `guides.bbanetwork.org` — and
**Stripe does not follow redirects.** It treats a `3xx` as a failed delivery,
which means an order paid for and never fulfilled: the customer is charged and
no download link is sent.

The endpoint on the sandbox account (`we_1U7bbBJ…`, "BBA Network store —
digital download delivery") now points at
`https://guides.bbanetwork.org/api/stripe/webhook`. Its **id is unchanged, so
its signing secret is unchanged** — Project 2's `STRIPE_WEBHOOK_SECRET` did not
need rotating. Changing the URL of an endpoint is not the same as replacing it,
and replacing it would have silently broken signature verification.

This was done from a session working in this repo, which is a deliberate
exception to rule 5 in `CLAUDE.md` ("never touch Stripe from this repo"),
made on an explicit instruction. The rule stands: the hub is a signpost, and
nothing in `src/` talks to Stripe. What was edited was one URL field in the
Stripe dashboard's data, not code in this repository.

> For reference, by hand: Stripe Dashboard → Developers → Webhooks → the
> endpoint → **Update details** → set the URL.

No account is live, so what this protects today is *test* purchases — which is
exactly what you would use to check the store works before the first real sale.

The `308` in `src/redirects.ts` stays. It is a safety net for *browser* traffic
— download links, checkout returns — and it was never a substitute for this.

*(Unrelated to this repo, found while checking: the main account's test mode has
an enabled webhook, "Northline storefront", pointing at
`northline-storefront.bbacentralworkspace.workers.dev` — a Worker that does not
exist. Its deliveries have been failing silently since before any of this.
Nobody owns it and it was left alone; it is written down here so it is written
down somewhere.)*

### 2. Set up Email Routing, so the support address actually receives

Project 2 sends buyers to `support@bbanetwork.org` — its `catalog/products.json`
and `catalog/generated.json` both read that correctly on `main`.

*(An earlier draft of this file claimed Project 2 still used `support@bba.network`,
a different domain. That was taken from Project 4's `docs/DOMAINS.md`, which had
not caught up with a fix already merged in Project 2. Verified against Project 2
directly: it is correct. Noted here because the wrong version of this claim was
acted on once already.)*

**Email Routing is switched on.** The zone carries Cloudflare's three
`route*.mx.cloudflare.net` MX records, an SPF `TXT`, and a `cf2024-1._domainkey`
DKIM record — which only appear once routing is enabled.

*(This file previously said there was no mailbox behind the address. That was
written before the DNS was read and it was wrong. What could not be seen from
DNS, and still has to be confirmed in the dashboard, is the part below: MX
records mean mail for the domain reaches Cloudflare, not that any particular
address forwards anywhere.)*

What remains is per-address: a route only delivers if it exists **and** its
destination has been verified from that inbox. An unverified destination
silently drops mail. On a storefront whose entire delivery mechanism is a signed
download link, the support address is the only channel a buyer has when
something fails, so confirm both rows below rather than assuming.

> Cloudflare → `bbanetwork.org` → **Email** → **Email Routing** → Routes.
> Check a destination address is listed as verified, then that these exist:

| Address | Forwards to | For |
| --- | --- | --- |
| `support@bbanetwork.org` | your inbox | Buyers with download problems |
| `hello@bbanetwork.org` | your inbox | Everything else |

Cloudflare adds the MX and SPF records itself — that part is visibly done. It
only *receives*: sending as `support@bbanetwork.org` needs a mail provider, and
Gmail's "send as" over SMTP is the cheap way to do that later.

The hub uses the same address (`src/businesses.ts`), so the hub and the store
agree on where a buyer should write.

### 3. Point `guides.` at the store — done

`guides.bbanetwork.org` is attached to `bba-network-store` and answering.

It stays on this list because it is a standing dependency rather than a
finished task: every rule in `src/redirects.ts` targets that host, so if it is
ever detached the whole legacy path becomes a redirect into nothing. The daily
guard probes the destination for exactly that reason.

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
- `www.bbanetwork.org` is reported by every deploy, as a warning rather than a
  failure. A missing `www` costs the visitors who type it and nobody else,
  which is not worth failing a good deploy over — but it is worth saying out
  loud, because otherwise the way you find out is a customer telling you.

  There are two ways to give it a record, and the deploy's probe follows
  redirects, so it reports success for either:

  1. **A Worker custom domain** on `bba-network-hub`, the same four taps as any
     other host. `www` then serves the hub directly.
  2. **A proxied `CNAME`** `www` → `bbanetwork.org`, plus a redirect rule.
     Cloudflare's own DNS recommendations panel offers this, and it is the
     tidier of the two: one host serves, the other forwards, and there is no
     second copy of the site to reason about.

  The first attempt at option 1 left no record behind, which is worth knowing
  before repeating it — check the DNS table afterwards rather than trusting the
  dialog.
- Run the redirect guard by hand once — Actions → **Agent · Redirect guard** →
  Run workflow — and confirm it passes against the live apex before you walk
  away.
