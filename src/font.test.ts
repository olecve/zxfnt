import { deepEqual, equal, fail, match } from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "opentype.js/dist/opentype.mjs";
import { compress, decompress } from "wawoff2";
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
      fail(`unexpected path command ${c.type}`);
    }
  }
  return total;
}

describe("pixelRects", () => {
  it("joins runs across rows", () => {
    const X = true;
    const _ = false;
    deepEqual(
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
    equal(font.charToGlyph("A").name, "uni0041");
    equal(font.charToGlyph("😀").name, "u1F600");
  });

  it("has whole font units for every pixel edge in a font that is not 8 pixels wide", () => {
    const header = { path: "font.txt", text: "name: six\nfamily: Six\nsize: 6x8\nbaseline: 7\n" };
    const glyph = { path: "a.txt", text: "U+0041 A\n" + ".XXXX.\n".repeat(8) };
    const font = parse(buildFont(parseGlyphFont(header, [glyph])).toArrayBuffer());
    equal(font.unitsPerEm, 6 * 128);
    equal(font.charToGlyph("A").advanceWidth, 6 * 128);
    const xs = font.charToGlyph("A").path.commands.flatMap((c) => (c.x === undefined ? [] : [c.x]));
    deepEqual(
      [...new Set(xs)].sort((a, b) => a - b),
      [128, 640],
    );
  });

  for (const { path, source } of sources) {
    it(`${path}: the .woff2 has the same glyphs and metrics as the .otf`, async () => {
      const otfBytes = new Uint8Array(buildFont(source).toArrayBuffer());
      const otf = parse(otfBytes.buffer);
      const woff2 = parse((await decompress(await compress(otfBytes))).slice().buffer);
      equal(woff2.unitsPerEm, otf.unitsPerEm);
      equal(woff2.ascender, otf.ascender);
      equal(woff2.descender, otf.descender);
      deepEqual(woff2.tables.post, otf.tables.post);
      deepEqual(woff2.tables.os2, otf.tables.os2);
      for (const glyph of source.glyphs) {
        const char = String.fromCodePoint(glyph.codePoint);
        deepEqual(woff2.charToGlyph(char).path.commands, otf.charToGlyph(char).path.commands, char);
      }
    });

    it(`${path}: the .otf has the same pixels as the glyph files`, () => {
      const font = parse(buildFont(source).toArrayBuffer());
      const unit = font.unitsPerEm / source.width;
      const shift = (source.height - source.width) / 2;
      equal(font.ascender, (source.baseline - shift) * unit);
      equal(font.descender, (source.baseline - source.height - shift) * unit);
      const names = font.names.windows;
      equal(names.fontFamily.en, source.family);
      equal(names.copyright.en, source.copyright ?? " ");
      equal(names.designer.en, "Oleg Tsvetkov");
      match(names.license.en, /^This Font Software is licensed under the SIL Open Font License/);
      match(names.licenseURL.en, /\/OFL\.txt$/);
      match(names.version.en, /^Version \d+\.\d+\.\d+$/);
      equal(names.uniqueID.en, `zxfnt: ${source.family} Regular`);
      equal(font.tables.os2.version, 4);
      equal(font.tables.os2.fsSelection, 0b1100_0000, "REGULAR and USE_TYPO_METRICS");
      equal(font.tables.os2.sTypoAscender, font.ascender, "typo metrics match hhea");
      equal(font.tables.os2.sTypoDescender, font.descender, "typo metrics match hhea");
      equal(font.tables.post.isFixedPitch, 1, "post table says monospace");
      equal(font.tables.post.underlineThickness, unit, "underline is one pixel thick");
      equal(font.tables.post.underlinePosition, -unit, "underline is on the row below the descenders");
      equal(font.tables.os2.yStrikeoutSize, unit, "strikeout is one pixel thick");
      equal(font.tables.os2.yStrikeoutPosition, 3 * unit, "strikeout is on the row of the hyphen");
      deepEqual(font.tables.os2.panose, [2, 0, 0, 9, 0, 0, 0, 0, 0, 0], "PANOSE says monospace");

      for (const glyph of source.glyphs) {
        const otf = font.charToGlyph(String.fromCodePoint(glyph.codePoint));
        const label = `U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
        equal(otf.unicode, glyph.codePoint, `${label} is in the cmap`);
        equal(otf.advanceWidth, source.width * unit, `${label} advance width`);
        // CFF stores a path relative to the glyph origin, so sample the center of each pixel.
        const commands = otf.path.commands;
        const rows = glyph.rows.map((row, y) =>
          row.map((_, x) => winding(commands, (x + 0.5) * unit, (source.baseline - y - 0.5) * unit) !== 0),
        );
        deepEqual(rows, glyph.rows, `${label} pixels`);
      }
    });
  }
});
