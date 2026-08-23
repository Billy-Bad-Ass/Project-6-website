/**
 * The icon set, inlined.
 *
 * Font Awesome Free 6, extracted from the package by scripts/generate-icons.mjs
 * rather than copied by hand — hand-copied path data is unreviewable and
 * silently wrong when it is wrong.
 *
 * Inlined rather than linked: the whole Font Awesome CSS is a megabyte and a
 * render-blocking request to another origin, to draw four icons. These four
 * ship in the HTML and cost nothing extra.
 *
 * Icons are CC BY 4.0. Attribution is in NOTICE.md and in the page footer —
 * that licence requires it, and removing it is not a style decision.
 *
 * Regenerate:  npm run icons
 */

export interface Icon {
  viewBox: string;
  d: string;
}

export const ICONS: Record<string, Icon> = {
  'arrow-right': { viewBox: '0 0 448 512', d: 'M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z' },
  'envelope': { viewBox: '0 0 512 512', d: 'M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z' },
  'bolt': { viewBox: '0 0 448 512', d: 'M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288l111.5 0L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7l-111.5 0L349.4 44.6z' },
  'lock': { viewBox: '0 0 448 512', d: 'M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z' },
};

/**
 * Renders an icon as inline SVG.
 *
 * `aria-hidden` because every icon on this site sits next to its own visible
 * label. An icon that repeats the text beside it is noise to a screen reader,
 * not an affordance.
 */
export function icon(name: string, className = 'icon'): string {
  const found = ICONS[name];
  if (!found) throw new Error(`Unknown icon: ${name}. Add it to scripts/generate-icons.mjs.`);
  return (
    `<svg class="${className}" viewBox="${found.viewBox}" aria-hidden="true" ` +
    `focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="${found.d}"/></svg>`
  );
}
