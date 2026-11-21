// Turns a glyph font into an OpenType font: each lit pixel becomes a square.

import { readFileSync } from "node:fs";
import { Font, Glyph, Path } from "opentype.js/dist/opentype.mjs";
import type { GlyphFont } from "./glyphs.ts";

// A pixel is 128 font units, and the em is as wide as the font, so a pixel is 1/width of the font size. Pixel edges are
// then whole units for any width. A taller font, such as 8×10, has the same pixel size, so the same font sizes stay
// sharp, and its extra rows only add line height.
const PIXEL_UNITS = 128;

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};
const PROJECT_URL = "https://github.com/olecve/zxfnt";
const LICENSE =
  "This Font Software is licensed under the SIL Open Font License, Version 1.1. Glyphs that are not from this project keep the rights of their owners, see the copyright.";
const LICENSE_URL = `${PROJECT_URL}/blob/main/OFL.txt`;

// fsSelection bits of the OS/2 table.
const REGULAR = 1 << 6;
const USE_TYPO_METRICS = 1 << 7;

type Rect = { x0: number; x1: number; y0: number; y1: number };

// Joins lit pixels into rectangles: first runs along each row, then equal runs in the rows below.
// Fewer, larger rectangles make a smaller font than one square for each pixel.
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

export function buildFont(source: GlyphFont): Font {
  const unit = PIXEL_UNITS;
  const advanceWidth = source.width * unit;
  // Pixel rows count down from the top. Font units count up from the baseline.
  const fontY = (row: number) => (source.baseline - row) * unit;
  // A font taller than it is wide has empty rows on top for accents. The line box moves down by half of these rows, so
  // that text sits in a line box where the square font puts it. The accents then use the empty bottom rows of the line
  // above.
  const lineShift = (source.height - source.width) / 2;

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
        name: `uni${glyph.codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
        unicode: glyph.codePoint,
        advanceWidth,
        path,
      }),
    );
  }

  return new Font({
    familyName: source.family,
    styleName: "Regular",
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
    weightClass: 400,
    // Every glyph has the same width. PANOSE says the same: Latin text (2), monospaced (9).
    panose: [2, 0, 0, 9, 0, 0, 0, 0, 0, 0],
    tables: {
      // The underline is one pixel thick, on the row below the descenders, so it stays sharp. Browsers use it with
      // text-decoration-thickness: from-font and text-underline-position: from-font.
      post: { isFixedPitch: 1, underlinePosition: -unit, underlineThickness: unit },
      // USE_TYPO_METRICS (bit 7, from OS/2 version 4) makes Windows take the line height and position from the same
      // values as macOS, not from usWinAscent and usWinDescent, which only say where glyphs get clipped.
      os2: { version: 4, fsSelection: REGULAR | USE_TYPO_METRICS },
    },
    glyphs,
  });
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
