// 8-bit programs printed bold text by drawing each letter again one pixel to the right, so the bold glyphs are made
// the same way from the regular ones and not drawn (docs/adr/0007-generated-bold.md).

import type { GlyphFont } from "./glyphs.ts";

const isBlock = (codePoint: number) => codePoint >= 0x2580 && codePoint <= 0x259f;

/**
 * A pixel is added only where it leaves a gap to the next stroke, so that m, ш and the dots of ä stay apart. Block
 * graphics stay as they are, so that they still join their neighbours. So does a glyph with ink in the last column,
 * such as _ or a long dash: it has no room to grow.
 */
export function boldFont(font: GlyphFont): GlyphFont {
  const glyphs = font.glyphs.map((glyph) => {
    if (isBlock(glyph.codePoint) || glyph.rows.some((row) => row[font.width - 1])) return glyph;
    return { ...glyph, rows: glyph.rows.map((row) => row.map((lit, x) => lit || (row[x - 1] && !row[x + 1]))) };
  });
  return { ...font, name: `${font.name}-bold`, glyphs };
}
