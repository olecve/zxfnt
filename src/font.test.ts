// Round trip: builds each font, reads the .otf back, and checks that every glyph outline covers
// exactly the lit pixels of its glyph files.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "opentype.js/dist/opentype.mjs";
import { buildFont, pixelRects } from "./font.ts";
import { fontDirs, parseGlyphFont, readGlyphFont } from "./glyphs.ts";

type Command = { type: string; x?: number; y?: number };

// Nonzero winding number of the point (x, y) for the closed polygons of a path of straight lines.
function winding(commands: Command[], x: number, y: number): number {
  let total = 0;
  let start = { x: 0, y: 0 };
  let prev = { x: 0, y: 0 };
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (a.y <= y && b.y > y && (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y) > 0) total++;
    if (a.y > y && b.y <= y && (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y) < 0) total--;
  };
  for (const c of commands) {
    if (c.type === "M") {
      start = prev = { x: c.x!, y: c.y! };
    } else if (c.type === "L") {
      const next = { x: c.x!, y: c.y! };
      edge(prev, next);
      prev = next;
    } else if (c.type === "Z") {
      edge(prev, start);
      prev = start;
    } else {
      assert.fail(`unexpected path command ${c.type}`);
    }
  }
  return total;
}

describe("pixelRects", () => {
  it("joins runs across rows", () => {
    const X = true;
    const _ = false;
    assert.deepEqual(
      pixelRects([
        [X, X, _],
        [X, X, _],
        [_, X, _],
      ]),
      [
        { x0: 0, x1: 2, y0: 0, y1: 2 },
        { x0: 1, x1: 2, y0: 2, y1: 3 },
      ],
    );
  });
});

const sources = await Promise.all(
  (await fontDirs()).map(async (path) => ({ path, source: await readGlyphFont(path) })),
);

describe("buildFont", () => {
  it("names glyphs uniXXXX, and uXXXXX above U+FFFF", () => {
    const header = { path: "font.txt", text: "name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n" };
    const glyph = (start: string) => `${start}\n` + "........\n".repeat(8);
    const files = [{ path: "a.txt", text: [glyph("U+0041 A"), glyph("U+1F600 😀")].join("\n") }];
    const font = parse(buildFont(parseGlyphFont(header, files)).toArrayBuffer());
    assert.equal(font.charToGlyph("A").name, "uni0041");
    assert.equal(font.charToGlyph("😀").name, "u1F600");
  });

  it("has whole font units for every pixel edge in a font that is not 8 pixels wide", () => {
    const header = { path: "font.txt", text: "name: six\nfamily: Six\nsize: 6x8\nbaseline: 7\n" };
    const glyph = { path: "a.txt", text: "U+0041 A\n" + ".XXXX.\n".repeat(8) };
    const font = parse(buildFont(parseGlyphFont(header, [glyph])).toArrayBuffer());
    assert.equal(font.unitsPerEm, 6 * 128);
    assert.equal(font.charToGlyph("A").advanceWidth, 6 * 128);
    const xs = font.charToGlyph("A").path.commands.flatMap((c) => (c.x === undefined ? [] : [c.x]));
    assert.deepEqual(
      [...new Set(xs)].sort((a, b) => a - b),
      [128, 640],
    );
  });

  for (const { path, source } of sources) {
    it(`${path}: the .otf has the same pixels as the glyph files`, () => {
      const font = parse(buildFont(source).toArrayBuffer());
      const unit = font.unitsPerEm / source.width;
      const shift = (source.height - source.width) / 2;
      assert.equal(font.ascender, (source.baseline - shift) * unit);
      assert.equal(font.descender, (source.baseline - source.height - shift) * unit);
      const names = font.names.windows;
      assert.equal(names.fontFamily.en, source.family);
      assert.equal(names.copyright.en, source.copyright ?? " ");
      assert.match(names.license.en, /^This Font Software is licensed under the SIL Open Font License/);
      assert.match(names.licenseURL.en, /\/OFL\.txt$/);
      assert.match(names.version.en, /^Version \d+\.\d+\.\d+$/);
      assert.equal(names.uniqueID.en, `zxfnt: ${source.family} Regular`);
      assert.equal(font.tables.os2.version, 4);
      assert.equal(font.tables.os2.fsSelection, 0b1100_0000, "REGULAR and USE_TYPO_METRICS");
      assert.equal(font.tables.os2.sTypoAscender, font.ascender, "typo metrics match hhea");
      assert.equal(font.tables.os2.sTypoDescender, font.descender, "typo metrics match hhea");
      assert.equal(font.tables.post.isFixedPitch, 1, "post table says monospace");
      assert.equal(font.tables.post.underlineThickness, unit, "underline is one pixel thick");
      assert.equal(font.tables.post.underlinePosition, -unit, "underline is on the row below the descenders");
      assert.equal(font.tables.os2.yStrikeoutSize, unit, "strikeout is one pixel thick");
      assert.equal(font.tables.os2.yStrikeoutPosition, 3 * unit, "strikeout is on the row of the hyphen");
      assert.deepEqual(font.tables.os2.panose, [2, 0, 0, 9, 0, 0, 0, 0, 0, 0], "PANOSE says monospace");

      for (const glyph of source.glyphs) {
        const otf = font.charToGlyph(String.fromCodePoint(glyph.codePoint));
        const label = `U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
        assert.equal(otf.unicode, glyph.codePoint, `${label} is in the cmap`);
        assert.equal(otf.advanceWidth, source.width * unit, `${label} advance width`);
        // CFF stores a path relative to the glyph origin, so sample the center of each pixel.
        const commands = otf.path.commands;
        const rows = glyph.rows.map((row, y) =>
          row.map((_, x) => winding(commands, (x + 0.5) * unit, (source.baseline - y - 0.5) * unit) !== 0),
        );
        assert.deepEqual(rows, glyph.rows, `${label} pixels`);
      }
    });
  }
});
