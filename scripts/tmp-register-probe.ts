/** Throwaway probe: what does every business host actually answer? */
import { linkWarden } from '../src/checks';

const result = await linkWarden(fetch);
for (const line of result.log) console.log(`  ${line}`);
for (const problem of result.problems) console.log(`  DRIFT: ${problem}`);
console.log(`link-warden: ${result.ok ? 'register and hosts agree' : 'drift'}`);
