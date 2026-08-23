/**
 * Render smoke tests.
 *
 * These exist because of a specific near-miss: a backtick inside a CSS comment
 * terminated the STYLES template literal early. TypeScript was happy, the tests
 * were happy, and the only symptom was the dev server refusing to boot. Calling
 * the render functions in a test turns that class of bug — anything that makes
 * a page fail to build — into a red test rather than a broken deploy.
 *
 * They assert the promises the hub makes, not the markup it happens to emit.
 */

import { describe, it, expect } from 'vitest';
import { renderHome, renderAbout, renderNotFound, renderSitemap, esc } from '../src/render';
import { PUBLIC_BUSINESSES, BUSINESSES } from '../src/businesses';
import { STYLES } from '../src/styles';

describe('the stylesheet', () => {
  it('is whole — not truncated by a stray backtick in a comment', () => {
    expect(STYLES.length).toBeGreaterThan(3000);
    // The last rule in the file. If the template terminated early, this is gone.
    expect(STYLES).toContain('.notice');
    expect(STYLES).toContain(':root');
  });

  it('defines every status colour in both themes', () => {
    // A token defined only in the dark block renders as an invalid colour in
    // light mode, which browsers silently drop.
    for (const token of ['--status-live', '--status-building']) {
      const occurrences = STYLES.split(token).length - 1;
      expect(occurrences, `${token} should be defined twice and used`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the home page', () => {
  const html = renderHome();

  it('renders', () => {
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('</html>');
  });

  it('names every public business', () => {
    for (const business of PUBLIC_BUSINESSES) {
      expect(html).toContain(business.name);
      expect(html).toContain(business.host);
    }
  });

  it('does not link a business that is not reachable yet', () => {
    // The rule the whole card component exists to enforce: no button pointing
    // at a host that does not resolve.
    for (const business of PUBLIC_BUSINESSES) {
      if (business.status !== 'live') {
        expect(html).not.toContain(`href="/go/${business.id}"`);
      }
    }
  });

  it('keeps the internal dashboard off the public page', () => {
    const heartbeat = BUSINESSES.find((b) => b.id === 'heartbeat')!;
    expect(heartbeat.unlisted).toBe(true);
    expect(html).not.toContain(heartbeat.host);
  });

  it('carries no third-party attribution, because every mark is drawn here', () => {
    // The icons were Font Awesome under CC BY 4.0, which obliges a visible
    // credit on every page. They are original now, so the credit is gone — and
    // this asserts the two cannot come back separately. Re-introducing a
    // borrowed glyph without its attribution is the failure to catch.
    expect(html).not.toContain('Font Awesome');
    expect(html).not.toContain('fontawesome');
    expect(html).not.toContain('CC BY');
  });

  it('ships no JavaScript, which is what lets the CSP forbid it', () => {
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\son(click|load|error)=/);
  });
});

describe('the other pages', () => {
  it('render without throwing', () => {
    expect(renderAbout()).toContain('</html>');
    expect(renderNotFound()).toContain('</html>');
  });

  it('produce a sitemap with a valid namespace', () => {
    const xml = renderSitemap();
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('<loc>https://bbanetwork.org/</loc>');
  });
});

describe('escaping', () => {
  it('neutralises markup', () => {
    expect(esc('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes the ampersand first, so entities are not double-broken', () => {
    expect(esc('Sound & Mod')).toBe('Sound &amp; Mod');
    expect(esc('a<b&c')).toBe('a&lt;b&amp;c');
  });
});

describe('the animated mark', () => {
  const html = renderHome();

  it('animates in the hero and stays still in the masthead', () => {
    // A logo looping in a sticky header sits in peripheral vision on every
    // page. The hero is where the mark is the subject, so that is where it
    // moves.
    expect(html).toContain('class="mark hero-mark mark-animated"');
    expect(html).toContain('class="mark"');
    const mastheadMark = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    expect(mastheadMark).toContain('<svg class="mark"');
    expect(mastheadMark).not.toContain('mark-animated');
  });

  it("carries the kit's own per-bar delays, as cycle fractions", () => {
    // From bba-logo-animated-*.svg. Both its variants use identical fractions
    // (ambient/10s and active/3.6s), which is why --cycle alone switches speed.
    for (const d of ['--d:0', '--d:-0.09', '--d:-0.27', '--d:-0.45', '--d:-0.72']) {
      expect(html).toContain(d);
    }
  });

  it('draws the travelling beam with the dash geometry from the kit', () => {
    expect(html).toContain('pathLength="100"');
    expect(html).toContain('stroke-dasharray="14 86"');
  });

  it('defines all three of the kit\'s loops', () => {
    for (const name of ['mark-pulse', 'mark-beam', 'mark-node']) {
      expect(STYLES, `@keyframes ${name} should exist`).toContain(`@keyframes ${name}`);
    }
  });

  it('stops every loop under prefers-reduced-motion', () => {
    // An infinitely looping logo is exactly what that setting is for.
    const block = STYLES.slice(STYLES.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('.mark-animated .bar');
    expect(block).toContain('.mark-animated .mark-beam');
    expect(block).toContain('.mark-animated .mark-node');
    expect(block).toContain('animation: none');
  });

  it('takes the bar colour from a token defined in both themes', () => {
    // The kit ships a light and a dark file differing only in this colour.
    // Inlining with a token means one mark instead of two, but only if the
    // token exists in both blocks — one defined solely in dark renders as an
    // invalid colour in light and is silently dropped.
    expect(STYLES.split('--mark-bar:').length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('rendered markup is well-formed', () => {
  // Nesting broke once already: `.prose` sets a max-width, and putting it on
  // the same element as `.wrap` overrode the wrap's width so the whole column
  // re-centred and stopped lining up with the masthead. Fixing it meant adding
  // a nested div to three pages by hand, which is exactly the edit that leaves
  // a tag unclosed.
  const VOID = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'source', 'track', 'wbr',
  ]);

  function findNestingError(html: string): string | null {
    const stack: Array<{ tag: string; line: number }> = [];
    const pattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(html)) !== null) {
      const [, closing, rawTag, selfClosing] = m;
      const tag = rawTag!.toLowerCase();
      if (VOID.has(tag) || selfClosing === '/') continue;
      const line = html.slice(0, m.index).split('\n').length;

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

  it.each([
    ['home', renderHome],
    ['about', renderAbout],
    ['404', renderNotFound],
  ])('%s', (_name, render) => {
    expect(findNestingError(render())).toBeNull();
  });

  it('keeps the reading column inside .wrap rather than narrowing it', () => {
    // `class="wrap prose"` is the regression: it re-centres the column.
    for (const render of [renderAbout, renderNotFound]) {
      expect(render()).not.toContain('class="wrap prose"');
    }
  });
});

