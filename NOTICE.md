# Notices

## Artwork

Every mark on this site is original work: the logo animation, the hero signal
field, the product illustrations and the interface icons are all drawn in
`src/motifs.ts` from the brand mark's own vocabulary.

This project previously used Font Awesome Free icons under CC BY 4.0, which
obliges a visible credit wherever they appear. They were replaced with drawn
equivalents rather than the credit being removed — if a borrowed glyph is ever
reintroduced, its attribution has to come back with it.

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
