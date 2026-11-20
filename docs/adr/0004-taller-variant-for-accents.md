# Taller Variant For Accents

## Status

Proposed

## Context and Problem Statement

In an 8×8 cell, capitals use rows 1–6 and lowercase letters start on row 2, so accents have little space
([ADR-0003](0003-characters-beyond-ascii.md)). The 8×8 ROM font makes three compromises:

- Capitals with a mark lose a row: `Ä`, `Ö` and `Õ` are 5 rows high, other capitals are 6
- Two-row marks touch the letter: `õ`, `š`, `ž`, `Õ`
- `å` and `Å` have a dot instead of a ring, and `Š` and `Ž` are drawn by hand, 5 rows high

How can a page show accented letters without these compromises, and still keep the original 8×8 look available?

## Decision Drivers

- The 8×8 fonts must stay true to the originals
- Accented capitals at full height, with an empty row between the mark and the letter
- The same font sizes must stay sharp ([README](../../README.md#using-a-font))
- No second copy of glyph files that must be kept in sync by hand

## Considered Options

- A second font in an 8×10 cell
- A second font in an 8×11 cell
- One font with accents drawn above the 8×8 cell

## Decision Outcome

Chosen option: "A second font in an 8×10 cell", because it removes the compromises for all capitals and lowercase
letters with the smallest change in line height, and the 8×8 font stays as it is.

`fonts/zx-rom-tall/` is the ROM font with two empty rows on top. Its `font.txt` includes the glyph files of the 8×8
font, and the build adds the empty rows:

```
name: zx-rom-tall
family: ZX Spectrum ROM Tall
size: 8x10
baseline: 9
include: ../zx-rom/rom.txt ../zx-rom/extra.txt
```

Its own `composed.txt` is made by the same character lists. The compose step places each mark relative to the top of the
letter, so the same rules give the 8×8 compromises and the 8×10 full-height letters.

A pixel is 1/8 of the font size in both fonts, because the builder takes the pixel size from the width. Text in both
fonts has the same size, and the extra rows only make the lines 1.25 times taller.

The line box of the tall font moves down by one row, half of its extra rows. Text then sits in a button or a bar exactly
where the 8×8 font puts it, and does not move down when a page changes the font. The accents use the empty bottom row of
the line above, because descenders use only one row.

### Consequences

- Good, because accented capitals are full height, every mark has an empty row below it, and `å` has a ring
- Good, because the 8×8 font does not change
- Good, because the tall font has no copied glyphs: a change to `rom.txt` goes into both fonts
- Neutral, because a page chooses between the two fonts, one for the original look and one for text with accents
- Bad, because lines are 1.25 times taller, so the text looks less like a Spectrum screen
- Bad, because `Å` still has a dot: a ring needs three rows and a gap, and capitals start on row 3

### Confirmation

- The round-trip test checks the pixels of both fonts
- A test checks that an included glyph gets two empty rows on top

## Pros and Cons of the Options

### A second font in an 8×10 cell

Two empty rows on top of every glyph.

- Good, because one-row and two-row marks fit above capitals with a gap
- Good, because a three-row ring fits above lowercase letters with a gap
- Bad, because a ring above a capital does not fit

### A second font in an 8×11 cell

Three empty rows on top of every glyph.

- Good, because a ring fits above capitals too
- Bad, because lines are 1.375 times taller, and most marks do not need the third row

### One font with accents drawn above the 8×8 cell

The accented glyphs go above the ascender of the 8×8 font.

- Good, because there is only one font, and the line height does not change
- Bad, because with the default line height, a mark touches the descenders of `g`, `j` and `y` on the line above
- Bad, because every page must set a line height of 1.25 or more

## More Information

- `include` is a header key of the glyph format ([ADR-0002](0002-plain-text-glyph-format.md)). An included file must
  have the same width and the same number of rows below the baseline.
- `short-caps.txt` of the 8×8 font has the hand-drawn `Š` and `Ž`. The tall font does not include it and composes these
  letters instead.
- Revisit when a font needs a ring above a capital or stacked marks. Then use an 8×11 cell or a new ADR.
- Revisit when game fonts get a tall variant. A game font with taller letters may need more than two extra rows.
