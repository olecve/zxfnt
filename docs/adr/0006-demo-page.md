# Demo Page With One View At A Time

## Status

Proposed

## Context and Problem Statement

The demo page shows the fonts on GitHub Pages. The build wrote it as static HTML with a small inline script, and every
part was on one long page: a text field, four sizes, the table of all glyphs and a sentence for each language. With ten
languages, 268 glyphs in each font and a second, taller font, the page became too long to take in, and the two fonts
could not be seen next to each other.

A version that copied the Spectrum screen was tried during this change: paper of 32×24 character cells inside a border,
everything at one text size, scaled by a whole number to fit the window. It looked like a Spectrum, but on a large
monitor it was too big, and the fixed grid left little room for the fonts themselves.

The glyph editor already uses Preact and esbuild ([ADR-0005](0005-glyph-editor.md)).

How should the demo page show the fonts, so that it fits one screen, lets the fonts be compared, and works on phones?

## Decision Drivers

- One screen at a time on a desktop, with the parts that matter: an alphabet, text, sizes, all glyphs
- The 8×8 and 8×10 fonts can be compared directly, also one above the other
- The Spectrum look of the page stays: border, paper, ink, the font for all text
- Pixel edges stay sharp, on a phone also
- GitHub Pages serves static files only
- No new tools beyond those of the editor

## Considered Options

- A Preact app with one view at a time and a font toggle, bundled by esbuild
- Static HTML from the build with all parts on one page
- Static HTML from the build with views switched by an inline script
- A Spectrum screen: a fixed paper of 32×24 cells at one text size

## Decision Outcome

Chosen option: "A Preact app with one view at a time and a font toggle, bundled by esbuild", because it shows one part
at a time in the original look, lets the fonts be compared, and uses the tools that the editor already has.

The build writes `dist/index.html` from `src/demo/index.html`, with the `@font-face` rules and the code points of each
font, and bundles `src/demo/main.tsx` into `dist/demo.js`. The page has:

- FONT: 8×8, 8×10 or both, one above the other. A change keeps the view, the language and the typed text, so that only
  the font changes.
- VIEW: the alphabet of the language with its sample sentence, a text field, the sentence at four sizes, or all glyphs.
- LANGUAGE: the languages that a font has all letters for, from `LANGUAGES` in `src/scripts.ts`. In all glyphs, the
  letters of the language are underlined. In the text field, which does not use the language, the control is dimmed.
- BORDER: the eight colours of the Spectrum.
- The URL hash keeps the font, the language and the view, for example `#both/ka/alphabet`.

On a phone the page turns off text autosizing, which blurs the pixels, and a tapped glyph shows its code in the status
line, as a pointed one does on a desktop.

### Consequences

- Good, because one view with both fonts fits a desktop screen
- Good, because switching the font in place shows each difference between the 8×8 and 8×10 fonts
- Good, because a link opens the page with a chosen font, language and view
- Good, because the page and the editor use the same tools and the same `LANGUAGES` and `GLYPH_GROUPS`
- Neutral, because the page is static files, as before
- Bad, because the page needs JavaScript: without it, the paper is empty
- Bad, because `npm run build` now depends on esbuild, which before only the editor needed
- Bad, because the page loads about 21 KB of JavaScript

### Confirmation

- CI builds the page, and GitHub Pages serves it
- The page works in Chrome on a desktop, on a 2× screen and in phone emulation, with no script errors
- The page is checked in Safari and on a real phone

## Pros and Cons of the Options

### A Preact app with one view at a time and a font toggle, bundled by esbuild

- Good, because each part of the page follows the state of the font, the language and the view
- Good, because esbuild and Preact are already in the project for the editor
- Good, because the page is static files, so GitHub Pages serves it
- Bad, because the content is made by JavaScript, not written into the HTML

### Static HTML from the build with all parts on one page

The page as it was before this change.

- Good, because it works without JavaScript, except for the buttons
- Bad, because with ten languages and two fonts the page is several screens long
- Bad, because the two fonts are not shown one above the other

### Static HTML from the build with views switched by an inline script

- Good, because it needs no bundler for the page
- Bad, because the script must show, hide and mark each part by hand, and gets long with views, languages and two fonts
- Bad, because the inline script is a string in `build.ts`, without type checks

### A Spectrum screen: a fixed paper of 32×24 cells at one text size

Tried during this change.

- Good, because it looks most like a real Spectrum
- Bad, because on a large monitor the whole-number scale makes it very large
- Bad, because the fixed grid leaves little room for the content: an alphabet and a sentence fill most of it

## More Information

- The controls go from the most general to the most specific: FONT, VIEW, LANGUAGE, BORDER. A control only changes the
  controls below it, so that the view can dim the language without a lower control changing a higher one.
- All glyphs stays the full character map of the font, and the language only underlines its letters. Dimming the
  language in that view was tried and dropped, because the underline shows which glyphs a language needs, for example
  `Ä Õ Ö Ü Š Ž` and not `Å` for Estonian.
- [ADR-0001](0001-build-tool-and-language.md) chose Node and TypeScript for the build. The page is part of the build
  output, and its browser code follows [ADR-0005](0005-glyph-editor.md).
- Revisit when the page must work without JavaScript, for example for search engines. Then the build can render the
  first view into the HTML.
- Revisit when there are more fonts than fit in one row of buttons. Then FONT becomes a list, and "both" a choice of two
  fonts.
