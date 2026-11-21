# zxfnt

[![Build](https://github.com/olecve/zxfnt/actions/workflows/build.yml/badge.svg)](https://github.com/olecve/zxfnt/actions/workflows/build.yml)

ZX Spectrum fonts for the web. Each pixel of an 8×8 Spectrum font becomes a square in a vector font, so the text stays
sharp at any multiple of 8px.

**Demo: <https://olecve.github.io/zxfnt/>**

## Fonts

| Font                                | Cell | Characters                                                                           |
| ----------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [`zx-rom`](fonts/zx-rom/)           | 8×8  | the 48K ROM font, plus Latin, Cyrillic and Georgian letters, with Mtavruli capitals  |
| [`zx-rom-tall`](fonts/zx-rom-tall/) | 8×10 | the same, with room above the letters for accents, tall Georgian and taller Mtavruli |

The languages are English, Finnish, Swedish, Estonian, German, Russian, Ukrainian, Belarusian, Kazakh and Georgian.
Typographic punctuation such as `“ ” – … €` is there too, and the 16 block graphics of the Spectrum keyboard, such as
`▛ ▀ ▚ █`.

Each font also comes in bold, made the way Spectrum programs made bold text: each letter printed again one pixel to the
right.

Only the 96 ROM characters come from the Spectrum. Every other glyph is drawn in this project or composed from its own
glyphs, such as `ä` from `a` and `¨`.

## Using a font

Download the fonts from the demo page, or from the `zxfnt-fonts` artifact of a
[build](https://github.com/olecve/zxfnt/actions/workflows/build.yml), and put them next to your page:

```css
@font-face {
  font-family: "ZX Spectrum ROM";
  src:
    url("zx-rom.woff2") format("woff2"),
    url("zx-rom.otf") format("opentype");
}

@font-face {
  font-family: "ZX Spectrum ROM";
  font-weight: bold;
  src:
    url("zx-rom-bold.woff2") format("woff2"),
    url("zx-rom-bold.otf") format("opentype");
}

body {
  font-family: "ZX Spectrum ROM", monospace;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  text-decoration-thickness: from-font;
  text-underline-position: from-font;
}
```

For sharp pixels:

- Use a font size that is a multiple of 8px. On a retina screen, multiples of 4px work too.
- Keep the `font-smoothing` lines. Without them, macOS draws the glyphs a little bolder, with grey edges.
- `from-font` makes underlines and strikeouts one font pixel thick.
- Keep the bold `@font-face`. Without it, the browser makes bold text itself, and its edges are blurred.

Use `zx-rom-tall` ("ZX Spectrum ROM Tall") for text with accents or Georgian. Its letters are the same size, and its
lines are 1.25 times taller.

## Development

Needs Node 22.6 or newer (`nvm use` picks the version in `.nvmrc`).

```sh
npm install
npm run build     # fonts/ -> dist/: .otf, .woff2 and the demo page
npm run serve     # the demo page at http://localhost:8080
npm run edit      # the glyph editor at http://localhost:8081
npm run compose   # makes the composed letters, such as ä, from the lists in sets/
npm run validate  # format, lint, unused code, types and tests
```

A font is a directory of text files. `font.txt` has its name and size, and the other files have the glyphs, one source
each:

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

The editor draws on the same files: a pixel grid with a reference letter behind it, a live preview, and a save that
changes only that glyph's rows. `npm run import:rom -- 48.rom` reads the font of a 48K ROM or a 768-byte font file.

The code is TypeScript. [opentype.js](https://github.com/opentypejs/opentype.js) writes the fonts,
[wawoff2](https://github.com/fontello/wawoff2) compresses them, and the editor and demo page use Preact and esbuild. The
decisions behind the project are in [docs/adr](docs/adr/).

## Next

- Import fonts from PNG images
- Take fonts from game snapshots (`.sna`, `.z80`), starting with Dizzy

## License

The code and the glyphs made in this project are under the [MIT License](LICENSE). The 96 ROM glyphs are © Amstrad,
which allows the ROM to be shared for emulator use. Fonts taken from games belong to their publishers.
