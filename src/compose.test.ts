import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { COMPOSED_FILE, compose, composedText } from "./compose.ts";
import { fontDirs, formatGlyph, parseGlyphs, type Glyph } from "./glyphs.ts";

const glyph = (text: string): Glyph => parseGlyphs({ path: "test", text }, 8, 8)[0];
const list = (text: string) => ({ path: "list.txt", text });

const A = glyph(`U+0041 A
........
..XXXX..
.X....X.
.X....X.
.XXXXXX.
.X....X.
.X....X.
........`);

describe("compose", () => {
  it("removes a repeated row of a capital to make room for the mark", () => {
    const { glyphs } = compose(list("U+00C4 Ä = A ¨"), [A]);
    assert.equal(
      formatGlyph(glyphs[0]),
      `U+00C4 Ä
..X..X..
........
..XXXX..
.X....X.
.XXXXXX.
.X....X.
.X....X.
........`,
    );
  });

  it("makes the ring mark one dot in the middle of the letter when the ring does not fit", () => {
    const { glyphs } = compose(list("U+00C5 Å = A ˚"), [A]);
    assert.equal(formatGlyph(glyphs[0]).split("\n")[1], "...XX...");
  });

  it("makes the ring mark a ring when it fits with a gap above the letter", () => {
    const a = glyph(`U+0061 a
........
........
........
........
..XXX...
.....X..
..XXXX..
.X...X..`);
    const { glyphs } = compose(list("U+00E5 å = a ˚"), [a]);
    assert.equal(
      formatGlyph(glyphs[0]),
      `U+00E5 å
...X....
..X.X...
...X....
........
..XXX...
.....X..
..XXXX..
.X...X..`,
    );
  });

  it("keeps glyphs that the font already has and skips glyphs without a base letter", () => {
    const drawn = { codePoint: 0xc4, rows: A.rows };
    const result = compose(list("U+00C4 Ä = A ¨\nU+00D6 Ö = O ¨"), [A, drawn]);
    assert.deepEqual(result.glyphs, []);
    assert.deepEqual(result.skipped, ["U+00D6 Ö: the font has no O"]);
  });

  it("skips a capital that has no repeated row to remove", () => {
    const Z = glyph(`U+005A Z
........
.XXXXXX.
.....X..
....X...
...X....
..X.....
.XXXXXX.
........`);
    const result = compose(list("U+017D Ž = Z ˇ"), [Z]);
    assert.deepEqual(result.glyphs, []);
    assert.deepEqual(result.skipped, ["U+017D Ž: no room for the mark above Z"]);
  });

  it("fits the diaeresis on narrow letters, and skips a letter too narrow for two dots", () => {
    const narrow = (codePoint: number, row: string) => ({
      codePoint,
      rows: [0, 0, 1, 1, 1, 1, 1, 0].map((lit) => [...(lit ? row : "........")].map((c) => c === "X")),
    });
    const result = compose(list("U+00EF ï = ı ¨\nU+1E97 ẗ = t ¨"), [
      narrow(0x131, "..XXX..."),
      narrow(0x74, "...X...."),
    ]);
    assert.equal(formatGlyph(result.glyphs[0]).split("\n")[1], "..X.X...");
    assert.deepEqual(result.skipped, ["U+1E97 ẗ: no room for the mark above t"]);
  });

  it("skips a mark that would go outside the cell", () => {
    const edge = (codePoint: number, row: string) => ({
      codePoint,
      rows: [0, 0, 1, 1, 1, 1, 1, 0].map((lit) => [...(lit ? row : "........")].map((c) => c === "X")),
    });
    const result = compose(list("U+00F5 õ = o ˜\nU+00F1 ñ = n ˜"), [edge(0x6f, ".......X"), edge(0x6e, "X.......")]);
    assert.deepEqual(result.glyphs, []);
    assert.deepEqual(result.skipped, [
      "U+00F5 õ: no room for the mark above o",
      "U+00F1 ñ: no room for the mark above n",
    ]);
  });

  it("accepts a list line with a character above U+FFFF", () => {
    const { glyphs } = compose(list("U+1D400 𝐀 = A"), [A]);
    assert.deepEqual(glyphs, [{ codePoint: 0x1d400, rows: A.rows }]);
  });

  it("rejects a character that does not match its code point", () => {
    assert.throws(() => compose(list("U+00E4 ö = o ¨"), [A]), /list\.txt:1: ö is not U\+00E4/);
  });
});

const dirs = await fontDirs();

describe(COMPOSED_FILE, () => {
  for (const dir of dirs) {
    it(`of ${dir} is up to date (run "npm run compose")`, async () => {
      const { text } = await composedText(dir);
      const current = await readFile(join(dir, COMPOSED_FILE), "utf8").catch(() => undefined);
      assert.equal(current, text);
    });
  }
});
