/**
 * The subdomain templates are the deliverable for Projects 1 and 2.
 *
 * They are plain HTML files that nothing in this repo imports, so nothing else
 * would notice them rotting. These assert the two properties that make them
 * worth handing over: the markup is well-formed, and they carry no local CSS —
 * because the moment one of them styles something itself, the network stops
 * being one design system and starts being three.
 */

import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';

const DIR = new URL('../templates/', import.meta.url);

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

/** Reports the first mismatched or unclosed tag, with a line number. */
function findNestingError(html: string): string | null {
  const stack: Array<{ tag: string; line: number }> = [];
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const [, closing, rawTag, selfClosing] = match;
    const tag = rawTag!.toLowerCase();
    if (VOID.has(tag) || selfClosing === '/') continue;

    const line = html.slice(0, match.index).split('\n').length;

    if (closing === '/') {
      const top = stack.pop();
      if (!top) return `line ${line}: </${tag}> with nothing open`;
      if (top.tag !== tag) {
        return `line ${line}: </${tag}> closes <${top.tag}> opened at line ${top.line}`;
      }
    } else {
      stack.push({ tag, line });
    }
  }

  const unclosed = stack[0];
  return unclosed ? `<${unclosed.tag}> at line ${unclosed.line} is never closed` : null;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.html'));

describe('the subdomain templates', () => {
  it('exist', () => {
    expect(files).toContain('guides.html');
    expect(files).toContain('audit.html');
  });

  for (const file of files) {
    describe(file, () => {
      it('is well-formed', async () => {
        const html = await readFile(new URL(file, DIR), 'utf8');
        expect(findNestingError(html)).toBeNull();
      });

      it('links the shared stylesheet rather than carrying its own', async () => {
        const html = await readFile(new URL(file, DIR), 'utf8');
        expect(html).toContain('https://bbanetwork.org/brand/v1.css');
        // A <style> block here is the failure mode this whole arrangement
        // exists to prevent. Inline style="" on a one-off spacing tweak is
        // tolerable; a stylesheet is not.
        expect(html, 'template must not define its own <style> block').not.toMatch(/<style[\s>]/);
      });

      it('preloads both faces, so the headline does not flash in a system font', async () => {
        const html = await readFile(new URL(file, DIR), 'utf8');
        expect(html).toContain('space-grotesk-latin-wght-normal.woff2');
        expect(html).toContain('inter-latin-wght-normal.woff2');
      });

      it('carries no third-party attribution', async () => {
        // Icons are drawn in src/motifs.ts now, so nothing here is borrowed.
        // A template that reintroduces a credit line has almost certainly
        // reintroduced someone else's artwork with it.
        const html = await readFile(new URL(file, DIR), 'utf8');
        expect(html).not.toContain('Font Awesome');
        expect(html).not.toContain('CC BY');
      });

      it('uses the real support address', async () => {
        const html = await readFile(new URL(file, DIR), 'utf8');
        // bba.network (no hyphen-free second word) is a different domain that
        // nobody owns. It has already shipped in this portfolio once.
        expect(html).not.toContain('bba.network');
        expect(html).toContain('support@bbanetwork.org');
      });
    });
  }
});
