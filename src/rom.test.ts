import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGlyphFont } from "./glyphs.ts";
import { fontBytes, glyphText } from "./rom.ts";

const header = { path: "font.txt", text: "name: t\nfamily: T\nsize: 8x8\nbaseline: 7\n" };

describe("glyphText", () => {
  it("maps Spectrum codes to Unicode and keeps the pixels", () => {
    const font = new Uint8Array(768);
    font.set([0x00, 0x3c, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x00], (0x41 - 0x20) * 8);
    const glyphs = parseGlyphFont(header, [{ path: "rom.txt", text: glyphText(font, "test") }]).glyphs;
    const codePoints = glyphs.map((g) => g.codePoint);
    equal(glyphs.length, 96);
    ok(codePoints.includes(0x2191) && codePoints.includes(0xa3) && codePoints.includes(0xa9));
    ok(!codePoints.includes(0x5e) && !codePoints.includes(0x60) && !codePoints.includes(0x7f));
    const a = glyphs.find((g) => g.codePoint === 0x41)!;
    deepEqual(
      a.rows.map((row) => row.map((p) => (p ? "X" : ".")).join("")),
      ["........", "..XXXX..", ".X....X.", ".X....X.", ".XXXXXX.", ".X....X.", ".X....X.", "........"],
    );
  });
});

describe("fontBytes", () => {
  it("takes the font from 0x3D00 of a ROM", () => {
    const rom = new Uint8Array(16384);
    rom[0x3d00] = 0xff;
    equal(fontBytes(rom)[0], 0xff);
    equal(fontBytes(rom).length, 768);
    throws(() => fontBytes(new Uint8Array(100)), /100 bytes/);
  });
});
