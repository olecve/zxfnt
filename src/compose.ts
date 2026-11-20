// A list line such as "U+00E4 ä = a ¨" makes ä from the font's own a and a diaeresis (docs/adr/0003-characters-beyond-ascii.md).

import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { codePointLabel, fontDirs, formatGlyph, readGlyphFont, type Glyph, type SourceFile } from "./glyphs.ts";

type Rows = boolean[][];

// A capital that starts above this row loses a repeated row, so that a mark fits above it.
const MARK_ROWS = 2;

type Shape = { x: number; rows: string[]; onLetter?: boolean };

// Each mark gives its shapes for a letter with lit columns minX..maxX, best first. A shape goes above the letter with
// one empty row between them. A shape that is onLetter may also sit directly on the letter when the gap does not fit.
const MARKS: Record<string, (minX: number, maxX: number) => Shape[]> = {
  // Two dots, one pixel inside each side of the letter. Above a letter only three pixels wide, the dots are on its
  // sides. A narrower letter has no room for two dots.
  "¨": (minX, maxX) => {
    const width = maxX - minX + 1;
    if (width >= 5) return [{ x: minX + 1, rows: ["X" + ".".repeat(width - 4) + "X"] }];
    if (width >= 3) return [{ x: minX, rows: ["X" + ".".repeat(width - 2) + "X"] }];
    return [];
  },
  // A ring, or a dot in the middle when the ring does not fit: one pixel above an odd width, two above an even width.
  "˚": (minX, maxX) => {
    const odd = (minX + maxX) % 2 === 0;
    const left = Math.floor((minX + maxX) / 2);
    return [
      odd ? { x: left - 1, rows: [".X.", "X.X", ".X."] } : { x: left - 1, rows: [".XX.", "X..X", ".XX."] },
      { x: left, rows: [odd ? "X" : "XX"] },
    ];
  },
  "˜": (minX, maxX) => [{ x: Math.floor((minX + maxX) / 2) - 1, rows: [".X.X", "X.X."], onLetter: true }],
  ˇ: (minX, maxX) => {
    const odd = (minX + maxX) % 2 === 0;
    const left = Math.floor((minX + maxX) / 2);
    return [
      odd
        ? { x: left - 1, rows: ["X.X", ".X."], onLetter: true }
        : { x: left - 1, rows: ["X..X", ".XX."], onLetter: true },
    ];
  },
  // Above a narrow letter the breve is as wide as the letter, so that it is never as narrow as the caron.
  "˘": (minX, maxX) => {
    const width = maxX - minX + 1;
    const [x, inner] = width - 2 >= 4 ? [minX + 1, width - 4] : [minX, width - 2];
    return [{ x, rows: ["X" + ".".repeat(inner) + "X", "." + "X".repeat(inner) + "."], onLetter: true }];
  },
};

// The u flag makes \S match one character, also one above U+FFFF.
const LINE = /^U\+([0-9A-F]{4,6})\s+(\S)\s+=\s+(\S)(?:\s+(\S))?$/u;

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

function draw(rows: Rows, shape: Shape, y: number): Rows {
  const result = rows.map((row) => [...row]);
  shape.rows.forEach((line, dy) => [...line].forEach((c, dx) => c === "X" && (result[y + dy][shape.x + dx] = true)));
  return result;
}

function markRow(rows: Rows, shape: Shape): number | undefined {
  if (shape.x < 0 || shape.x + Math.max(...shape.rows.map((r) => r.length)) > rows[0].length) return undefined;
  const top = firstLitRow(rows);
  const height = shape.rows.length;
  if (top - 1 - height >= 0) return top - 1 - height;
  if (shape.onLetter && top - height >= 0) return top - height;
  return undefined;
}

function addMark(base: Rows, mark: string): Rows | string | undefined {
  const shapes = MARKS[mark];
  if (!shapes) return `unknown mark "${mark}"`;
  const columns = base[0].map((_, x) => base.some((row) => row[x]));
  for (const shape of shapes(columns.indexOf(true), columns.lastIndexOf(true))) {
    for (const rows of [base, makeRoom(base, MARK_ROWS)]) {
      const y = rows && markRow(rows, shape);
      if (rows && y !== undefined) return draw(rows, shape, y);
    }
  }
  return undefined;
}

/** A glyph that the font already has is kept, so that a drawn glyph wins over the list. */
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

/** A font that gets no composed glyphs loses its composed.txt, so that no stale glyphs stay in it. */
export async function composeAll(): Promise<string[]> {
  const log: string[] = [];
  for (const dir of await fontDirs()) {
    const path = join(dir, COMPOSED_FILE);
    const { text, skipped } = await composedText(dir);
    for (const reason of skipped) log.push(`${dir}: skipped ${reason}`);
    if (text === undefined) {
      await rm(path, { force: true });
    } else {
      await writeFile(path, text);
      log.push(`-> ${path}`);
    }
  }
  return log;
}
