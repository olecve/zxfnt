import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGlyphFont, parseGlyphs, parseHeader, readGlyphFont } from "./glyphs.ts";

describe("parseHeader", () => {
  it("rejects an unknown or repeated key", () => {
    const header = (extra: string) => ({
      path: "font.txt",
      text: `name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n${extra}\n`,
    });
    throws(() => parseHeader(header("inculde: ../a/square.txt")), /font\.txt:5: unknown key "inculde"/);
    throws(() => parseHeader(header("name: u")), /font\.txt:5: "name" is set twice/);
  });

  it("rejects a name or family with unsafe characters", () => {
    const header = (name: string, family: string) => ({
      path: "font.txt",
      text: `name: ${name}\nfamily: ${family}\nsize: 8x8\nbaseline: 7\n`,
    });
    throws(() => parseHeader(header("../x", "X")), /font\.txt:1: name must be lowercase letters/);
    throws(() => parseHeader(header("x", 'X"</style>')), /font\.txt:2: family must not contain/);
    equal(parseHeader(header("zxfnt-tall", "zxfnt Tall")).name, "zxfnt-tall");
  });

  it("reports a missing key without a line number", () => {
    throws(() => parseHeader({ path: "font.txt", text: "name: t\nsize: 8x8\nbaseline: 7\n" }), {
      message: 'font.txt: missing header "family"',
    });
  });
});

describe("parseGlyphs", () => {
  it("rejects a code point outside Unicode", () => {
    const glyph = (hex: string) => ({ path: "a.txt", text: `U+${hex}\n` + "........\n".repeat(8) });
    throws(() => parseGlyphs(glyph("110000"), 8, 8), /a\.txt:1: U\+110000 is not a Unicode character/);
    throws(() => parseGlyphs(glyph("D800"), 8, 8), /is not a Unicode character/);
    equal(parseGlyphs(glyph("1F600"), 8, 8)[0].codePoint, 0x1f600);
  });

  it("rejects a character that does not match its code point", () => {
    const glyph = (start: string) => ({ path: "a.txt", text: `${start}\n` + "........\n".repeat(8) });
    throws(() => parseGlyphs(glyph("U+0041 B"), 8, 8), /a\.txt:1: B is not U\+0041/);
    throws(() => parseGlyphs(glyph("U+0041 A B"), 8, 8), /expected a glyph such as/);
    equal(parseGlyphs(glyph("U+1F600 😀"), 8, 8)[0].codePoint, 0x1f600);
    equal(parseGlyphs(glyph("U+0020"), 8, 8)[0].codePoint, 0x20);
  });
});

describe("parseGlyphFont", () => {
  const header = (size: string) => ({ path: "font.txt", text: `name: t\nfamily: T\nsize: ${size}\nbaseline: 7\n` });

  it("rejects a size of zero", () => {
    throws(() => parseGlyphFont(header("0x8"), []), /font\.txt:3: size must be at least 1x1/);
  });

  it("rejects a code point that two files define", () => {
    const glyph = "U+0041 A\n" + "........\n".repeat(8);
    throws(
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
    const square = await readGlyphFont("fonts/zxfnt");
    const tall = await readGlyphFont("fonts/zxfnt-tall");
    const a = (font: typeof square) => font.glyphs.find((g) => g.codePoint === 0x41)!.rows;
    equal(tall.height - square.height, 2);
    deepEqual(a(tall), [Array(8).fill(false), Array(8).fill(false), ...a(square)]);
  });
});
