// The italic glyphs are made from the regular ones by moving their upper rows one pixel to the right, as 8-bit
// programs slanted text: whole pixels stay sharp, and a cell 8 pixels wide has room for one step (docs/adr/0008-generated-italic.md).

import { isBlock } from "./blocks.ts";
import type { GlyphFont } from "./glyphs.ts";

/**
 * The rows above the middle of the capitals move. Block graphics stay upright, so that they still join their
 * neighbours. So does a glyph with ink in the last column of those rows, such as ©: it has no room to move.
 */
export function italicFont(font: GlyphFont): GlyphFont {
  const upper = (y: number) => y < font.baseline - 3;
  const glyphs = font.glyphs.map((glyph) => {
    if (isBlock(glyph.codePoint) || glyph.rows.some((row, y) => upper(y) && row[font.width - 1])) return glyph;
    return { ...glyph, rows: glyph.rows.map((row, y) => (upper(y) ? [false, ...row.slice(0, -1)] : row)) };
  });
  return { ...font, name: `${font.name}-italic`, glyphs };
}
