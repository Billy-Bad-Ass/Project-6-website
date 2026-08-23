/**
 * The design system.
 *
 * Every colour here is lifted from the brand kit's own SVGs rather than picked
 * to look nice next to them — `#2B5CE6`, `#0B0F16`, `#FAFAF8`, `#C7CCD6` and
 * `#12161F` are the literal fill and stroke values in bba-mark-*.svg. That is
 * the difference between a site that matches the logo and a site that happens
 * to be blue.
 *
 * Inlined into the document head. It is a few kilobytes to render one page, and
 * a separate stylesheet would cost a round trip before anything is visible.
 *
 * ## Dark first, and why
 *
 * The mark is drawn for a dark ground — the kit ships `-for-dark` as the colour
 * variant and the app icon is a dark rounded square. So dark is the default and
 * light is the override, not the other way round. Both are complete: every
 * token is defined on `:root` and re-defined under the light query, so nothing
 * inherits a colour that only exists in one mode.
 */

export const STYLES = /* css */ `
:root {
  /* Brand, straight from the kit. Do not "adjust" these. */
  --bba-blue: #2B5CE6;
  --bba-ink: #0B0F16;
  --bba-slate: #12161F;
  --bba-grey: #C7CCD6;
  --bba-paper: #FAFAF8;

  /* Roles. Components reference these, never the brand values above, so a
     theme change is a change to this block and nowhere else. */
  --bg: var(--bba-ink);
  --bg-raised: var(--bba-slate);
  --bg-sunken: #080B11;
  --text: var(--bba-paper);
  --text-muted: #8E97A8;
  --text-dim: #5D6779;
  --line: #1E2534;
  --line-strong: #2C3547;
  --accent: var(--bba-blue);
  --accent-soft: rgba(43, 92, 230, 0.12);
  --accent-text: #7D9BFF;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.7);
  --status-live: #4ADE80;
  --status-building: #E0A93B;

  --radius: 14px;
  --radius-sm: 8px;
  --measure: 68ch;
  --step: clamp(1rem, 0.6rem + 1.6vw, 1.5rem);

  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
          "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;

  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: var(--bba-paper);
    --bg-raised: #FFFFFF;
    --bg-sunken: #F1F2EF;
    --text: var(--bba-ink);
    --text-muted: #55607A;
    --text-dim: #7A849A;
    --line: #E2E4E0;
    --line-strong: #CDD0CB;
    --accent-soft: rgba(43, 92, 230, 0.08);
    --accent-text: #1E45B8;
    --shadow: 0 1px 2px rgba(11,15,22,.06), 0 10px 30px -18px rgba(11,15,22,.4);

    /* The status colours are picked for a dark ground and do not survive being
       moved to a light one — #4ADE80 on near-white is about 1.7:1, and the pill
       renders its text in that same colour. These are the darkened equivalents
       that clear 4.5:1 while reading as the same green and amber. */
    --status-live: #0E7A3C;
    --status-building: #8A5A00;

    color-scheme: light;
  }
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* A visible, branded focus ring. Removing focus styling breaks keyboard
   navigation for everyone who depends on it, so this is deliberately loud. */
:where(a, button, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}

.wrap { width: min(100% - 2.5rem, 1120px); margin-inline: auto; }

.skip {
  position: absolute; left: -9999px;
  background: var(--accent); color: #fff;
  padding: .7rem 1.1rem; border-radius: var(--radius-sm); z-index: 100;
}
.skip:focus { left: 1rem; top: 1rem; }

.icon { width: 1em; height: 1em; display: inline-block; vertical-align: -0.125em; }

/* ---------------------------------------------------------------- header -- */

.masthead {
  position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.masthead .wrap {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding-block: .85rem;
}
.brand { display: flex; align-items: center; gap: .7rem; text-decoration: none; color: inherit; }
.brand svg { width: 38px; height: auto; flex: none; }
.brand-name {
  font-weight: 700; letter-spacing: .16em; font-size: .82rem; text-transform: uppercase;
  white-space: nowrap;
}
.brand-name .thin { font-weight: 400; color: var(--text-muted); }

.masthead nav { display: flex; gap: 1.4rem; align-items: center; }
/* Below this width the lockup and three nav links cannot both fit, and
   white-space:nowrap turns that from an ugly wrap into "Contact" falling off
   the right edge. The mark plus "BBA" is still an unambiguous lockup, so "NETWORK" is
   what gives way — the navigation is functional, the second word is not. */
@media (max-width: 30rem) {
  .masthead .wrap { gap: .6rem; }
  .masthead nav { gap: .9rem; }
  .masthead nav a { font-size: .82rem; }
  .brand svg { width: 30px; }
  .brand { gap: .5rem; }
  .brand-name .thin { display: none; }
}
.masthead nav a {
  color: var(--text-muted); text-decoration: none; font-size: .9rem; font-weight: 500;
}
.masthead nav a:hover { color: var(--text); }

/* ------------------------------------------------------------------ hero -- */

.hero { padding-block: clamp(3.5rem, 9vw, 7rem) clamp(2.5rem, 6vw, 4.5rem); }

.hero-mark { width: clamp(180px, 34vw, 280px); height: auto; margin-bottom: 2.2rem; }

/* The waveform draws itself in once. Motion is the mark's own metaphor — a
   signal — but it runs a single time and never loops, so it cannot become the
   thing that distracts you on every visit. */
.hero-mark .bar {
  transform-origin: center;
  animation: bar-in .6s cubic-bezier(.2,.8,.3,1) backwards;
}
@keyframes bar-in { from { transform: scaleX(0); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .hero-mark .bar { animation: none; }
}

h1 {
  font-size: clamp(2.3rem, 1.2rem + 4.4vw, 4.1rem);
  line-height: 1.05; letter-spacing: -0.032em; font-weight: 700;
  margin: 0 0 1.2rem; max-width: 18ch;
  text-wrap: balance;
}
.hero p.lede {
  font-size: clamp(1.08rem, 1rem + .45vw, 1.32rem);
  color: var(--text-muted); max-width: 56ch; margin: 0 0 2rem;
  text-wrap: pretty;
}

.hero-meta {
  display: flex; flex-wrap: wrap; gap: .55rem 1.6rem;
  font-size: .87rem; color: var(--text-dim);
}
.hero-meta span { display: inline-flex; align-items: center; gap: .45rem; }
.hero-meta .icon { color: var(--accent-text); }

/* --------------------------------------------------------------- section -- */

.section { padding-block: clamp(2.5rem, 6vw, 4.5rem); border-top: 1px solid var(--line); }

.section-head { margin-bottom: 2.2rem; }
.eyebrow {
  font-size: .74rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--accent-text); font-weight: 600; margin: 0 0 .7rem;
}
h2 {
  font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2.1rem);
  letter-spacing: -0.02em; margin: 0 0 .6rem; line-height: 1.2; font-weight: 650;
}
.section-head p { color: var(--text-muted); margin: 0; max-width: var(--measure); }

/* ----------------------------------------------------------------- cards -- */

.cards { display: grid; gap: 1.3rem; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); }

.card {
  position: relative; display: flex; flex-direction: column;
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.6rem;
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}
.card.is-live:hover, .card.is-live:focus-within {
  border-color: var(--line-strong);
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.card.is-pending { opacity: .82; }

.card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
.card-icon {
  display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: 11px;
  background: var(--accent-soft); color: var(--accent-text);
  font-size: 1.15rem; flex: none;
}

.card h3 { margin: 0 0 .35rem; font-size: 1.22rem; letter-spacing: -0.012em; font-weight: 650; }
.card .tagline { margin: 0 0 .9rem; color: var(--text); font-size: .97rem; }
.card .blurb { margin: 0 0 1.2rem; color: var(--text-muted); font-size: .92rem; }

.card ul { list-style: none; margin: 0 0 1.4rem; padding: 0; display: grid; gap: .5rem; }
.card li { display: flex; gap: .6rem; align-items: flex-start; font-size: .89rem; color: var(--text-muted); }
.card li .icon { color: var(--accent-text); margin-top: .34em; flex: none; font-size: .8em; }

.card-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.price { font-size: .85rem; color: var(--text-dim); font-family: var(--font-mono); }

/* The whole card is the click target on a live business — but the anchor stays
   a real anchor with real text, so it is announced and reachable by keyboard.
   The ::after is what widens the hit area, not a replacement for the link. */
.cta {
  display: inline-flex; align-items: center; gap: .5rem;
  background: var(--accent); color: #fff; text-decoration: none;
  padding: .62rem 1.05rem; border-radius: var(--radius-sm);
  font-weight: 600; font-size: .92rem;
  transition: background .16s ease;
}
.cta:hover { background: #1E45B8; }
.cta::after { content: ""; position: absolute; inset: 0; border-radius: var(--radius); }
.cta .icon { transition: transform .16s ease; }
.cta:hover .icon { transform: translateX(3px); }

.pill {
  display: inline-flex; align-items: center; gap: .45rem;
  font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  padding: .3rem .6rem; border-radius: 999px; white-space: nowrap;
  border: 1px solid currentColor;
}
.pill.live { color: var(--status-live); }
.pill.building { color: var(--status-building); }
.pill.planned { color: var(--text-dim); }

.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }

.pending-note {
  font-size: .85rem; color: var(--text-dim); font-style: italic; margin: 0;
}

/* ---------------------------------------------------------------- footer -- */

footer { border-top: 1px solid var(--line); padding-block: 2.6rem 3.2rem; margin-top: 1rem; }
.foot-grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
footer h4 {
  font-size: .74rem; letter-spacing: .16em; text-transform: uppercase;
  color: var(--text-dim); margin: 0 0 .85rem; font-weight: 600;
}
footer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
footer a { color: var(--text-muted); text-decoration: none; font-size: .91rem; }
footer a:hover { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.colophon {
  margin-top: 2.4rem; padding-top: 1.5rem; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-size: .82rem; color: var(--text-dim);
}
.colophon a { font-size: inherit; }

/* ------------------------------------------------------------------ misc -- */

.prose { max-width: var(--measure); }
.prose h2 { margin-top: 2.4rem; }
.prose p { color: var(--text-muted); }
.prose a { color: var(--accent-text); }

.notice {
  background: var(--accent-soft); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); padding: 1rem 1.2rem; font-size: .92rem;
  color: var(--text-muted);
}
`;
