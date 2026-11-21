// Glyph data helpers of the editor, without any UI.

import { GLYPH_GROUPS, LANGUAGES } from "../scripts.ts";
import type { EditorFont, EditorGlyph } from "./api.ts";

export type Rows = boolean[][];

export const toRows = (text: string[]): Rows => text.map((line) => [...line].map((c) => c === "X"));
export const toText = (rows: Rows): string[] => rows.map((row) => row.map((p) => (p ? "X" : ".")).join(""));
export const emptyRows = (f: EditorFont): Rows =>
  Array.from({ length: f.height }, () => Array<boolean>(f.width).fill(false));
export const label = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
export const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
export const glyphOf = (f: EditorFont, cp: number): EditorGlyph | undefined => f.glyphs.find((g) => g.codePoint === cp);
export const fileOf = (f: EditorFont, path: string) => f.files.find((file) => file.path === path);
export const groupName = (cp: number) => GLYPH_GROUPS.find(([, matches]) => matches(cp))![0];

/** The rows moved by dx columns and dy rows. Pixels that move out of the cell are lost. */
export const shifted = (rows: Rows, dx: number, dy: number): Rows =>
  rows.map((row, y) => row.map((_, x) => rows[y - dy]?.[x - dx] ?? false));

/** The first row of the font's x, or five rows above the baseline when the font has no x. */
export function xHeightRow(f: EditorFont): number {
  const x = glyphOf(f, 0x78);
  const top = x ? x.rows.findIndex((row) => row.includes("X")) : -1;
  return top >= 0 ? top : f.baseline - 5;
}

/** The letters of the languages, from their alphabets and sample sentences, that the font does not have. */
export function missingCodePoints(f: EditorFont): number[] {
  const have = new Set(f.glyphs.map((g) => g.codePoint));
  const wanted = new Set(
    LANGUAGES.flatMap((l) =>
      [...(l.upper + l.lower + l.sample)].filter((c) => /\p{L}/u.test(c)).map((c) => c.codePointAt(0)!),
    ),
  );
  return [...wanted].filter((cp) => !have.has(cp)).sort((a, b) => a - b);
}

/**
 * A sample sentence with the character. When no sample has it, the sample of its script with the character in front, so
 * that it stands among letters of its own script.
 */
export function sampleFor(cp: number): string {
  const char = String.fromCodePoint(cp);
  const withChar = LANGUAGES.find((l) => l.sample.includes(char));
  if (withChar) return withChar.sample;
  const group = groupName(cp);
  const sameScript = LANGUAGES.find((l) =>
    [...l.sample].some((c) => /\p{L}/u.test(c) && groupName(c.codePointAt(0)!) === group),
  );
  return `${char}${char}${char} ${sameScript?.sample ?? "The quick brown fox"}`;
}

/** Splits text into lines of at most `width` characters, at spaces where possible. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const next = current === "" ? word : `${current} ${word}`;
    if ([...next].length > width && current !== "") {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  return [...lines, current];
}

/** Where a save goes, and what the editor tells about the glyph's source. */
export function saveTarget(f: EditorFont, cp: number): { file: string; canSave: boolean; note: string } {
  const glyph = glyphOf(f, cp);
  const suggested = `${groupName(cp).toLowerCase().replace(/\W+/g, "-")}.txt`;
  if (!glyph) return { file: suggested, canSave: true, note: "New glyph: the font does not have it yet." };
  const source = fileOf(f, glyph.file);
  if (source?.included) {
    return {
      file: suggested,
      canSave: true,
      note: `Included from ${glyph.file}. A save draws a separate version for this font.`,
    };
  }
  if (source?.writable) return { file: fileName(glyph.file), canSave: true, note: `From ${glyph.file}.` };
  if (fileName(glyph.file) === "composed.txt") {
    return { file: suggested, canSave: true, note: `Composed into ${glyph.file}. A save draws it by hand instead.` };
  }
  return {
    file: suggested,
    canSave: false,
    note: `${glyph.file} is read-only.`,
  };
}
