# Glyph Editor

## Status

Accepted

## Context and Problem Statement

Glyphs are drawn by hand in the text format of [ADR-0002](0002-plain-text-glyph-format.md): one line of `X` and `.` for
each row. This worked for the Latin and Cyrillic letters, which are close to letters the font already has. Georgian
showed its limits: 33 new shapes, each checked against a reference letter, and several drawn again after a comparison.
Each comparison needed a page and screenshots made by hand. A typo in a row is only seen after a build.

The 8×10 font needs its own Georgian letters with taller ascenders. Today a glyph of the font itself and an included
glyph with the same code point is an error, so the tall font cannot replace a few included glyphs.

Python is not used in this project ([ADR-0001](0001-build-tool-and-language.md)).

How should glyphs be drawn and checked, so that a new script or a redraw is fast and the glyph files stay the only
source?

## Decision Drivers

- The glyph files stay the only source: git diffs, the build and the tests do not change
- One parser and one writer for the glyph format, shared with the build
- A reference letter can be shown as a guide, but no glyph is copied from another font
- A change is seen at once: at real size, next to other letters and in a sentence
- Generated and read-only glyphs (`composed.txt`, `ascii.txt`) cannot be changed by mistake
- Few new dependencies
- The editor state (the glyph, the undo history, the save file and the preview) stays in step without code that updates
  each part by hand

## Considered Options

- A local web app in TypeScript and Preact, with JSX bundled by esbuild
- A local web app in TypeScript with plain DOM code, bundled by esbuild
- A local web app without a build step for the browser code
- A Clojure or ClojureScript app
- Keep editing the text files by hand

## Decision Outcome

Chosen option: "A local web app in TypeScript and Preact, with JSX bundled by esbuild", because it shares the parser and
the writer with the build, keeps full types in the browser code, and lets each part of the page follow the editor state.

`npm run edit` starts a local server on `http://localhost:8081`, like `npm run serve`, with the editor page:

- The left side lists the glyphs of a font by script, each marked by its source: drawn in this font, included from
  another font, or read-only (composed, or not from this project). The letters of the sample sentences that the font
  does not have are listed as missing.
- The middle has the pixel grid of the font's cell, with lines for the baseline and the x-height, and shaded rows above
  the x-height and below the baseline. A reference letter in a system font can be shown behind the grid. It is drawn
  only in the browser and never saved.
- The right side shows the glyph at real size, between other letters, in a sentence, and in both fonts.
- A save writes only that glyph into its file. Comments, the order and the other glyphs stay as they are.
- Glyphs of `composed.txt` and of `ascii.txt` are read-only. A composed glyph can be moved into a drawn file instead.

A glyph of the font itself now replaces an included glyph with the same code point. Two files of the font itself with
the same code point are still an error. The tall font can then have its own drawing of a few glyphs and include the
rest.

### Consequences

- Good, because a glyph is drawn and checked in one place, against its reference and in text
- Good, because the editor and the build read and write glyph files with the same code in `glyphs.ts`
- Good, because a glyph file changed in the editor gives the same git diff as a change by hand
- Good, because the tall font can replace included glyphs, for example Georgian letters with taller ascenders
- Neutral, because the text files can still be changed by hand
- Bad, because esbuild and Preact are new dev dependencies, and esbuild has a native binary for each platform
- Bad, because the project gets browser code, which needs its own lint and type settings
- Bad, because a glyph of the tall font can now hide an included glyph, so a change to the 8×8 drawing does not reach
  the tall font for that glyph

### Confirmation

- `npm run edit` serves the editor, and a saved glyph changes only its rows in its file
- A test checks that a glyph of the font itself replaces an included glyph, and that two own files with the same code
  point are still an error
- Georgian letters are redrawn with the editor: drawn on the grid, checked in the preview, copied out for review, pasted
  back and saved

## Pros and Cons of the Options

### A local web app in TypeScript and Preact, with JSX bundled by esbuild

The server and the browser code are TypeScript. The page is made of Preact components in `.tsx` files. esbuild turns
them into one JavaScript file on each request, so a change shows after a reload.

- Good, because the server uses `glyphs.ts` directly, and the browser code can import its types
- Good, because JSX has the same type checks as the rest of the project
- Good, because each component draws itself from the editor state, so the parts of the page cannot get out of step
- Good, because esbuild compiles JSX with no configuration file, and Preact is about 4 KB with no dependencies
- Bad, because esbuild, at `0.28.2` (2026-08-08), has a native binary for each platform
- Bad, because Preact, at `11.1.1` (2026-10-31), is one more dependency to keep up to date

### A local web app in TypeScript with plain DOM code, bundled by esbuild

Like the chosen option, but the browser code changes the page with DOM calls. The first version of the editor was built
this way.

- Good, because it needs no UI library
- Bad, because every change must update the grid, the list, the preview and the buttons by hand, and a missed update
  shows old state

### A local web app without a build step for the browser code

The browser loads plain JavaScript files directly as ES modules: plain DOM code with `// @ts-check`, or Preact with
`htm` templates instead of JSX.

- Good, because it needs no bundler
- Bad, because types in JSDoc comments are longer and weaker than TypeScript types, and `htm` templates are strings that
  `tsc` does not check
- Bad, because the browser code cannot import the TypeScript types of `glyphs.ts`
- Bad, because `htm`, at `3.1.1`, has had no release since 2022-04-26

### A Clojure or ClojureScript app

A desktop app on the JVM, or a ClojureScript web app.

- Good, because Clojure is a language that the project allows
- Bad, because the parser, the writer and the format rules exist twice, in TypeScript for the build and in Clojure for
  the editor
- Bad, because it adds the JVM or shadow-cljs and npm for ClojureScript to a project that has one runtime

### Keep editing the text files by hand

- Good, because nothing new is needed
- Bad, because each comparison with a reference needs a page and screenshots made by hand
- Bad, because a mistake in a row is only seen after a build

## More Information

- The reference letter is a guide for the shape, like a printed letter next to graph paper. The editor has no button
  that turns a reference letter into pixels, so every glyph stays drawn in this project
  ([ADR-0003](0003-characters-beyond-ascii.md)).
- A glyph of the font itself replacing an included one changes a rule of [ADR-0002](0002-plain-text-glyph-format.md),
  which says that the same code point in two files is an error. That rule still holds for the files of one font.
- Revisit when esbuild or Preact is not maintained, or when browsers can load TypeScript and JSX without a bundler.
