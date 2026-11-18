# zxfnt

Turns 8×8 pixel fonts into web fonts that you can use on any webpage with `@font-face`.

Sources:

- a classic 8×8 ASCII font
- fonts found as bitmap images
- glyphs drawn by hand

Every font can also get characters the original never had, such as letters for languages other than English and extra
symbols.

This is a hobby project. Status: **milestone 1 done**: the font builds into `dist/zxfnt.otf`.

## How it works

```
 ASCII glyph file ─────┐
 PNG image ────────────┤
 hand-drawn glyphs ────┴──► text glyph files ──► build ──► .otf (+ .woff2) + demo page
                                   ▲
                                   │
                 extra character sets (compose, copy, generate, draw)
```

Every source is first converted into a plain text glyph file, one per font. You can read and edit it in any editor:

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

Needs Node 22.6 or newer.

```sh
npm install
npm run build     # fonts/*/glyphs.txt -> dist/<name>.otf and dist/index.html
npm run serve     # demo page at http://localhost:8080
npm test          # checks that each .otf has exactly the pixels of its glyph file
npm run check     # type check
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
}
```

## Fonts

| Font                              | Source         | Glyphs                                                                         |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| [`zxfnt`](fonts/zxfnt/glyphs.txt) | 8×8 ASCII font | 96 ASCII glyphs, plus `^` and `` ` `` (the 96 have `↑` and `£` at those codes) |

## Milestones

1. ~~Pipeline: ASCII glyph file → `.otf`, plus a demo page.~~ Done.
2. First extra character sets for the font.
3. Importers: PNG images.
4. Extras: `.woff2`, block graphics (`▀ ▄ █`), a page with all fonts side by side.

## Tooling

- TypeScript on Node 22, run with `node --experimental-strip-types`.
- [opentype.js](https://github.com/opentypejs/opentype.js) writes the font files.

## Decisions

- [ADR 0001: Build tool and language](docs/adr/0001-build-tool-and-language.md)
- [ADR 0002: Plain text glyph format as the single source](docs/adr/0002-plain-text-glyph-format.md)
- [ADR 0003: Characters beyond ASCII](docs/adr/0003-characters-beyond-ascii.md)

## Copyright

The 96 ASCII glyphs, and the glyphs copied or composed from them, are © 1982 Sinclair Research Ltd, now Amstrad.
