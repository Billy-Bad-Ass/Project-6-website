# Notices

## Font Awesome Free

This project uses icons from [Font Awesome Free](https://fontawesome.com) 6.

Icons are licensed under [CC BY 4.0](https://fontawesome.com/license/free).
Attribution is carried in the footer of every page rendered by `src/render.ts`
and must stay there — it is a licence condition, not a style choice.

The icons are extracted from the `@fortawesome/fontawesome-free` package by
`scripts/generate-icons.mjs` into `src/icons.ts`, which is checked in. CI
regenerates and diffs that file, so it cannot drift from the licensed source
without failing the build.

Four icons are inlined — the generic affordances only (an arrow, an envelope, a
lock, a bolt). Everything that represents a BBA product is original artwork in
`src/motifs.ts`. The Font Awesome CSS and webfonts are not shipped.

## Typefaces

**Space Grotesk** and **Inter**, both under the SIL Open Font License 1.1, are
self-hosted from `public/fonts/` as variable Latin subsets. The OFL permits
redistribution as part of a larger work; the fonts are not sold or distributed
on their own.

## Brand assets

The animated mark in `public/assets/animated/` is the supplied kit, kept as the
reference for the timings the site reproduces. The site does not load those
files: it inlines the mark and defines the keyframes in `src/styles.ts`,
because the `.svg` files reference `@keyframes` they do not contain — only the
`.html` wrappers define them, so `<img src="…animated.svg">` renders a static
logo. Change the timings in one place and the other stops matching.


The BBA Network mark, wordmark and derived assets in `public/assets/` are not
open source. They are the property of BBA Network and are included here because
this repository builds BBA Network's own site.
