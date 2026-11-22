import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "opentype.js/dist/opentype.mjs";
import { boldFont } from "./bold.ts";
import { buildFont } from "./font.ts";
import { formatGlyph, parseGlyphFont } from "./glyphs.ts";
import { italicFont } from "./italic.ts";

// Rows 0-1 are above the middle of the capitals, which end on row 4: baseline 5 minus 3.
const font = (glyphs: string) =>
  parseGlyphFont({ path: "font.txt", text: "name: t\nfamily: T\nsize: 4x6\nbaseline: 5\n" }, [
    { path: "a.txt", text: glyphs },
  ]);
const rows = (f: ReturnType<typeof font>) => f.glyphs.map((g) => formatGlyph(g).split("\n").slice(1));

describe("italicFont", () => {
  it("moves the upper rows one pixel to the right", () => {
    deepEqual(rows(italicFont(font("U+0049 I\nX...\nX...\nX...\nX...\nX...\n...."))), [
      [".X..", ".X..", "X...", "X...", "X...", "...."],
    ]);
  });

  it("leaves block graphics and glyphs with ink in the last column of the upper rows upright", () => {
    deepEqual(
      rows(
        italicFont(
          font("U+00A9 ©\n...X\n....\n....\n....\n....\n....\n\nU+2598 ▘\nXX..\nXX..\nXX..\n....\n....\n...."),
        ),
      ),
      [
        ["...X", "....", "....", "....", "....", "...."],
        ["XX..", "XX..", "XX..", "....", "....", "...."],
      ],
    );
  });

  it("makes bold italic bold, although the slant moves ink into the last column", () => {
    const source = font("U+0049 I\n..X.\n....\n....\n....\n....\n....");
    deepEqual(rows(boldFont(italicFont(source), source)), [["...X", "....", "....", "....", "....", "...."]]);
  });

  it("is an italic face of the same family", () => {
    const source = font("U+0049 I\nX...\n....\n....\n....\n....\n....");
    const italic = parse(buildFont(italicFont(source), { italic: true }).toArrayBuffer());
    equal(italic.names.windows.fontFamily.en, "T");
    equal(italic.names.windows.fontSubfamily.en, "Italic");
    equal(italic.tables.os2.usWeightClass, 400);
    equal(italic.tables.os2.fsSelection, 0b1000_0001, "ITALIC and USE_TYPO_METRICS");
    equal(italic.tables.post.italicAngle, -9);
    const boldItalic = parse(buildFont(source, { bold: true, italic: true }).toArrayBuffer());
    equal(boldItalic.names.windows.fontSubfamily.en, "Bold Italic");
    equal(boldItalic.tables.os2.fsSelection, 0b1010_0001, "ITALIC, BOLD and USE_TYPO_METRICS");
  });
});
