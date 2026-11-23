# zxfnt

[![Build](https://github.com/olecve/zxfnt/actions/workflows/build.yml/badge.svg)](https://github.com/olecve/zxfnt/actions/workflows/build.yml)

Pixel fonts for the web. Each pixel of an 8×8 font becomes a square in a vector font, so the text stays sharp at any
multiple of 8px.

**Demo: <https://olecve.github.io/zxfnt/>**

## Fonts

| Font                              | Cell | Characters                                                                             |
| --------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| [`zxfnt`](fonts/zxfnt/)           | 8×8  | the 96 ASCII glyphs, plus Latin, Cyrillic and Georgian letters, with Mtavruli capitals |
| [`zxfnt-tall`](fonts/zxfnt-tall/) | 8×10 | the same, with room above the letters for accents, tall Georgian and taller Mtavruli   |

The languages are English, Finnish, Swedish, Estonian, German, Russian, Ukrainian, Belarusian, Kazakh and Georgian.
Typographic punctuation such as `“ ” – … €` is there too, and the 16 block graphics of 8-bit computers, such as
`▛ ▀ ▚ █`.

Each font also comes in bold, italic and bold italic, made the way 8-bit programs made them: bold prints each letter
again one pixel to the right, and italic moves the upper half of each letter one pixel to the right.

The 96 ASCII glyphs are not from this project, and the letters copied or composed from them, such as `ä` from `a` and
`¨`, keep their credit. Every other glyph is drawn in this project.

## Using a font

Download the fonts from the demo page, or from the `zxfnt-fonts` artifact of a
[build](https://github.com/olecve/zxfnt/actions/workflows/build.yml), and put them next to your page, with `OFL.txt`:

```css
@font-face {
  font-family: "zxfnt";
  src:
    url("zxfnt.woff2") format("woff2"),
    url("zxfnt.otf") format("opentype");
}

@font-face {
  font-family: "zxfnt";
  font-weight: bold;
  src:
    url("zxfnt-bold.woff2") format("woff2"),
    url("zxfnt-bold.otf") format("opentype");
}

body {
  font-family: "zxfnt", monospace;
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
- Keep the bold `@font-face`. Without it, the browser makes bold text itself, and its edges are blurred. The italic
  files, `zxfnt-italic` and `zxfnt-bold-italic`, work the same way, with `font-style: italic`.

Use `zxfnt-tall` ("zxfnt Tall") for text with accents or Georgian. Its letters are the same size, and its lines are 1.25
times taller.

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
changes only that glyph's rows.

The code is TypeScript. [opentype.js](https://github.com/opentypejs/opentype.js) writes the fonts,
[wawoff2](https://github.com/fontello/wawoff2) compresses them, and the editor and demo page use Preact and esbuild. The
decisions behind the project are in [docs/adr](docs/adr/).

## Next

- Import fonts from PNG images

## License

The code and the glyphs drawn in this project are © 2026 Oleg Tsvetkov. The code is under the [MIT License](LICENSE),
and the fonts are under the [SIL Open Font License 1.1](OFL.txt), with the Reserved Font Name zxfnt: a modified font
needs a new name in its `font.txt`. The 96 glyphs of `ascii.txt`, and the glyphs that the lists in `sets/` copy or
compose from them, are © 1982 Sinclair Research Ltd, now Amstrad, and are not covered by these licenses.
