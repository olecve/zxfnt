# zxfnt

[![Build](https://github.com/olecve/zxfnt/actions/workflows/build.yml/badge.svg)](https://github.com/olecve/zxfnt/actions/workflows/build.yml)

Turns 8×8 pixel fonts into web fonts that you can use on any webpage with `@font-face`.

**Demo page: <https://olecve.github.io/zxfnt/>.** Each run of the
[build workflow](https://github.com/olecve/zxfnt/actions/workflows/build.yml) also has the fonts as a downloadable
artifact, `zxfnt-fonts`.

Sources:

- a classic 8×8 ASCII font
- fonts found as bitmap images
- glyphs drawn by hand

Every font can also get characters the original never had, such as letters for languages other than English and extra
symbols. These characters are drawn by hand in this project, or composed from the font's own glyphs and marks. They are
not copied from other fonts.

This is a hobby project. Status: the font builds in an 8×8 and an 8×10 variant, both with accented Latin letters. See
[Milestones](#milestones) for what comes next.

## How it works

```
 ASCII glyph file ─────┐
 PNG image ────────────┤
 hand-drawn glyphs ────┴──► text glyph files ──► build ──► .otf (+ .woff2) + demo page
                                   ▲
                                   │
                 extra character sets (compose, copy, generate, draw)
```

Every source is first converted into plain text glyph files. A font is a directory: `font.txt` has the name and size,
and each other `.txt` file has glyphs from one source. You can read and edit them in any editor:

```
U+0041 A
........
..XXXX..
.X....X.
.X....X.
.XXXXXX.
.X....X.
.X....X.
........
```

The builder turns each lit pixel into a square in a vector font.

## Building

Needs Node 22.6 or newer. `.nvmrc` pins the version that the project is tested with, so `nvm use` selects it.

```sh
npm install
npm run build     # fonts/<font>/*.txt -> dist/<name>.otf and dist/index.html
npm run serve     # demo page at http://localhost:8080
npm test          # checks that each .otf has exactly the pixels of its glyph files
npm run lint      # ESLint
npm run check     # type check
npm run format    # formats all files with Prettier
npm run validate  # format check, lint, type check and tests
npm run compose   # character lists in sets/ -> fonts/<font>/composed.txt
```

Open the demo page through `npm run serve`. Browsers do not load fonts for pages opened as `file://` URLs.

## Using a font

Copy `dist/zxfnt.otf` next to your page:

```css
@font-face {
  font-family: "zxfnt";
  src: url("zxfnt.otf") format("opentype");
}

body {
  font-family: "zxfnt", monospace;
  font-size: 16px; /* multiples of 8px keep pixels sharp */
  /* macOS thickens glyphs by default, which blurs the pixel edges */
  -webkit-font-smoothing: antialiased; /* Chrome, Safari, Edge */
  -moz-osx-font-smoothing: grayscale; /* Firefox */
}

a {
  /* a sharp underline, one font pixel thick, from the font */
  text-decoration-thickness: from-font;
  text-underline-position: from-font;
}
```

Sharp edges need all of these:

- **Font smoothing off on macOS.** Without the two `font-smoothing` lines, macOS makes every glyph slightly bolder, and
  the edges get grey pixels. These lines have no effect on other systems.
- **A font size that is a multiple of 8px** (8, 16, 24, 32…). Then each font pixel is a whole number of screen pixels.
  On a high-density (retina) screen, multiples of 4px are also sharp.
- **Text that starts on a whole pixel.** On a normal-density screen, text that starts at a fractional position, for
  example inside a centered box with an odd width, gets grey edges.

For text with accents, use `zxfnt-tall.otf` ("zxfnt Tall") instead. It has the same glyphs in an 8×10 cell: capitals
with accents keep their full height, and every accent has an empty row below it. Letters have the same size as in
`zxfnt.otf`, and lines are 1.25 times taller.

## Fonts

| Font                              | Source                                         | Glyphs                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`zxfnt`](fonts/zxfnt/)           | 8×8 ASCII font                                 | 96 ASCII glyphs ([`ascii.txt`](fonts/zxfnt/ascii.txt)); `ä å õ ö ü š ž Ä Å Õ Ö Ü` composed ([`composed.txt`](fonts/zxfnt/composed.txt)); `^`, `` ` `` and `ß` drawn ([`extra.txt`](fonts/zxfnt/extra.txt)); `Š` and `Ž` drawn five rows high ([`short-caps.txt`](fonts/zxfnt/short-caps.txt)); punctuation and symbols for web pages, such as `“ ” – … € °` and the no-break space ([`punctuation.txt`](fonts/zxfnt/punctuation.txt)) |
| [`zxfnt-tall`](fonts/zxfnt-tall/) | `zxfnt` in an 8×10 cell, for text with accents | includes `ascii.txt`, `extra.txt` and `punctuation.txt` of `zxfnt`; all accented letters composed at full height ([`composed.txt`](fonts/zxfnt-tall/composed.txt))                                                                                                                                                                                                                                                                    |

## Milestones

1. ~~Pipeline: ASCII glyph file → `.otf`, plus a demo page.~~ Done.
2. First extra character sets for the font: ~~accented Latin letters~~, then another alphabet.
3. Importers: PNG images.
4. Extras: `.woff2`, block graphics (`▀ ▄ █`), a page with all fonts side by side.

## Tooling

- TypeScript on Node 22, run with `node --experimental-strip-types`.
- Prettier formats the code. ESLint with typescript-eslint lints it. `npm run validate` runs all checks.
- [opentype.js](https://github.com/opentypejs/opentype.js) writes the font files.

## Decisions

- [ADR 0001: Build tool and language](docs/adr/0001-build-tool-and-language.md)
- [ADR 0002: Plain text glyph format as the single source](docs/adr/0002-plain-text-glyph-format.md)
- [ADR 0003: Characters beyond ASCII](docs/adr/0003-characters-beyond-ascii.md)
- [ADR 0004: Taller variant for accents](docs/adr/0004-taller-variant-for-accents.md)

## License

The code is under the [MIT License](LICENSE). The fonts and the glyphs drawn in this project are under the
[SIL Open Font License 1.1](OFL.txt), with the Reserved Font Name zxfnt: a modified font needs a new name in its
`font.txt`. They are not copied from other fonts.

The 96 glyphs of `ascii.txt`, and the glyphs that the lists in `sets/` copy or compose from them, are © 1982 Sinclair
Research Ltd, now Amstrad, and are not covered by these licenses. The `copyright` of each font says which glyphs are
whose.
