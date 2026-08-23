/**
 * A source-text check, deliberately kept in its own file.
 *
 * This bug has landed twice, both times identically: a backtick in a CSS
 * comment — around a property name or a value — terminates the `styles`
 * template literal early. `tsc --noEmit` did NOT catch it either time, because
 * what follows still happens to parse as TypeScript. The only symptoms were a
 * dev server that would not boot and a deploy that would not bundle.
 *
 * Nothing here imports src/styles.ts. That is the point: if the module fails to
 * parse, an importing test file dies during collection and vitest reports
 * "no tests" rather than anything useful. Reading the file as text means this
 * assertion still runs and still names the offending line.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('the CSS template literal in src/styles.ts', () => {
  it('contains no backtick or unexpected interpolation', async () => {
    const source = await readFile(new URL('../src/styles.ts', import.meta.url), 'utf8');

    const open = source.indexOf('return `');
    const close = source.lastIndexOf('`;');
    expect(open, 'could not find the styles template — has it been renamed?').toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);

    const body = source.slice(open + 'return `'.length, close);
    const offenders = body
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      // `${fontBase}` is the one interpolation the template is allowed.
      .filter(({ line }) => line.includes('`') || /\$\{(?!fontBase\})/.test(line));

    expect(
      offenders,
      offenders.length
        ? `A backtick or stray interpolation will truncate the stylesheet:\n${offenders
            .map((o) => `  line ~${o.n}: ${o.line}`)
            .join('\n')}`
        : '',
    ).toEqual([]);
  });
});
