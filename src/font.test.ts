// Round trip: builds each font, reads the .otf back, and checks that every glyph outline covers
// exactly the lit pixels of its glyph files.

import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "opentype.js/dist/opentype.mjs";
import { buildFont, pixelRects } from "./font.ts";
import { fontDirs, readGlyphFont } from "./glyphs.ts";

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

// node:test runs each test on its own and reports failures, so the promise that test() returns is not needed.
void test("pixelRects joins runs across rows", () => {
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

for (const path of await fontDirs()) {
  const source = await readGlyphFont(path);

  void test(`${path}: the .otf has the same pixels as the glyph files`, () => {
    const font = parse(buildFont(source).toArrayBuffer());
    const unit = font.unitsPerEm / source.width;
    const shift = (source.height - source.width) / 2;
    assert.equal(font.ascender, (source.baseline - shift) * unit);
    assert.equal(font.descender, (source.baseline - source.height - shift) * unit);

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
