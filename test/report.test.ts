/**
 * Reporting a run into Project 4's console.
 *
 * Every case here is a way of not reporting, because that is where this has
 * gone wrong every single time. The Actions version of this code shipped three
 * separate bugs — a bare `|| true`, an unset URL indistinguishable from
 * success, and `curl -f` accepting Access's `302` as a completed write — and
 * all three had the same shape: a failure that reads as a pass.
 *
 * A dashboard refusing a log entry must never fail the check that already ran.
 * It must also never be mistaken for having worked.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportRun } from '../src/report';

const RUN = { agent: 'link-warden', status: 'ok' as const, summary: 'All checks passed.' };
const ENV = { DASHBOARD_URL: 'https://heartbeat.bbanetwork.org', DASHBOARD_TOKEN: 'secret' };

function answering(status: number) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status }));
}

/** The arguments of one call, or a clear failure rather than an undefined. */
function callArgs(fetcher: ReturnType<typeof answering>, index = 0): [string, RequestInit] {
  const call = fetcher.mock.calls[index];
  if (!call) throw new Error(`fetch was not called ${index + 1} time(s)`);
  return [call[0], call[1] ?? {}];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reportRun', () => {
  it('reports a 200 as reported', async () => {
    vi.stubGlobal('fetch', answering(200));
    expect(await reportRun(ENV, RUN)).toBe('reported (200)');
  });

  it('accepts any 2xx', async () => {
    vi.stubGlobal('fetch', answering(201));
    expect(await reportRun(ENV, RUN)).toBe('reported (201)');
  });

  /**
   * The one that shipped. Access answers an unauthenticated POST with a 302 to
   * its login page; `curl -f` does not fail on a 3xx, so the workflow logged
   * "Reported to" over a run that was never recorded.
   */
  it('does NOT treat a 302 as reported, and names Access as the reason', async () => {
    vi.stubGlobal('fetch', answering(302));
    const outcome = await reportRun(ENV, RUN);
    expect(outcome).toContain('not reported');
    expect(outcome).toContain('302');
    expect(outcome).toContain('Access');
  });

  it('does not follow the redirect it was given', async () => {
    const fetcher = answering(302);
    vi.stubGlobal('fetch', fetcher);
    await reportRun(ENV, RUN);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, init] = callArgs(fetcher);
    expect(init.redirect).toBe('manual');
  });

  it('names a 401 as a token mismatch rather than a generic failure', async () => {
    vi.stubGlobal('fetch', answering(401));
    const outcome = await reportRun(ENV, RUN);
    expect(outcome).toContain('DASHBOARD_TOKEN');
  });

  it('says so when the dashboard does not answer at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) => {
        throw new TypeError('fetch failed');
      }),
    );
    expect(await reportRun(ENV, RUN)).toContain('did not answer');
  });

  it('says so, and posts nothing, when DASHBOARD_URL is unset', async () => {
    const fetcher = answering(200);
    vi.stubGlobal('fetch', fetcher);

    const outcome = await reportRun({}, RUN);
    expect(outcome).toContain('DASHBOARD_URL is unset');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends the Access service token only when both halves are present', async () => {
    const fetcher = answering(200);
    vi.stubGlobal('fetch', fetcher);

    await reportRun({ ...ENV, CF_ACCESS_CLIENT_ID: 'id' }, RUN);
    let headers = callArgs(fetcher)[1].headers as Record<string, string>;
    expect(headers['CF-Access-Client-Id']).toBeUndefined();

    fetcher.mockClear();
    await reportRun({ ...ENV, CF_ACCESS_CLIENT_ID: 'id', CF_ACCESS_CLIENT_SECRET: 'sec' }, RUN);
    headers = callArgs(fetcher)[1].headers as Record<string, string>;
    expect(headers['CF-Access-Client-Id']).toBe('id');
    expect(headers['CF-Access-Client-Secret']).toBe('sec');
  });

  it('sends the bearer token and the run itself', async () => {
    const fetcher = answering(200);
    vi.stubGlobal('fetch', fetcher);
    await reportRun(ENV, { agent: 'redirect-guard', status: 'failed', summary: 'Something broke.' });

    const [url, init] = callArgs(fetcher);
    expect(url).toBe('https://heartbeat.bbanetwork.org/api/agent-runs');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      agent: 'redirect-guard',
      project_slug: 'project-6',
      trigger: 'cron',
      status: 'failed',
      summary: 'Something broke.',
    });
  });
});
