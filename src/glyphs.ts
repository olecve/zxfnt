// Parser for the plain text glyph format (docs/adr/0002-plain-text-glyph-format.md).
// A font is a directory: font.txt has the header, and every other .txt file has glyphs.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type Glyph = {
  codePoint: number;
  // rows[y][x] is true for a lit pixel. Row 0 is the top row.
  rows: boolean[][];
};

export type FontHeader = {
  name: string;
  family: string;
  width: number;
  height: number;
  // Index of the first row below the baseline.
  baseline: number;
};

export type GlyphFont = FontHeader & { glyphs: Glyph[] };

export type SourceFile = { path: string; text: string };

const HEADER_FILE = "font.txt";
const GLYPH_START = /^U\+([0-9A-F]{4,6})(?:\s|$)/;
const HEADER = /^([a-z]+):\s*(.*)$/;

const failer =
  (source: string) =>
  (lineIndex: number, message: string): never => {
    throw new Error(`${source}:${lineIndex + 1}: ${message}`);
  };

const isSkipped = (line: string) => line === "" || line.startsWith("#");

export function parseHeader({ path, text }: SourceFile): FontHeader {
  const fail = failer(path);
  const header = new Map<string, string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (isSkipped(line)) return;
    const match = HEADER.exec(line) ?? fail(i, `expected "key: value", got "${line}"`);
    header.set(match[1], match[2].trim());
  });

  const required = (key: string): string => header.get(key) ?? fail(0, `missing header "${key}"`);
  const size = /^(\d+)x(\d+)$/.exec(required("size")) ?? fail(0, 'size must look like "8x8"');
  const width = Number(size[1]);
  const height = Number(size[2]);
  const baseline = Number(required("baseline"));
  if (!Number.isInteger(baseline) || baseline < 1 || baseline > height) {
    fail(0, `baseline must be a row number from 1 to ${height}`);
  }
  return { name: required("name"), family: required("family"), width, height, baseline };
}

export function parseGlyphs({ path, text }: SourceFile, width: number, height: number): Glyph[] {
  const fail = failer(path);
  const lines = text.split(/\r?\n/);
  const glyphs: Glyph[] = [];
  const row = new RegExp(`^[X.]{${width}}$`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isSkipped(line)) continue;
    const match = GLYPH_START.exec(line) ?? fail(i, `expected a glyph such as "U+0041 A", got "${line}"`);
    const rows: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const index = i + 1 + y;
      const text = (lines[index] ?? "").trim();
      if (!row.test(text)) {
        fail(index, `expected ${width} characters of "X" and "." for row ${y} of U+${match[1]}, got "${text}"`);
      }
      rows.push([...text].map((c) => c === "X"));
    }
    glyphs.push({ codePoint: parseInt(match[1], 16), rows });
    i += height;
  }
  return glyphs;
}

// Merges the header with the glyphs of all glyph files, sorted by code point.
export function parseGlyphFont(header: SourceFile, glyphFiles: SourceFile[]): GlyphFont {
  const font = parseHeader(header);
  const seen = new Map<number, string>();
  const glyphs: Glyph[] = [];
  for (const file of glyphFiles) {
    for (const glyph of parseGlyphs(file, font.width, font.height)) {
      const label = `U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
      const other = seen.get(glyph.codePoint);
      if (other !== undefined) throw new Error(`${file.path}: ${label} is also in ${other}`);
      seen.set(glyph.codePoint, file.path);
      glyphs.push(glyph);
    }
  }
  glyphs.sort((a, b) => a.codePoint - b.codePoint);
  return { ...font, glyphs };
}

export async function readGlyphFont(dir: string): Promise<GlyphFont> {
  const read = async (name: string): Promise<SourceFile> => {
    const path = join(dir, name);
    return { path, text: await readFile(path, "utf8") };
  };
  const names = (await readdir(dir)).filter((name) => name.endsWith(".txt") && name !== HEADER_FILE).sort();
  return parseGlyphFont(await read(HEADER_FILE), await Promise.all(names.map(read)));
}
