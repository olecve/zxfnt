# zxfnt

Turns 8×8 ZX Spectrum fonts into web fonts that you can use on any webpage with `@font-face`.

Sources:

- the original ZX Spectrum 48K ROM font
- fonts taken from games (for example Dizzy)
- fonts found as bitmap images or raw font files

Every font can also get characters the original never had, such as letters for languages other than English and extra
symbols.

This is a hobby project. Status: **milestone 1 done**: the ROM font builds into `dist/zx-rom.otf`.

## How it works

```
 Spectrum ROM ─────────┐
 raw font file (.ch8) ─┤
 PNG image ────────────┼──► text glyph files ──► build ──► .otf (+ .woff2) + demo page
 game snapshot (.sna) ─┤           ▲
 hand-drawn glyphs ────┘           │
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

Needs Node 22.6 or newer. `.nvmrc` pins the version that the project is tested with, so `nvm use` selects it.

```sh
npm install
npm run build     # fonts/*/glyphs.txt -> dist/<name>.otf and dist/index.html
npm run serve     # demo page at http://localhost:8080
npm test          # checks that each .otf has exactly the pixels of its glyph file
npm run lint      # ESLint
npm run check     # type check
npm run format    # formats all files with Prettier
npm run validate  # format check, lint, type check and tests
```

Open the demo page through `npm run serve`. Browsers do not load fonts for pages opened as `file://` URLs.

## Using a font

Copy `dist/zx-rom.otf` next to your page:

```css
@font-face {
  font-family: "ZX Spectrum ROM";
  src: url("zx-rom.otf") format("opentype");
}

body {
  font-family: "ZX Spectrum ROM", monospace;
  font-size: 16px; /* multiples of 8px keep pixels sharp */
}
```

## Fonts

| Font                                | Source                                | Glyphs                                                                           |
| ----------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| [`zx-rom`](fonts/zx-rom/glyphs.txt) | ZX Spectrum 48K ROM, address `0x3D00` | 96 from the ROM, plus `^` and `` ` `` (the ROM shows `↑` and `£` at those codes) |

## Milestones

1. ~~Pipeline: ROM glyph file → `.otf`, plus a demo page.~~ Done.
2. First extra character sets for the ROM font.
3. Importers: raw binary files, then PNG images.
4. Snapshot ripper (`.sna`, `.z80`); try it on Dizzy.
5. Extras: `.woff2`, Spectrum block graphics (`▀ ▄ █`), a page with all fonts side by side.

## Tooling

- TypeScript on Node 22, run with `node --experimental-strip-types`.
- Prettier formats the code. ESLint with typescript-eslint lints it. `npm run validate` runs all checks.
- [opentype.js](https://github.com/opentypejs/opentype.js) writes the font files.

## Decisions

- [ADR 0001: Build tool and language](docs/adr/0001-build-tool-and-language.md)
- [ADR 0002: Plain text glyph format as the single source](docs/adr/0002-plain-text-glyph-format.md)
- [ADR 0003: Characters beyond ASCII](docs/adr/0003-characters-beyond-ascii.md)

## Copyright

The ZX Spectrum ROM is copyrighted by Amstrad, which allows it to be shared for emulator use. Game fonts belong to their
publishers. This project is for personal, non-commercial use.
