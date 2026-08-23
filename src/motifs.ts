/**
 * The visual language, drawn rather than borrowed.
 *
 * The mark is a waveform: horizontal bars radiating from a blue centre line and
 * terminating in a square. Everything here is built from those three elements —
 * the bar, the line, the terminator — so the artwork on a product card and the
 * logo in the masthead are recognisably the same system rather than a logo
 * sitting next to unrelated stock icons.
 *
 * Icon fonts can only ever give you someone else's silhouettes. These are
 * specific to what this network sells: a printed reference card, and a website
 * being examined. Font Awesome still covers the genuinely generic affordances
 * (an arrow, an envelope) where inventing a bespoke glyph would just be worse.
 *
 * Everything uses `currentColor` for structure so the artwork inverts correctly
 * between themes, and the brand blue only where the accent is meant to read as
 * the accent.
 */

const BLUE = '#2B5CE6';

/**
 * The hero backdrop.
 *
 * The mark's silhouette blown up to full width and pushed almost to the
 * threshold of visibility — a texture you notice second, after the headline.
 * The blue line bleeds off both edges deliberately: the mark is a signal
 * passing through, and stopping it at the viewport would make it a diagram.
 *
 * Purely decorative, so it is `aria-hidden` and carries no title.
 */
export function signalField(): string {
  // The viewBox is deliberately near the aspect ratio of the hero it sits
  // behind. An earlier version used a 100x100 box scaled to cover a wide, tall
  // hero: `slice` then magnified everything about fifteen times, and the
  // texture rendered as thick grey bands across the headline. At this
  // resolution a 2-unit stroke stays a hairline at any viewport width.
  const W = 1200;
  const H = 600;
  const rows = 43;
  const bars: string[] = [];

  for (let i = 0; i < rows; i++) {
    const t = (i - (rows - 1) / 2) / ((rows - 1) / 2); // -1 … 1
    const y = H / 2 + t * (H / 2 - 34);
    // Cosine falloff: wide at the centre line, tapering away from it. This is
    // what gives the mark its lens silhouette.
    const half = Math.cos((t * Math.PI) / 2) ** 0.8 * (W / 2 - 70);
    if (half < 12) continue;

    // Fade with distance too, so the shape dissolves rather than ending.
    const opacity = (0.1 + (1 - Math.abs(t)) * 0.26).toFixed(3);
    bars.push(
      `<line x1="${(W / 2 - half).toFixed(1)}" y1="${y.toFixed(1)}" ` +
        `x2="${(W / 2 + half).toFixed(1)}" y2="${y.toFixed(1)}" opacity="${opacity}"/>`,
    );
  }

  return `<svg class="signal-field" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sf-fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0"/>
      <stop offset=".3" stop-color="${BLUE}" stop-opacity=".8"/>
      <stop offset=".7" stop-color="${BLUE}" stop-opacity=".8"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="sf-glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${BLUE}" stop-opacity=".20"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sf-glow)"/>
  <g stroke="currentColor" stroke-width="2" stroke-linecap="round">${bars.join('')}</g>
  <line class="sf-signal" x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="url(#sf-fade)" stroke-width="2.4"/>
</svg>`;
}

/**
 * A hairline that is a signal rather than a border.
 *
 * Used between sections. A flat 1px rule is the default everywhere on the web;
 * this one carries the brand's blue through its middle and fades at both ends,
 * which is the same gesture as the mark at a hundredth of the scale.
 */
export function rule(): string {
  return `<svg class="rule" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rule-fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${BLUE}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <line x1="0" y1=".5" x2="100" y2=".5" stroke="url(#rule-fade)" stroke-width="1"/>
</svg>`;
}

/** Content bars standing in for text inside an illustration. */
function textLines(
  x: number,
  y: number,
  widths: number[],
  gap: number,
  opacity = 0.34,
): string {
  return widths
    .map(
      (w, i) =>
        `<rect x="${x}" y="${y + i * gap}" width="${w}" height="3" rx="1.5" opacity="${opacity}"/>`,
    )
    .join('');
}

/**
 * The guides business: printed reference cards.
 *
 * Three sheets, fanned. The point the product makes is that the answer is one
 * page you can hold, so the artwork shows paper — and the front sheet carries a
 * blue line where the fix is, which is the same blue line as the mark.
 */
export function guidesArt(): string {
  return `<svg class="card-art" viewBox="0 0 300 150" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(150 75)">
    <g transform="rotate(-9) translate(-56 -52)" opacity=".28">
      <rect width="112" height="104" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
    </g>
    <g transform="rotate(-4.5) translate(-56 -52)" opacity=".5">
      <rect width="112" height="104" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
    </g>
    <g transform="translate(-56 -52)">
      <rect width="112" height="104" rx="7" fill="none" stroke="currentColor" stroke-width="1.9" opacity=".9"/>
      ${textLines(16, 20, [46, 62], 9, 0.45)}
      <rect x="16" y="46" width="80" height="3.4" rx="1.7" fill="${BLUE}"/>
      ${textLines(16, 60, [70, 58, 66], 9, 0.3)}
      <rect x="16" y="88" width="9" height="9" rx="2" fill="${BLUE}" opacity=".9"/>
    </g>
  </g>
</svg>`;
}

/**
 * The audit business: a website being examined.
 *
 * A browser frame with its content rendered as bars, two of them flagged. The
 * blue scan line crossing the whole window is the same signal as everywhere
 * else — here it reads as the thing doing the looking.
 */
export function auditArt(): string {
  return `<svg class="card-art" viewBox="0 0 300 150" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scan" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${BLUE}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g transform="translate(46 24)">
    <rect width="208" height="106" rx="9" fill="none" stroke="currentColor" stroke-width="1.9" opacity=".9"/>
    <line x1="0" y1="24" x2="208" y2="24" stroke="currentColor" stroke-width="1.5" opacity=".45"/>
    <g opacity=".45">
      <circle cx="15" cy="12" r="3.1"/><circle cx="27" cy="12" r="3.1"/><circle cx="39" cy="12" r="3.1"/>
    </g>
    <rect x="58" y="9" width="88" height="6" rx="3" opacity=".22"/>

    ${textLines(18, 40, [104, 132], 11, 0.3)}

    <!-- The two findings. Amber marks a problem; the pill beside it is where
         the report says what it costs you. -->
    <rect x="18" y="62" width="118" height="3.4" rx="1.7" fill="#E0A93B" opacity=".85"/>
    <rect x="142" y="60" width="22" height="7" rx="3.5" fill="#E0A93B" opacity=".28"/>
    <rect x="18" y="76" width="92" height="3.4" rx="1.7" fill="#E0A93B" opacity=".55"/>

    ${textLines(18, 88, [140], 10, 0.24)}
  </g>
  <line x1="18" y1="96" x2="282" y2="96" stroke="url(#scan)" stroke-width="2.2"/>
</svg>`;
}

export const CARD_ART: Record<string, () => string> = {
  guides: guidesArt,
  audit: auditArt,
};

/**
 * The square terminator from the mark, used as a list bullet.
 *
 * Replaces a generic tick. A tick says "included"; the terminator says "this is
 * where the signal lands", which is closer to what a line on these cards is.
 */
export function bullet(): string {
  return `<svg class="bullet" viewBox="0 0 12 12" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="5" width="7" height="2" rx="1" fill="currentColor" opacity=".45"/>
  <rect x="8.5" y="3.5" width="5" height="5" rx="1.2" fill="${BLUE}"/>
</svg>`;
}
