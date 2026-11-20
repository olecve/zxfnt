import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGlyphFont, parseGlyphs, parseHeader, readGlyphFont } from "./glyphs.ts";

describe("parseHeader", () => {
  it("rejects an unknown or repeated key", () => {
    const header = (extra: string) => ({
      path: "font.txt",
      text: `name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n${extra}\n`,
    });
    assert.throws(() => parseHeader(header("inculde: ../a/rom.txt")), /font\.txt:5: unknown key "inculde"/);
    assert.throws(() => parseHeader(header("name: u")), /font\.txt:5: "name" is set twice/);
  });

  it("rejects a name or family with unsafe characters", () => {
    const header = (name: string, family: string) => ({
      path: "font.txt",
      text: `name: ${name}\nfamily: ${family}\nsize: 8x8\nbaseline: 7\n`,
    });
    assert.throws(() => parseHeader(header("../x", "X")), /name must be lowercase letters/);
    assert.throws(() => parseHeader(header("x", 'X"</style>')), /family must not contain/);
    assert.equal(parseHeader(header("zx-rom-tall", "ZX Spectrum ROM Tall")).name, "zx-rom-tall");
  });
});

describe("parseGlyphs", () => {
  it("rejects a code point outside Unicode", () => {
    const glyph = (hex: string) => ({ path: "a.txt", text: `U+${hex}\n` + "........\n".repeat(8) });
    assert.throws(() => parseGlyphs(glyph("110000"), 8, 8), /a\.txt:1: U\+110000 is not a Unicode character/);
    assert.throws(() => parseGlyphs(glyph("D800"), 8, 8), /is not a Unicode character/);
    assert.equal(parseGlyphs(glyph("1F600"), 8, 8)[0].codePoint, 0x1f600);
  });
});

describe("parseGlyphFont", () => {
  const header = (size: string) => ({ path: "font.txt", text: `name: t\nfamily: T\nsize: ${size}\nbaseline: 7\n` });

  it("rejects a size of zero", () => {
    assert.throws(() => parseGlyphFont(header("0x8"), []), /size must be at least 1x1/);
  });

  it("rejects a code point that two files define", () => {
    const glyph = "U+0041 A\n" + "........\n".repeat(8);
    assert.throws(
      () =>
        parseGlyphFont(header("8x8"), [
          { path: "a.txt", text: glyph },
          { path: "b.txt", text: glyph },
        ]),
      /b\.txt: U\+0041 is also in a\.txt/,
    );
  });
});

describe("readGlyphFont", () => {
  it("adds empty rows on top of an included glyph file in a taller font", async () => {
    const rom = await readGlyphFont("fonts/zx-rom");
    const tall = await readGlyphFont("fonts/zx-rom-tall");
    const a = (font: typeof rom) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
    assert.equal(tall.height - rom.height, 2);
    assert.deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(rom)]);
  });
});
