import { readFileSync } from "node:fs";
import { Font, Glyph, Path } from "opentype.js/dist/opentype.mjs";
import type { GlyphFont } from "./glyphs.ts";

// The em is as wide as the font, so a pixel is 1/width of the font size and its edges are whole units. A taller font,
// such as 8×10, has the same pixel size: the same font sizes stay sharp, and its extra rows only add line height.
const PIXEL_UNITS = 128;

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};
const PROJECT_URL = "https://github.com/olecve/zxfnt";
const LICENSE =
  "This Font Software is licensed under the SIL Open Font License, Version 1.1. Glyphs that are not from this project keep the rights of their owners, see the copyright.";
const LICENSE_URL = `${PROJECT_URL}/blob/main/OFL.txt`;

// fsSelection bits of the OS/2 table.
const ITALIC = 1 << 0;
const BOLD = 1 << 5;
const REGULAR = 1 << 6;
const USE_TYPO_METRICS = 1 << 7;

type Rect = { x0: number; x1: number; y0: number; y1: number };

/** Fewer, larger rectangles make a smaller font than one square for each pixel. */
export function pixelRects(rows: boolean[][]): Rect[] {
  const done: Rect[] = [];
  let open = new Map<string, Rect>();
  rows.forEach((row, y) => {
    const next = new Map<string, Rect>();
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      const key = `${start}:${x + 1}`;
      const rect = open.get(key);
      if (rect) {
        rect.y1 = y + 1;
        open.delete(key);
        next.set(key, rect);
      } else {
        next.set(key, { x0: start, x1: x + 1, y0: y, y1: y + 1 });
      }
    }
    done.push(...open.values());
    open = next;
  });
  return [...done, ...open.values()];
}

export type Style = { bold?: boolean; italic?: boolean };

export function buildFont(source: GlyphFont, { bold = false, italic = false }: Style = {}): Font {
  const unit = PIXEL_UNITS;
  const advanceWidth = source.width * unit;
  // Pixel rows count down from the top. Font units count up from the baseline.
  const fontY = (row: number) => (source.baseline - row) * unit;
  // A font taller than it is wide has empty rows on top for accents. The line box moves down by half of these rows, so
  // that text sits in a line box where the square font puts it. The accents then use the empty bottom rows of the line
  // above.
  const lineShift = (source.height - source.width) / 2;
  // The strikeout is one pixel thick, on the row of the hyphen, so it stays sharp with text-decoration-thickness:
  // from-font. A font without a hyphen gets the middle row above the baseline.
  const hyphen = source.glyphs.find((g) => g.codePoint === 0x2d)?.rows.findIndex((row) => row.includes(true)) ?? -1;
  const strikeoutRow = hyphen >= 0 ? hyphen : Math.floor(source.baseline / 2);

  const notdef = new Path();
  // A hollow box, the usual shape for a missing character.
  box(notdef, unit, fontY(source.height - 1), advanceWidth - unit, fontY(1));
  box(notdef, 2 * unit, fontY(2), advanceWidth - 2 * unit, fontY(source.height - 2));

  const glyphs = [new Glyph({ name: ".notdef", advanceWidth, path: notdef })];
  for (const glyph of source.glyphs) {
    const path = new Path();
    for (const r of pixelRects(glyph.rows)) {
      box(path, r.x0 * unit, fontY(r.y1), r.x1 * unit, fontY(r.y0));
    }
    glyphs.push(
      new Glyph({
        name: glyphName(glyph.codePoint),
        unicode: glyph.codePoint,
        advanceWidth,
        path,
      }),
    );
  }

  return new Font({
    familyName: source.family,
    styleName: [bold && "Bold", italic && "Italic"].filter(Boolean).join(" ") || "Regular",
    version: `Version ${version}`,
    copyright: source.copyright,
    description: `An ${source.width}×${source.height} bitmap font, made into outlines by zxfnt: each pixel is a square.`,
    manufacturer: "zxfnt",
    manufacturerURL: PROJECT_URL,
    license: LICENSE,
    licenseURL: LICENSE_URL,
    unitsPerEm: source.width * PIXEL_UNITS,
    ascender: fontY(lineShift),
    descender: fontY(source.height + lineShift),
    weightClass: bold ? 700 : 400,
    // The slant of one pixel over the six rows of a capital, for the caret of text editors.
    italicAngle: italic ? -Math.round((Math.atan(1 / 6) * 180) / Math.PI) : 0,
    // Every glyph has the same width. PANOSE says the same: Latin text (2), monospaced (9).
    panose: [2, 0, 0, 9, 0, 0, 0, 0, 0, 0],
    tables: {
      // The underline is one pixel thick, on the row below the descenders, so it stays sharp. Browsers use it with
      // text-decoration-thickness: from-font and text-underline-position: from-font.
      post: { isFixedPitch: 1, underlinePosition: -unit, underlineThickness: unit },
      // USE_TYPO_METRICS (bit 7, from OS/2 version 4) makes Windows take the line height and position from the same
      // values as macOS, not from usWinAscent and usWinDescent, which only say where glyphs get clipped.
      os2: {
        version: 4,
        fsSelection: (italic ? ITALIC : 0) | (bold ? BOLD : 0) | (bold || italic ? 0 : REGULAR) | USE_TYPO_METRICS,
        yStrikeoutSize: unit,
        // The position is the top of the stroke.
        yStrikeoutPosition: fontY(strikeoutRow),
      },
    },
    glyphs,
  });
}

// Glyph names after the Adobe Glyph List rules: uni0041 for U+0041, and u1F600 above U+FFFF.
function glyphName(codePoint: number): string {
  const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");
  return codePoint > 0xffff ? `u${hex}` : `uni${hex}`;
}

// Adds a rectangle from corner (x0, y0) to corner (x1, y1). With x0 < x1 and y0 < y1 the contour is
// counter-clockwise, the outer direction for CFF outlines. With y0 > y1 it is clockwise and cuts a hole.
function box(path: Path, x0: number, y0: number, x1: number, y1: number): void {
  path.moveTo(x0, y0);
  path.lineTo(x1, y0);
  path.lineTo(x1, y1);
  path.lineTo(x0, y1);
  path.close();
}
