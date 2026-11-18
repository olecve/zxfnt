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
npm run import:rom -- 48.rom  # 48K ROM or 768-byte font file -> fonts/zx-rom/rom.txt
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
  /* macOS thickens glyphs by default, which blurs the pixel edges */
  -webkit-font-smoothing: antialiased; /* Chrome, Safari, Edge */
  -moz-osx-font-smoothing: grayscale; /* Firefox */
}
```

Sharp edges need all of these:

- **Font smoothing off on macOS.** Without the two `font-smoothing` lines, macOS makes every glyph slightly bolder, and
  the edges get grey pixels. These lines have no effect on other systems.
- **A font size that is a multiple of 8px** (8, 16, 24, 32…). Then each font pixel is a whole number of screen pixels.
  On a high-density (retina) screen, multiples of 4px are also sharp.
- **Text that starts on a whole pixel.** On a normal-density screen, text that starts at a fractional position, for
  example inside a centered box with an odd width, gets grey edges.

## Fonts

| Font                      | Source                                | Glyphs                                                                                                                                                              |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`zx-rom`](fonts/zx-rom/) | ZX Spectrum 48K ROM, address `0x3D00` | 96 from the ROM ([`rom.txt`](fonts/zx-rom/rom.txt)), plus `^` and `` ` `` ([`extra.txt`](fonts/zx-rom/extra.txt)), because the ROM shows `↑` and `£` at those codes |

## Milestones

1. ~~Pipeline: ROM glyph file → `.otf`, plus a demo page.~~ Done.
2. First extra character sets for the ROM font.
3. Importers: ~~the ROM and raw 768-byte files~~, then PNG images.
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
