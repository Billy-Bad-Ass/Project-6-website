/**
 * `POST /__run/<check>` — running a scheduled check on demand.
 *
 * The endpoint exists so a change to the reporting path can be verified today
 * rather than at 07:20 UTC tomorrow. Every case here is about the lock on it,
 * because the check itself is already covered by test/checks.ts and the
 * reporting by test/report.ts — what is new, and what could go wrong, is that
 * this Worker now has a path that does something when asked.
 *
 * The rule under all of it: an unauthorised caller learns nothing. Not that
 * the path exists, not that a token is required, not whether the token was
 * close. Same 404 page a typo gets.
 */

import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const ENV = {
  ASSETS: {} as Fetcher,
  DASHBOARD_URL: 'https://heartbeat.bbanetwork.org',
  DASHBOARD_TOKEN: 'the-real-token',
};

const CTX = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

function post(path: string, token?: string, method = 'POST'): Request {
  return new Request(`https://bbanetwork.org${path}`, {
    method,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });
}

async function call(request: Request, env: Partial<typeof ENV> = {}) {
  return worker.fetch(request, { ...ENV, ...env } as never, CTX);
}

describe('the lock on POST /__run/', () => {
  it('gives an unauthenticated caller the ordinary 404 page', async () => {
    const response = await call(post('/__run/link-warden'));
    expect(response.status).toBe(404);
    // Not a 401: a 401 confirms the path is real and that a token opens it.
    expect(await response.text()).toContain('<!doctype html>');
  });

  it('gives a wrong token the same 404, with nothing to tell it apart', async () => {
    const wrong = await call(post('/__run/link-warden', 'not-the-token'));
    const absent = await call(post('/__run/link-warden'));
    expect(wrong.status).toBe(absent.status);
    expect(await wrong.text()).toBe(await absent.text());
  });

  it('is shut when no DASHBOARD_TOKEN is configured, rather than open', async () => {
    // The failure that would matter most: an empty secret comparing equal to
    // an empty header and letting anybody run a check.
    const response = await call(post('/__run/link-warden', ''), { DASHBOARD_TOKEN: undefined });
    expect(response.status).toBe(404);
  });

  it('ignores GET even with the right token', async () => {
    // A GET is what a crawler, a prefetch or a pasted link produces.
    const response = await call(post('/__run/link-warden', 'the-real-token', 'GET'));
    expect(response.status).toBe(404);
  });
});

describe('once past the lock', () => {
  it('refuses a check name it does not have, by name', async () => {
    const response = await call(post('/__run/nonsense', 'the-real-token'));
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain('nonsense');
    expect(body).toContain('link-warden');
  });

  it('runs the check and answers with what the console said', async () => {
    // Every outbound call answers 200: the check's fetches and the report POST
    // alike. What is asserted is the shape of the reply, not the verdict.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    const response = await call(post('/__run/link-warden', 'the-real-token'));
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^link-warden: reported \(200\)/);
    vi.unstubAllGlobals();
  });

  it('refuses redirect-guard here, and says where it went', async () => {
    // It ran here until 2026-08-26, and running it here is precisely the bug:
    // it probes the hostname this Worker serves, so every probe came back 522
    // and the check reported `failed` every day. A 404 would read like a typo.
    const response = await call(post('/__run/redirect-guard', 'the-real-token'));
    expect(response.status).toBe(409);
    const body = await response.text();
    expect(body).toContain('522');
    expect(body).toContain('Redirect guard');
  });

  it('never runs a check just because the reply mentions one', async () => {
    // The refusal above names link-warden nowhere. A caller that asked for
    // redirect-guard must get no run at all, not a substitute.
    const fetcher = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await call(post('/__run/redirect-guard', 'the-real-token'));
    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
