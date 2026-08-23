# Working in this repository

The apex site for `bbanetwork.org`. Small on purpose. Read `README.md` first,
then `docs/DOMAINS.md` if you are touching anything to do with hosts.

## Rules that are not style preferences

1. **`src/redirects.ts` protects paying customers.** The store used to be this
   hostname; download links in already-sent receipts point here. Never remove or
   relax a rule in that file without stating which customer-facing URL it
   breaks. Never change a `308` to a `301` — a `301` permits a client to rewrite
   a `POST` into a `GET`, which silently neuters the checkout and webhook paths.

2. **`status: 'live'` in `src/businesses.ts` is a promise.** It means a customer
   can reach that host and pay today. Confirm with `curl` before setting it.
   Never flip `live` back to `building` to make a failing check pass — that
   hides an outage rather than reporting one.

3. **No client-side JavaScript.** The CSP says `script-src 'none'` and that is
   enforceable only while it stays true. Adding a script means changing the
   security policy, deliberately, in `src/index.ts`.

4. **No Worker cron here.** Project 4 owns portfolio orchestration. This repo
   reports to its `/api/agent-runs` and schedules nothing beyond its own two
   checks. See `docs/AGENTS.md`.

5. **Never touch Stripe from this repo.** The hub is a signpost. Money is taken
   on the businesses' own subdomains.

6. **`src/icons.ts` is generated.** Run `npm run icons`; do not hand-edit. CI
   regenerates and diffs it, because hand-copied SVG path data is unreviewable
   and breaks the Font Awesome attribution in `NOTICE.md`.

## Before you push

```bash
npm run check     # typecheck + tests
```

Tests are not optional here: the redirect suite is the only thing standing
between a refactor and a customer who cannot download what they paid for.

## Conventions

- Brand colours come from the kit's own SVGs and are declared once, in
  `src/styles.ts`. Components reference role tokens (`--accent`, `--text`),
  never the raw brand values.
- Every token is defined in both themes. A colour defined only in the dark block
  renders as invalid in light mode and is silently dropped.
- Comments explain *why*, especially where the reason is non-obvious or the
  obvious alternative is wrong. The codebase is small; the reasoning is the part
  worth keeping.
