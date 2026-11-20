import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGlyphs, parseHeader, readGlyphFont } from "./glyphs.ts";

void test("an included glyph file gets empty rows on top in a taller font", async () => {
  const rom = await readGlyphFont("fonts/zx-rom");
  const tall = await readGlyphFont("fonts/zx-rom-tall");
  const a = (font: typeof rom) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
  assert.equal(tall.height - rom.height, 2);
  assert.deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(rom)]);
});

void test("a header with an unknown or repeated key is rejected", () => {
  const header = (extra: string) => ({
    path: "font.txt",
    text: `name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n${extra}\n`,
  });
  assert.throws(() => parseHeader(header("inculde: ../a/rom.txt")), /font\.txt:5: unknown key "inculde"/);
  assert.throws(() => parseHeader(header("name: u")), /font\.txt:5: "name" is set twice/);
});

void test("a name or family with unsafe characters is rejected", () => {
  const header = (name: string, family: string) => ({
    path: "font.txt",
    text: `name: ${name}\nfamily: ${family}\nsize: 8x8\nbaseline: 7\n`,
  });
  assert.throws(() => parseHeader(header("../x", "X")), /name must be lowercase letters/);
  assert.throws(() => parseHeader(header("x", 'X"</style>')), /family must not contain/);
  assert.equal(parseHeader(header("zx-rom-tall", "ZX Spectrum ROM Tall")).name, "zx-rom-tall");
});

void test("a code point outside Unicode is rejected", () => {
  const glyph = (hex: string) => ({ path: "a.txt", text: `U+${hex}\n` + "........\n".repeat(8) });
  assert.throws(() => parseGlyphs(glyph("110000"), 8, 8), /a\.txt:1: U\+110000 is not a Unicode character/);
  assert.throws(() => parseGlyphs(glyph("D800"), 8, 8), /is not a Unicode character/);
  assert.equal(parseGlyphs(glyph("1F600"), 8, 8)[0].codePoint, 0x1f600);
});
