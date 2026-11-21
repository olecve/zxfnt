// Parser for the plain text glyph format (docs/adr/0002-plain-text-glyph-format.md).
// A font is a directory: font.txt has the header, and every other .txt file has glyphs. The header can also include
// glyph files of another font, which get empty rows on top when this font is taller.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
  // Glyph files of other fonts, relative to the font directory.
  include: string[];
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
  const include = (header.get("include") ?? "").split(/\s+/).filter(Boolean);
  return { name: required("name"), family: required("family"), width, height, baseline, include };
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

export const codePointLabel = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;

// The glyph format text of one glyph, without a blank line around it.
export function formatGlyph({ codePoint, rows }: Glyph): string {
  const char = codePoint === 0x20 ? "" : ` ${String.fromCodePoint(codePoint)}`;
  return [`${codePointLabel(codePoint)}${char}`, ...rows.map((row) => row.map((p) => (p ? "X" : ".")).join(""))].join(
    "\n",
  );
}

// Merges the header with the glyphs of all glyph files, sorted by code point. `included` are glyphs of other fonts,
// already the size of this font.
export function parseGlyphFont(
  header: SourceFile,
  glyphFiles: SourceFile[],
  included: { path: string; glyphs: Glyph[] }[] = [],
): GlyphFont {
  const font = parseHeader(header);
  const seen = new Map<number, string>();
  const glyphs: Glyph[] = [];
  const files = [
    ...included,
    ...glyphFiles.map((file) => ({ path: file.path, glyphs: parseGlyphs(file, font.width, font.height) })),
  ];
  for (const file of files) {
    for (const glyph of file.glyphs) {
      const other = seen.get(glyph.codePoint);
      if (other !== undefined) throw new Error(`${file.path}: ${codePointLabel(glyph.codePoint)} is also in ${other}`);
      seen.set(glyph.codePoint, file.path);
      glyphs.push(glyph);
    }
  }
  glyphs.sort((a, b) => a.codePoint - b.codePoint);
  return { ...font, glyphs };
}

const FONTS_DIR = "fonts";

// The font directories in fonts/, sorted. Files such as .DS_Store are left out.
export async function fontDirs(): Promise<string[]> {
  const entries = await readdir(FONTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FONTS_DIR, entry.name))
    .sort();
}

// Reads a font directory. Glyph files named in `skip` are left out.
export async function readGlyphFont(dir: string, skip: string[] = []): Promise<GlyphFont> {
  const read = async (name: string): Promise<SourceFile> => {
    const path = join(dir, name);
    return { path, text: await readFile(path, "utf8") };
  };
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".txt") && name !== HEADER_FILE && !skip.includes(name))
    .sort();
  const header = await read(HEADER_FILE);
  const font = parseHeader(header);
  const included = await Promise.all(font.include.map((path) => readIncluded(join(dir, path), font)));
  return parseGlyphFont(header, await Promise.all(names.map(read)), included);
}

// Reads a glyph file of another font and adds empty rows on top, so that its glyphs are as tall as `font`.
async function readIncluded(path: string, font: FontHeader): Promise<{ path: string; glyphs: Glyph[] }> {
  const fontFile = join(dirname(path), HEADER_FILE);
  const other = parseHeader({ path: fontFile, text: await readFile(fontFile, "utf8") });
  const extra = font.height - other.height;
  if (other.width !== font.width || extra < 0 || font.baseline - other.baseline !== extra) {
    throw new Error(
      `${path}: a ${other.width}x${other.height} font cannot be included in a ${font.width}x${font.height} font with the same baseline`,
    );
  }
  const glyphs = parseGlyphs({ path, text: await readFile(path, "utf8") }, other.width, other.height).map((glyph) => ({
    codePoint: glyph.codePoint,
    rows: [...Array.from({ length: extra }, () => Array<boolean>(font.width).fill(false)), ...glyph.rows],
  }));
  return { path, glyphs };
}
