// 8-bit programs printed bold text by drawing each letter again one pixel to the right, so the bold glyphs are made
// the same way from the regular ones and not drawn (docs/adr/0007-generated-bold.md).

import { isBlock } from "./blocks.ts";
import type { GlyphFont } from "./glyphs.ts";

/**
 * A pixel is added only where it leaves a gap to the next stroke, so that m, ш and the dots of ä stay apart. Block
 * graphics stay as they are, so that they still join their neighbours. So does a glyph with ink in the last column,
 * such as _ or a long dash: it has no room to grow. For bold italic, the upright glyph decides that, because the
 * slant moves ink into the last column.
 */
export function boldFont(font: GlyphFont, upright = font): GlyphFont {
  const kept = new Set(
    upright.glyphs
      .filter((g) => isBlock(g.codePoint) || g.rows.some((row) => row[font.width - 1]))
      .map((g) => g.codePoint),
  );
  const glyphs = font.glyphs.map((glyph) => {
    if (kept.has(glyph.codePoint)) return glyph;
    return { ...glyph, rows: glyph.rows.map((row) => row.map((lit, x) => lit || (row[x - 1] && !row[x + 1]))) };
  });
  return { ...font, name: `${font.name}-bold`, glyphs };
}
