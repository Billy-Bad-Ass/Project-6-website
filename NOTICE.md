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

Nine icons are inlined. The Font Awesome CSS and webfonts are not shipped.

## Brand assets

The BBA Network mark, wordmark and derived assets in `public/assets/` are not
open source. They are the property of BBA Network and are included here because
this repository builds BBA Network's own site.
