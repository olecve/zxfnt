# Characters Beyond ASCII

## Status

Proposed

## Context and Problem Statement

8-bit fonts have only ASCII letters, digits and punctuation, often with a few symbols such as `£` and `©`. Each font
must be able to get more characters that look like the rest of the font. The first sets are Finnish and Cyrillic. More
sets can come later, so the method must not be specific to these two.

| Group                  | Examples                                         |
| ---------------------- | ------------------------------------------------ |
| Accented Latin letters | `ä ö å ü ß ł č`                                  |
| Other alphabets        | `Ж Я Ω`                                          |
| Symbols                | block graphics `▀ ▄ █`, box drawing, arrows, `€` |

An 8×8 cell has little space. Capitals use rows 1–6, so an accent above a capital has almost no space.

How do we add extra characters to every font without drawing each one by hand for each font?

## Decision Drivers

- Must look like the rest of each font
- Every new glyph is made in this project, not copied from another font
- Must give every font full coverage of each set it gets
- Must stay exact to the 8×8 pixel grid
- No repeated hand work for each font
- A new language without code changes

## Considered Options

- Character lists with compose, copy, generate, draw and borrow
- Draw each extra character by hand for each font
- OpenType mark attachment (`GPOS`) for accents

## Decision Outcome

Chosen option: "Character lists with compose, copy, generate, draw and borrow", because the tool makes most glyphs, each
new shape is drawn once, and every glyph stays a real 8×8 bitmap.

Each extra set is a character list that names its code points and the method for each glyph. Every method starts from
the font's own glyphs, the ASCII font, shared marks or new drawings made in this project. No glyph is copied from
another font.

1. **Compose**: a base letter and a mark make the glyph: `ä = a + ¨`, `å = a + ˚`, `Ё = Е + ¨`. For a capital, the base
   letter is made one row shorter to make space
2. **Copy**: a letter from another alphabet that looks the same as one in the font, such as `А`, `В` or `Α`, which look
   like Latin `A` and `B`
3. **Generate**: shapes from simple geometry, such as the 16 block graphics (2×2 grids of 4×4 squares)
4. **Draw**: by hand in this project, in the glyph format ([ADR-0002](0002-plain-text-glyph-format.md)), first for the
   ASCII font
5. **Borrow**: a font without its own version of a glyph uses the ASCII font glyph. The glyph file records the source,
   so a matching drawing can replace it later

### Consequences

- Good, because most new glyphs are made by the tool
- Good, because every font can show text in each added language from the start
- Good, because a new language is a new list, not new code
- Bad, because a borrowed glyph can look different from the rest of a font until a person draws a replacement
- Bad, because the tool needs a small set of marks, drawn as glyph fragments, that all fonts share
- Bad, because scripts that join letters and scripts that need many more pixels than 8×8 are out of scope

### Confirmation

- The ASCII font has all glyphs of the first sets
- A list for one more language can be added with no change to the code

## Pros and Cons of the Options

### Character lists with compose, copy, generate, draw and borrow

Each set is a list. Each glyph in the list says how the tool makes it.

- Good, because people draw only new shapes
- Good, because each font gets all characters at once
- Good, because a new language is a new list
- Neutral, because each composed glyph needs a check by a person
- Bad, because a borrowed glyph can look different from the rest of a font

### Draw each extra character by hand for each font

A person draws every extra glyph for every font.

- Good, because each glyph matches the style of its font
- Bad, because each set adds tens of glyphs to each font, and most of the work is the same each time

### OpenType mark attachment (`GPOS`) for accents

The font has the marks as separate glyphs, and the browser puts each mark on its letter.

- Good, because each combination of letter and accent works with no extra glyph
- Bad, because it is complex to build
- Bad, because the browser places the mark, so the result is not exact to the pixel grid

## More Information

- Milestone 2 adds the Finnish and Cyrillic lists to the ASCII font.
- Draw the shared marks (`¨`, `˚`, `˘` and others) as small glyph fragments.
- The block graphics are made with the generate method.
- Revisit when more than half of the composed glyphs need fixes by hand. Then draw those glyphs instead.
- Revisit when a language with stacked accents is added. That needs mark attachment or a taller cell, decided in a new
  ADR.
- Letting the browser use a different font for missing characters was dropped, because a smooth system font in the
  middle of pixel text looks broken.
- Related: [ADR-0001](0001-build-tool-and-language.md) (the build that runs the lists) and
  [ADR-0002](0002-plain-text-glyph-format.md) (the format of drawn and borrowed glyphs).
- [Unicode code charts](https://www.unicode.org/charts/)
- [Unicode Block Elements (U+2580–U+259F)](https://www.unicode.org/charts/PDF/U2580.pdf)
