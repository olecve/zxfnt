import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "opentype.js/dist/opentype.mjs";
import { boldFont } from "./bold.ts";
import { buildFont } from "./font.ts";
import { formatGlyph, parseGlyphFont } from "./glyphs.ts";

const font = (glyphs: string) =>
  parseGlyphFont({ path: "font.txt", text: "name: t\nfamily: T\nsize: 4x2\nbaseline: 1\n" }, [
    { path: "a.txt", text: glyphs },
  ]);
const bold = (glyphs: string) => boldFont(font(glyphs)).glyphs.map((g) => formatGlyph(g).split("\n").slice(1));

describe("boldFont", () => {
  it("adds a pixel to the right of each stroke", () => {
    deepEqual(bold("U+0041 A\nX...\n.X.."), [["XX..", ".XX."]]);
  });

  it("keeps a gap of one pixel between strokes", () => {
    deepEqual(bold("U+006D m\nX.X.\n...."), [["X.XX", "...."]]);
  });

  it("leaves block graphics and glyphs with ink in the last column as they are", () => {
    deepEqual(bold("U+005F _\n....\nXXXX\n\nU+2598 ▘\nXX..\n...."), [
      ["....", "XXXX"],
      ["XX..", "...."],
    ]);
  });

  it("is a bold face of the same family", () => {
    const source = font("U+0041 A\nX...\n....");
    const otf = parse(buildFont(boldFont(source), 700).toArrayBuffer());
    equal(boldFont(source).name, "t-bold");
    equal(otf.names.windows.fontFamily.en, "T");
    equal(otf.names.windows.fontSubfamily.en, "Bold");
    equal(otf.tables.os2.usWeightClass, 700);
    equal(otf.tables.os2.fsSelection, 0b1010_0000, "BOLD and USE_TYPO_METRICS");
  });
});
