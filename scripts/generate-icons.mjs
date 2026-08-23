import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'node_modules/@fortawesome/fontawesome-free/svgs';
const WANTED = [
  ['print', 'solid'], ['stethoscope', 'solid'], ['heart-pulse', 'solid'],
  ['arrow-right', 'solid'], ['envelope', 'solid'], ['circle-check', 'solid'],
  ['bolt', 'solid'], ['lock', 'solid'], ['github', 'brands'],
];

const entries = WANTED.map(([name, style]) => {
  const svg = readFileSync(`${BASE}/${style}/${name}.svg`, 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const d = svg.match(/ d="([^"]+)"/)[1];
  return { name, viewBox, d };
});

const body = entries
  .map((e) => `  '${e.name}': { viewBox: '${e.viewBox}', d: '${e.d}' },`)
  .join('\n');

writeFileSync(
  'src/icons.ts',
  `/**
 * The icon set, inlined.
 *
 * Font Awesome Free 6, extracted from the package at build-authoring time by
 * scripts/generate-icons.mjs rather than copied by hand — hand-copied path data
 * is unreviewable and silently wrong when it is wrong.
 *
 * Inlined rather than linked: the whole Font Awesome CSS is a megabyte and a
 * render-blocking request to another origin, to draw nine icons. These nine
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
${body}
};

/**
 * Renders an icon as inline SVG.
 *
 * \`aria-hidden\` because every icon on this site sits next to its own visible
 * label. An icon that repeats the text beside it is noise to a screen reader,
 * not an affordance.
 */
export function icon(name: string, className = 'icon'): string {
  const found = ICONS[name];
  if (!found) throw new Error(\`Unknown icon: \${name}. Add it to scripts/generate-icons.mjs.\`);
  return (
    \`<svg class="\${className}" viewBox="\${found.viewBox}" aria-hidden="true" \` +
    \`focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="\${found.d}"/></svg>\`
  );
}
`,
);
console.log(`Wrote src/icons.ts with ${entries.length} icons.`);
