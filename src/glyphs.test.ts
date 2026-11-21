import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHeader, readGlyphFont } from "./glyphs.ts";

void test("an included glyph file gets empty rows on top in a taller font", async () => {
  const square = await readGlyphFont("fonts/zxfnt");
  const tall = await readGlyphFont("fonts/zxfnt-tall");
  const a = (font: typeof square) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
  assert.equal(tall.height - square.height, 2);
  assert.deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(square)]);
});

void test("a header with an unknown or repeated key is rejected", () => {
  const header = (extra: string) => ({
    path: "font.txt",
    text: `name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n${extra}\n`,
  });
  assert.throws(() => parseHeader(header("inculde: ../a/square.txt")), /font\.txt:5: unknown key "inculde"/);
  assert.throws(() => parseHeader(header("name: u")), /font\.txt:5: "name" is set twice/);
});
