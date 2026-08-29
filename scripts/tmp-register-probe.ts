/** Throwaway. See .github/workflows/tmp-register-probe.yml. */
import { linkWarden } from '../src/checks';

const result = await linkWarden(fetch);
for (const line of result.log) console.log(`  ${line}`);
for (const problem of result.problems) console.log(`  PROBLEM: ${problem}`);
console.log(`link-warden: ${result.ok ? 'ok' : 'drift'}`);
