import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { blockGlyphs, blockText } from "./blocks.ts";
import { formatGlyph } from "./glyphs.ts";

describe("blockGlyphs", () => {
  it("makes the 15 block elements that have a lit quarter, each once", () => {
    const codePoints = blockGlyphs(8, 8).map((g) => g.codePoint);
    equal(new Set(codePoints).size, 15);
    deepEqual(String.fromCodePoint(...codePoints.toSorted((a, b) => a - b)), "▀▄█▌▐▖▗▘▙▚▛▜▝▞▟");
  });

  it("splits the whole cell into quarters, also a taller one", () => {
    const quarter = (width: number, height: number) =>
      formatGlyph(blockGlyphs(width, height).find((g) => g.codePoint === 0x259a)!);
    equal(quarter(8, 8), "U+259A ▚\nXXXX....\nXXXX....\nXXXX....\nXXXX....\n....XXXX\n....XXXX\n....XXXX\n....XXXX");
    equal(
      quarter(8, 10)
        .split("\n")
        .filter((row) => row === "XXXX....").length,
      5,
    );
  });
});

describe("blockText", () => {
  it("makes one block character of each 2×2 pixels", () => {
    const rows = ["XX.X", "X..X", "....", ".XX."].map((row) => [...row].map((c) => c === "X"));
    deepEqual(blockText(rows), ["▛▐", "▗▖"]);
  });
});
