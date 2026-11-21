# Plain Text Glyph Format As The Single Source

## Status

Proposed

## Context and Problem Statement

Fonts come from several sources: a classic 8×8 ASCII font of 96 characters, PNG images and glyphs that a person draws.
One font can mix sources. For example, a font can have its own capitals and use the lowercase of another font.

The character codes of old 8-bit fonts are not always Unicode: a code such as `0x5E` can be `↑` instead of `^`.

In which form should the project keep glyphs, so that the build has one input for all sources?

## Decision Drivers

- Must hold glyphs from every source, so one font can mix sources
- Must map each glyph to a Unicode code point
- Easy to read and edit by hand
- Useful git diffs that show which pixels changed
- Simple to parse

## Considered Options

- Own plain text format with `X` and `.`
- BDF, the X11 bitmap font format
- Raw binary, 768 bytes
- PNG font sheet

## Decision Outcome

Chosen option: "Own plain text format with `X` and `.`", because it is the only option that shows the glyph shape in a
text editor, gives a useful diff and has an explicit code point for each glyph.

Every source is converted into glyph files first. The build reads only these files. A font is a directory, for example
`fonts/zxfnt/`. Its `font.txt` has the header:

```
# The 8×8 ASCII font
name: zxfnt
family: zxfnt
size: 8x8
baseline: 7
```

Each other `.txt` file in the directory has glyphs from one source, for example `ascii.txt` with the 96 ASCII glyphs,
and `extra.txt` drawn by hand:

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

`X` is a lit pixel and `.` is an empty pixel. A glyph starts with its code point and the character. The build checks
that the character is the one of the code point. An invisible character, such as the space, has only the code point. A
blank line separates two glyphs. `#` starts a comment. `baseline: 7` means rows 0–6 are on or above the baseline, and
row 7 has the descenders.

The build merges all glyph files of a font and stops with an error when two files have the same code point. A future
importer, such as one for PNG images, can then write its whole file again without touching glyphs that a person drew.

The header can also `include` glyph files of another font, with paths relative to the font directory. When this font is
taller, the build adds empty rows on top of the included glyphs ([ADR-0004](0004-taller-variant-for-accents.md)). An
optional `copyright` goes into the metadata of the font file. Other keys are an error, so a typo does not go unnoticed.

### Consequences

- Good, because a future importer has one task: it writes a glyph file
- Good, because fonts are text in the repository, and git shows each change
- Good, because one font can mix sources easily
- Good, because glyphs from different sources are in different files, so one source cannot overwrite another
- Bad, because no other tool reads this format
- Bad, because the format holds only 1-bit glyphs of one size, so colours are lost

### Confirmation

- The ASCII font is in glyph files, and the build makes a font from them
- Hand-drawn and generated glyphs are in separate glyph files, and the build makes one font from them

## Pros and Cons of the Options

### Own plain text format with `X` and `.`

Each glyph is its code point and 8 lines of `X` and `.`.

- Good, because the glyph shape is visible in any text editor
- Good, because a git diff shows the changed pixels
- Good, because each glyph has an explicit code point
- Good, because the parser is simple
- Neutral, because the build can export BDF later if another tool needs it
- Bad, because the format is new and needs its own short documentation

### BDF, the X11 bitmap font format

A standard text format for bitmap fonts.

- Good, because other tools read it, such as Bits'N'Picas
- Bad, because each row is hex, such as `3C`, so a person cannot see or edit the shape directly
- Bad, because each glyph has many header lines

### Raw binary, 768 bytes

The usual format of 8-bit fonts: 96 characters in a fixed order, 8 bytes each.

- Good, because it is small and many 8-bit fonts are shared this way
- Bad, because it has no code points
- Bad, because a text editor cannot edit it, and a git diff shows nothing useful

### PNG font sheet

An image with all characters in a grid.

- Good, because any pixel editor can edit it
- Bad, because a git diff of an image shows nothing useful
- Bad, because the order of the characters is not in the file

## More Information

- PNG stays an import format. PNG can also be a preview output.
- Revisit when a font is not 8×8 monospace, for example 8×16, proportional or multi-colour. Then the format needs a
  width and a height for each glyph.
- Revisit when editing in an image editor becomes the main way to work.
- Related: [ADR-0001](0001-build-tool-and-language.md) (the build that reads these files) and
  [ADR-0003](0003-characters-beyond-ascii.md) (extra glyphs in the same format).
- [BDF specification (Adobe, version 2.2)](https://adobe-type-tools.github.io/font-tech-notes/pdfs/5005.BDF_Spec.pdf)
