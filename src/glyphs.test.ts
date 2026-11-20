import assert from "node:assert/strict";
import { test } from "node:test";
import { readGlyphFont } from "./glyphs.ts";

void test("an included glyph file gets empty rows on top in a taller font", async () => {
  const rom = await readGlyphFont("fonts/zx-rom");
  const tall = await readGlyphFont("fonts/zx-rom-tall");
  const a = (font: typeof rom) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
  assert.equal(tall.height - rom.height, 2);
  assert.deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(rom)]);
});
