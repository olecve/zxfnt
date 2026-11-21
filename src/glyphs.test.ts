import assert from "node:assert/strict";
import { test } from "node:test";
import { readGlyphFont } from "./glyphs.ts";

void test("an included glyph file gets empty rows on top in a taller font", async () => {
  const square = await readGlyphFont("fonts/zxfnt");
  const tall = await readGlyphFont("fonts/zxfnt-tall");
  const a = (font: typeof square) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
  assert.equal(tall.height - square.height, 2);
  assert.deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(square)]);
});
