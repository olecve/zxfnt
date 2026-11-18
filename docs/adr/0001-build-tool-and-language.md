# Build Tool And Language

## Status

Proposed

## Context and Problem Statement

zxfnt makes web fonts from 8×8 ZX Spectrum fonts. The sources are the Spectrum ROM font, fonts from games and fonts from
bitmap images. Which language and font library should the build use to read binary data and PNG images, and to write a
vector font file in which each lit pixel is one square?

Python is not used in this project. Ready-made Spectrum fonts and online font editors such as FontStruct were tried or
looked at first. They were dropped because the fonts were not good enough, and an editor cannot import from ROMs, games
or images.

Facts checked on 2026-11-18:

- The development machine has Node `v22.17.1`, OpenJDK `22.0.1`, the Clojure CLI, Babashka and Leiningen.
- `opentype.js` is at `2.0.0` (last change on npm: 2026-05-06).
- `wawoff2` (WOFF2 compression in WebAssembly) is at `2.0.1` (last change on npm: 2022-05-24).
- Node 22.17 runs `.ts` files only with the `--experimental-strip-types` flag.
- Bits'N'Picas `convertbitmap` reads `.bdf`, `.png` and `.fzx` and writes `ttf` and `otb`. Its last commit is from
  2026-10-22.
- Google archived `sfntly`, a Java library that reads and writes fonts. The last push was on 2022-08-03.

## Decision Drivers

- Must write a vector font file that browsers load with `@font-face`
- Must read binary data and PNG images
- Must not use Python
- One language and one runtime for the whole build
- Direct control over metrics, names and code points
- Only maintained libraries

## Considered Options

- TypeScript and `opentype.js`
- Clojure and Bits'N'Picas
- Clojure with our own TrueType writer

## Decision Outcome

Chosen option: "TypeScript and `opentype.js`", because it is the only option that uses one language and one runtime,
gives direct control over the font, and depends on a maintained font library.

### Consequences

- Good, because one command builds every font
- Good, because the project starts with one dev dependency, `opentype.js`
- Good, because all current browsers load the `.otf` output
- Bad, because WOFF2 output depends on `wawoff2`, which is not maintained
- Bad, because scripts need `node --experimental-strip-types` on Node 22.17
- Bad, because PNG input needs `pngjs`, which Java would not need

### Confirmation

- The build makes an `.otf` file from the ROM glyph file
- A demo page loads the `.otf` file with `@font-face`, and the text shows the Spectrum shapes in Chrome, Firefox and
  Safari

## Pros and Cons of the Options

### TypeScript and `opentype.js`

Node runs TypeScript directly. `opentype.js` makes each glyph from a path of squares and writes an `.otf` file.

- Good, because one language does all tasks
- Good, because `opentype.js` is maintained (2.0.0, May 2026)
- Good, because the code controls every part of the font
- Good, because Node 22 runs `.ts` files with no compile step
- Neutral, because `opentype.js` writes CFF outlines (`.otf`), not TrueType outlines
- Bad, because PNG input needs `pngjs`
- Bad, because WOFF2 output needs `wawoff2`, which has had no change since 2022

### Clojure and Bits'N'Picas

Our Clojure code reads the sources and writes BDF files. The Bits'N'Picas jar converts each BDF file to TTF.

- Good, because Clojure is a preferred language
- Good, because Java reads PNG with `ImageIO` from the JDK
- Good, because Bits'N'Picas is maintained and reads BDF, PNG and FZX
- Good, because Bits'N'Picas can also write `otb` (OpenType Bitmap)
- Bad, because the build needs two tools for one result: our code, then a separate jar
- Bad, because metrics and names come from the BDF file and the jar, so the code has less direct control
- Bad, because the jar must be downloaded and kept at a known version

### Clojure with our own TrueType writer

No maintained Java library that writes fonts was found, so our code writes the TrueType binary format.

- Good, because Clojure is a preferred language
- Good, because there is no outside dependency
- Bad, because `sfntly` is archived, and Fontastic and doubletype are from about 2014
- Bad, because the TrueType writer is an estimated 300–400 more lines, with a high risk of errors

## More Information

- Revisit when `opentype.js` cannot do a thing that we need, such as embedded bitmap strikes or TrueType hinting. Then
  export BDF from the glyph files and convert with Bits'N'Picas.
- Revisit when WOFF2 output becomes necessary and `wawoff2` does not work.
- Related: [ADR-0002](0002-plain-text-glyph-format.md) (the input of the build) and
  [ADR-0003](0003-characters-beyond-ascii.md) (extra glyphs that the build adds).
- [opentype.js 2.0.0](https://github.com/opentypejs/opentype.js/tree/2.0.0)
- [wawoff2 2.0.1](https://www.npmjs.com/package/wawoff2/v/2.0.1)
- [pngjs 7.0.0](https://www.npmjs.com/package/pngjs/v/7.0.0)
- [Bits'N'Picas README: input and output formats](https://github.com/kreativekorp/bitsnpicas/blob/1fbc1cbcb19f78d41110b7538a733f0dfa025baa/README.md)
