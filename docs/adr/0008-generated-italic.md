# Generated Italic Style

## Status

Accepted

## Context and Problem Statement

After the bold style ([ADR-0007](0007-generated-bold.md)), the fonts still have no italic. When a page asks for italic
text, for example with `<em>`, `<i>` or `font-style: italic`, Chrome slants the outlines itself. Each pixel becomes a
slanted shape with soft edges, so the text is no longer sharp.

8-bit programs slanted text by moving rows of a letter to the side by whole pixels. A cell 8 pixels wide, with letters
in columns 1–6, has room for one step to the right.

Georgian has no italic tradition with its own letter forms. Emphasis is mostly Mtavruli or bold, but slanted Georgian is
used too.

How do the fonts get an italic style that stays exact to the pixel grid?

## Decision Drivers

- Italic text must stay sharp, with whole pixels
- Must work with plain HTML and CSS: `<em>` and `font-style: italic` pick it up, also together with bold
- Must cover every glyph of every font, also glyphs added later
- No repeated hand work for each glyph
- Every letter must keep its shape: nothing may be cut at the edge of the cell

## Considered Options

- One step: the upper rows move one pixel to the right
- Two steps: the upper rows move one pixel to the right, and the lower rows one pixel to the left
- Let the browser slant the text
- Draw an italic glyph for each glyph by hand

## Decision Outcome

Chosen option: "One step: the upper rows move one pixel to the right", because it is the only generated slant that fits
every letter in the cell, and it gives the classic 8-bit italic look.

`src/italic.ts` makes the italic glyphs from the regular ones, and the build writes two more fonts for each font
directory: italic and bold italic, such as `zxfnt-italic` and `zxfnt-bold-italic`. They have the same family name as the
regular font, with `font-style: italic`, so the browser picks them for italic text.

- The rows above the middle of the capitals move one pixel to the right: rows 0–3 in the 8×8 font and rows 0–5 in the
  8×10 font, so the step is at the same height in both.
- Block graphics stay upright, so that they still join their neighbours.
- A glyph with ink in the last column of the upper rows stays upright, because it has no room to move. Of the letters
  and signs, only `©` does.
- Bold italic is the bold rule of ADR-0007 on the italic glyphs. Which glyphs stay as they are is decided from the
  upright glyph, because the slant moves ink into the last column.
- Every script slants, Georgian too. Mixed text slants evenly, and Georgian text gets the oblique that Georgian uses.

### Consequences

- Good, because `<em>`, `<i>` and `font-style: italic` give sharp text in every font, also bold
- Good, because a glyph added or redrawn in the regular style is italic in the next build
- Good, because no letter needs a fix by hand
- Neutral, because each font directory now gives four fonts
- Bad, because the slant is one pixel: small letters move only their top row, so they lean less than capitals
- Bad, because a letter cannot be fixed by hand in the italic style only

### Confirmation

- Tests in `src/italic.test.ts` check the rule, bold italic, and that the fonts are italic faces of the same family
- The demo page has an ITALIC control that works together with BOLD in each view

## Pros and Cons of the Options

### One step: the upper rows move one pixel to the right

- Good, because every letter fits: only `©` and the block graphics reach the last column in the upper rows
- Good, because it is how 8-bit programs slanted text
- Bad, because one step gives a small slant

### Two steps: the upper rows move one pixel to the right, and the lower rows one pixel to the left

- Good, because two steps give a stronger, smoother slant
- Bad, because glyphs that touch the left edge at the bottom would be cut: 10 in the 8×8 font, such as `Ж`, `Ш`, `Ы`,
  `Ю`, `ლ`, `ღ` and `_`, and 20 in the 8×10 font, also `თ`, `ო`, `რ` and `€`. Each would need a fix by hand

### Let the browser slant the text

- Good, because there is nothing to build
- Bad, because the edges of the pixels get blurred and slanted, so the text is not sharp

### Draw an italic glyph for each glyph by hand

- Good, because letters could get true italic shapes, such as a one-storey `a`
- Bad, because it adds 316 drawings to each font, and twice that with bold italic
- Bad, because Cyrillic italic and Georgian need their own shapes, which is more work than the rest of the project

## More Information

- The italic angle in the fonts is −9°, one pixel over the six rows of a capital. Text editors use it to slant the
  caret.
- Revisit when a font gets a cell wider than 8 pixels, or letters with two free columns on the right. Then two steps to
  the right fit.
- Revisit when a slanted letter is hard to read. Then allow a hand-drawn italic glyph that replaces the generated one,
  as ADR-0007 says for bold.
- Related: [ADR-0007](0007-generated-bold.md) (the bold style) and [ADR-0003](0003-characters-beyond-ascii.md) (the
  generate method).
- [W3C: Georgian layout requirements](https://w3c.github.io/eurlreq/geor/)
