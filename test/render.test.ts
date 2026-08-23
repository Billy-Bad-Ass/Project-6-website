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

  it('carries the Font Awesome attribution its licence requires', () => {
    expect(html).toContain('Font Awesome');
    expect(html).toContain('CC BY 4.0');
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
