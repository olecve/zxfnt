import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { COMPOSED_FILE, compose, composedText } from "./compose.ts";
import { formatGlyph, parseGlyphs, type Glyph } from "./glyphs.ts";

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

void test("compose removes a repeated row of a capital to make room for the mark", () => {
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

void test("the ring mark is one dot in the middle of the letter", () => {
  const { glyphs } = compose(list("U+00C5 Å = A ˚"), [A]);
  assert.equal(formatGlyph(glyphs[0]).split("\n")[1], "...XX...");
});

void test("compose keeps glyphs that the font already has and skips glyphs without a base letter", () => {
  const drawn = { codePoint: 0xc4, rows: A.rows };
  const result = compose(list("U+00C4 Ä = A ¨\nU+00D6 Ö = O ¨"), [A, drawn]);
  assert.deepEqual(result.glyphs, []);
  assert.deepEqual(result.skipped, ["U+00D6 Ö: the font has no O"]);
});

void test("compose rejects a character that does not match its code point", () => {
  assert.throws(() => compose(list("U+00E4 ö = o ¨"), [A]), /list\.txt:1: ö is not U\+00E4/);
});

for (const dir of await readdir("fonts")) {
  void test(`fonts/${dir}/${COMPOSED_FILE} is up to date (run "npm run compose")`, async () => {
    const { text } = await composedText(join("fonts", dir));
    const current = await readFile(join("fonts", dir, COMPOSED_FILE), "utf8").catch(() => undefined);
    assert.equal(current, text);
  });
}
