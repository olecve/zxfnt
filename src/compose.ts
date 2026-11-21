// Makes extra glyphs from character lists (docs/adr/0003-characters-beyond-ascii.md).
// A list line such as "U+00E4 ä = a ¨" makes ä from the font's own a and a diaeresis.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { codePointLabel, formatGlyph, readGlyphFont, type Glyph, type SourceFile } from "./glyphs.ts";

type Rows = boolean[][];

// Marks use rows 0 and 1, so the letter must start on row 2. A one-row mark goes on row 0, with an empty row below.
const MARK_ROWS = 2;

// Each mark draws itself on rows 0 and 1 above lit columns minX..maxX.
const MARKS: Record<string, (rows: Rows, minX: number, maxX: number) => void> = {
  // Two dots, one pixel inside each side of the letter.
  "¨": ([top], minX, maxX) => {
    top[minX + 1] = true;
    top[maxX - 1] = true;
  },
  // A dot in the middle instead of a ring, because a ring does not fit: one pixel above an odd width, two pixels above
  // an even width.
  "˚": ([top], minX, maxX) => {
    top[Math.floor((minX + maxX) / 2)] = true;
    top[Math.ceil((minX + maxX) / 2)] = true;
  },
  // A wave four pixels wide, on the letter.
  "˜": ([top, bottom], minX, maxX) => {
    const x = Math.floor((minX + maxX) / 2) - 1;
    top[x + 1] = top[x + 3] = true;
    bottom[x] = bottom[x + 2] = true;
  },
  // A small v, on the letter: three pixels wide above an odd width, four above an even width.
  ˇ: ([top, bottom], minX, maxX) => {
    const left = Math.floor((minX + maxX) / 2);
    const right = Math.ceil((minX + maxX) / 2);
    top[left - 1] = top[right + 1] = true;
    bottom[left] = bottom[right] = true;
  },
};

const LINE = /^U\+([0-9A-F]{4,6})\s+(\S)\s+=\s+(\S)(?:\s+(\S))?$/;

const firstLitRow = (rows: Rows) => rows.findIndex((row) => row.includes(true));

// Moves the top of the letter down one row for each row it removes. It removes the highest row that is the same as the
// row below it, so that A, O and U stay the same shape, only shorter. Returns undefined when no row can go.
function makeRoom(rows: Rows, top: number): Rows | undefined {
  const result = rows.map((row) => [...row]);
  for (let lit = firstLitRow(result); lit < top; lit++) {
    const y = result.findIndex(
      (row, i) => i >= lit && i + 1 < result.length && row.includes(true) && row.join() === result[i + 1].join(),
    );
    if (y < 0) return undefined;
    result.splice(y, 1);
    result.unshift(result[0].map(() => false));
  }
  return result;
}

function addMark(base: Rows, mark: string): Rows | string | undefined {
  const draw = MARKS[mark];
  if (!draw) return `unknown mark "${mark}"`;
  const rows = makeRoom(base, MARK_ROWS);
  if (!rows) return undefined;
  const columns = rows[0].map((_, x) => rows.some((row) => row[x]));
  const minX = columns.indexOf(true);
  const maxX = columns.lastIndexOf(true);
  draw(rows, minX, maxX);
  return rows;
}

// Composes each glyph of the list that the font does not have yet. Glyphs whose base letter is missing are skipped.
export function compose(list: SourceFile, glyphs: Glyph[]): { glyphs: Glyph[]; skipped: string[] } {
  const byChar = new Map(glyphs.map((g) => [String.fromCodePoint(g.codePoint), g]));
  const result: Glyph[] = [];
  const skipped: string[] = [];
  list.text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) return;
    const fail = (message: string): never => {
      throw new Error(`${list.path}:${i + 1}: ${message}`);
    };
    const match = LINE.exec(line) ?? fail(`expected a line such as "U+00E4 ä = a ¨", got "${line}"`);
    const [, hex, char, baseChar, mark] = match;
    const codePoint = parseInt(hex, 16);
    if (String.fromCodePoint(codePoint) !== char) fail(`${char} is not U+${hex}`);
    if (byChar.has(char)) return;
    const base = byChar.get(baseChar);
    if (!base) {
      skipped.push(`${codePointLabel(codePoint)} ${char}: the font has no ${baseChar}`);
      return;
    }
    const rows = mark === undefined ? base.rows.map((row) => [...row]) : addMark(base.rows, mark);
    if (typeof rows === "string") fail(`${char}: ${rows}`);
    else if (rows === undefined)
      skipped.push(`${codePointLabel(codePoint)} ${char}: no room for the mark above ${baseChar}`);
    else result.push({ codePoint, rows });
  });
  return { glyphs: result, skipped };
}

export const COMPOSED_FILE = "composed.txt";
const SETS_DIR = "sets";

// The text of composed.txt for a font directory, from every list in sets/. Undefined when the font gets no glyphs.
export async function composedText(dir: string): Promise<{ text: string | undefined; skipped: string[] }> {
  const font = await readGlyphFont(dir, [COMPOSED_FILE]);
  const names = (await readdir(SETS_DIR)).filter((name) => name.endsWith(".txt")).sort();
  const glyphs = [...font.glyphs];
  const lines: string[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    const path = join(SETS_DIR, name);
    const result = compose({ path, text: await readFile(path, "utf8") }, glyphs);
    glyphs.push(...result.glyphs);
    skipped.push(...result.skipped);
    for (const glyph of result.glyphs) lines.push("", formatGlyph(glyph));
  }
  if (lines.length === 0) return { text: undefined, skipped };
  const header = `# Generated by "npm run compose" from the lists in ${SETS_DIR}/. Do not edit: to change a glyph, draw it in\n# another file of this font and compose again.`;
  return { text: `${header}\n${lines.join("\n")}\n`, skipped };
}
