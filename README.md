# zxfnt

Turns 8×8 pixel fonts into web fonts that you can use on any webpage with `@font-face`.

Sources:

- a classic 8×8 ASCII font
- fonts found as bitmap images
- glyphs drawn by hand

Every font can also get characters the original never had, such as letters for languages other than English and extra
symbols.

This is a hobby project. Status: **planning**. No code yet.

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

## Using a font (planned)

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

## Milestones

1. Pipeline: ASCII glyph file → `.otf`, plus a demo page.
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
