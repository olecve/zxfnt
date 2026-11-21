# Generated Bold Style

## Status

Accepted

## Context and Problem Statement

Each font has one style. When a page asks for bold text, for example with `<b>`, `<strong>` or `font-weight: bold`, the
browser makes a bold version itself. Chrome draws the outlines thicker by a part of a pixel, so the edges of the pixels
are no longer sharp. That breaks the main promise of zxfnt: text that stays sharp at any multiple of 8px.

The Spectrum had no bold font in ROM. Programs that wanted bold text printed each letter again one pixel to the right,
so every vertical stroke became two pixels wide.

How do the fonts get a bold style that stays exact to the pixel grid?

## Decision Drivers

- Bold text must stay sharp, with whole pixels, like the regular style
- Must work with plain HTML and CSS: `<b>` and `font-weight: bold` pick it up
- Must cover every glyph of every font, also glyphs added later
- No repeated hand work for each glyph
- Should look like Spectrum bold text

## Considered Options

- Generate the bold glyphs at build time
- Let the browser make bold text
- Draw a bold glyph for each glyph by hand

## Decision Outcome

Chosen option: "Generate the bold glyphs at build time", because it gives sharp bold text for every glyph of every font
with no hand work, made the way Spectrum programs made it.

`src/bold.ts` makes the bold glyphs from the regular ones, and the build writes a second font for each font directory:
`zx-rom-bold` and `zx-rom-tall-bold`. Each has the same family name as its regular font, with weight 700, so one
`@font-face` rule per weight is enough for the browser to pick the bold font.

- A pixel is added to the right of each lit pixel, but only where it leaves a gap of one pixel to the next stroke.
- Block graphics stay as they are, so that they still join their neighbours.
- A glyph with ink in the last column stays as it is, because it has no room to grow.

### Consequences

- Good, because `<b>` and `font-weight: bold` give sharp text in every font
- Good, because a glyph added or redrawn in the regular style is bold in the next build
- Good, because the rule needs no list of letters
- Neutral, because each font directory gives two fonts, which doubles the files to download for a page that uses both
- Bad, because a few glyphs, such as `_`, `—`, `©` and `…`, look the same in both styles
- Bad, because a letter cannot be fixed by hand in the bold style only

### Confirmation

- Tests in `src/bold.test.ts` check the rule, and that the bold font is a bold face of the same family
- The demo page has a BOLD control that shows each view in bold

## Pros and Cons of the Options

### Generate the bold glyphs at build time

The build makes each bold glyph from the regular glyph with a fixed rule.

- Good, because every pixel stays a whole pixel
- Good, because it is the method of Spectrum programs
- Good, because new glyphs need no extra work
- Bad, because a rule cannot know the shape of a letter: where strokes are one pixel apart, the gap rule keeps a thin
  stroke instead

### Let the browser make bold text

No bold font. The browser makes bold text from the regular font, as it does today.

- Good, because there is nothing to build
- Bad, because the edges of the pixels get blurred, so the text is not sharp
- Bad, because each browser makes it in its own way

### Draw a bold glyph for each glyph by hand

A person draws a bold version of every glyph, in its own glyph files.

- Good, because each letter can get the best shape
- Bad, because it doubles the work for every glyph: 316 glyphs in each font today
- Bad, because each new or redrawn glyph needs a second drawing

## More Information

- The first rule added a pixel to the right of every lit pixel. It joined strokes that are one pixel apart: `m`, `w`,
  `ш`, `ж` and `ф` became blocks, and the dots of `ä` and `ё` became one line. The gap rule keeps them apart.
- 19 glyphs of the 316 in each font stay as they are: the 15 block graphics, and `_`, `©`, `—` and `…`, which have ink
  in the last column.
- An italic style would be generated in the same way, by moving rows to the side. It has its own problems, such as
  letters that already touch the left edge at the bottom, so it gets its own ADR.
- Revisit when a font gets a glyph whose bold shape the rule makes hard to read. Then allow a hand-drawn bold glyph that
  replaces the generated one, as a font's own glyphs replace included ones.
- Revisit when a font has strokes two pixels wide, such as a C64-style font. Bold from that font needs a different rule.
- Related: [ADR-0003](0003-characters-beyond-ascii.md) (the generate method) and
  [ADR-0001](0001-build-tool-and-language.md) (the build).
