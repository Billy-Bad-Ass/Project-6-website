/**
 * Reporting a scheduled run into Project 4's console.
 *
 * Project 4 owns the portfolio view. This repo does not keep its own run log,
 * its own dashboard, or its own idea of what the fleet is doing — it posts
 * what happened and stops. See docs/AGENTS.md for the contract.
 *
 * Everything here is optional. With `DASHBOARD_URL` unset there is no
 * dashboard to talk to, which is a perfectly good state for this Worker to be
 * in: the checks still run and still say what they found. What must never
 * happen is a reporting problem being mistaken for a healthy report, which is
 * the mistake this file exists to not repeat.
 */

export interface ReportEnv {
  DASHBOARD_URL?: string;
  DASHBOARD_TOKEN?: string;
  /**
   * An Access service token, for when the dashboard is behind Cloudflare
   * Access — which it is. Access answers before the request reaches Project
   * 4's API, so `DASHBOARD_TOKEN` alone gets a login page: that token is
   * checked by the application, and the request never arrives at the
   * application.
   */
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

export interface RunReport {
  agent: string;
  status: 'ok' | 'failed';
  summary: string;
}

/**
 * The outcome of trying to report, as a sentence for the log.
 *
 * Returned rather than thrown. A dashboard that will not take a log entry is
 * not a reason for a check that already ran to be recorded as a failure — but
 * it is absolutely a reason to say so out loud.
 */
export async function reportRun(env: ReportEnv, run: RunReport): Promise<string> {
  if (!env.DASHBOARD_URL) {
    return "not reported: DASHBOARD_URL is unset, so this run will not appear in Project 4's console";
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.DASHBOARD_TOKEN) headers.authorization = `Bearer ${env.DASHBOARD_TOKEN}`;
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
    headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
  }

  let response: Response;
  try {
    response = await fetch(`${env.DASHBOARD_URL}/api/agent-runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent: run.agent,
        project_slug: 'project-6',
        trigger: 'cron',
        status: run.status,
        summary: run.summary,
      }),
      // Manual, because a redirect here is a diagnosis rather than something
      // to follow. Following it would POST the payload at a login page and
      // then report whatever that returned.
      redirect: 'manual',
    });
  } catch (error) {
    return `not reported: ${env.DASHBOARD_URL} did not answer (${String(error)})`;
  }

  const code = response.status;

  // A 2xx and nothing else. `curl -f` was used for this in the workflow
  // version and does not fail on a 3xx, so Access's 302 to its login page was
  // logged as a successful post over a run that was never recorded. For an API
  // call a redirect is not success.
  if (code >= 200 && code < 300) return `reported (${code})`;

  if (code >= 300 && code < 400) {
    return (
      `not reported: ${code} redirect, which means Cloudflare Access is in front of the ` +
      `dashboard and this Worker has no service token. See docs/AGENTS.md.`
    );
  }

  if (code === 401 || code === 403) {
    return `not reported: ${code}, so DASHBOARD_TOKEN does not match the value set on the dashboard`;
  }

  return `not reported: the dashboard answered ${code}`;
}
