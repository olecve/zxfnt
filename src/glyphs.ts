// Parser for the plain text glyph format (docs/adr/0002-plain-text-glyph-format.md).
// A font is a directory: font.txt has the header, and every other .txt file has glyphs. The header can also include
// glyph files of another font, which get empty rows on top when this font is taller.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type Glyph = {
  codePoint: number;
  /** rows[y][x] is true for a lit pixel. Row 0 is the top row. */
  rows: boolean[][];
};

export type FontHeader = {
  name: string;
  family: string;
  width: number;
  height: number;
  /** Index of the first row below the baseline. */
  baseline: number;
  /** Glyph files of other fonts, relative to the font directory. */
  include: string[];
  /** Copyright notice of the glyphs, for the font metadata. */
  copyright?: string;
};

export type GlyphFont = FontHeader & { glyphs: Glyph[] };

export type SourceFile = { path: string; text: string };

const HEADER_FILE = "font.txt";
// The u flag makes \S match one character, also one above U+FFFF.
const GLYPH_START = /^U\+([0-9A-F]{4,6})(?:\s+(\S))?$/u;
const HEADER = /^([a-z]+):\s*(.*)$/;
const HEADER_KEYS = ["name", "family", "size", "baseline", "include", "copyright"];

const failer =
  (source: string) =>
  (lineIndex: number, message: string): never => {
    throw new Error(`${source}:${lineIndex + 1}: ${message}`);
  };

const isSkipped = (line: string) => line === "" || line.startsWith("#");

export function parseHeader({ path, text }: SourceFile): FontHeader {
  const fail = failer(path);
  const header = new Map<string, { value: string; line: number }>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (isSkipped(line)) return;
    const match = HEADER.exec(line) ?? fail(i, `expected "key: value", got "${line}"`);
    if (!HEADER_KEYS.includes(match[1]))
      fail(i, `unknown key "${match[1]}", expected one of ${HEADER_KEYS.join(", ")}`);
    if (header.has(match[1])) fail(i, `"${match[1]}" is set twice`);
    header.set(match[1], { value: match[2].trim(), line: i });
  });

  const required = (key: string): string => {
    const entry = header.get(key);
    if (!entry) throw new Error(`${path}: missing header "${key}"`);
    return entry.value;
  };
  const failAt = (key: string, message: string) => fail(header.get(key)!.line, message);
  const size = /^(\d+)x(\d+)$/.exec(required("size")) ?? failAt("size", 'size must look like "8x8"');
  const width = Number(size[1]);
  const height = Number(size[2]);
  if (width < 1 || height < 1) failAt("size", "size must be at least 1x1");
  const baseline = Number(required("baseline"));
  if (!Number.isInteger(baseline) || baseline < 1 || baseline > height) {
    failAt("baseline", `baseline must be a row number from 1 to ${height}`);
  }
  const include = (header.get("include")?.value ?? "").split(/\s+/).filter(Boolean);
  // The name becomes a file name and the family goes into CSS and HTML, so both are limited to safe characters.
  const name = required("name");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
    failAt("name", `name must be lowercase letters, digits and hyphens, got "${name}"`);
  const family = required("family");
  if (/["'<>&\\]/.test(family)) failAt("family", `family must not contain quotes, <, >, & or \\, got "${family}"`);
  return { name, family, width, height, baseline, include, copyright: header.get("copyright")?.value };
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
    const codePoint = parseInt(match[1], 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      fail(i, `U+${match[1]} is not a Unicode character`);
    }
    // Invisible characters, such as the space, have no character after the code point.
    if (match[2] !== undefined && match[2] !== String.fromCodePoint(codePoint)) {
      fail(i, `${match[2]} is not U+${match[1]}`);
    }
    const rows: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const index = i + 1 + y;
      const text = (lines[index] ?? "").trim();
      if (!row.test(text)) {
        fail(index, `expected ${width} characters of "X" and "." for row ${y} of U+${match[1]}, got "${text}"`);
      }
      rows.push([...text].map((c) => c === "X"));
    }
    glyphs.push({ codePoint, rows });
    i += height;
  }
  return glyphs;
}

export const codePointLabel = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;

/** The glyph format text of one glyph, without a blank line around it. */
export function formatGlyph({ codePoint, rows }: Glyph): string {
  const char = codePoint === 0x20 ? "" : ` ${String.fromCodePoint(codePoint)}`;
  return [`${codePointLabel(codePoint)}${char}`, ...rows.map((row) => row.map((p) => (p ? "X" : ".")).join(""))].join(
    "\n",
  );
}

/**
 * Merges the header with the glyphs of all glyph files, sorted by code point. `included` are glyphs of other fonts,
 * already the size of this font. A glyph of the font's own files replaces an included glyph with the same code point.
 */
export function parseGlyphFont(
  header: SourceFile,
  glyphFiles: SourceFile[],
  included: { path: string; glyphs: Glyph[] }[] = [],
): GlyphFont {
  const font = parseHeader(header);
  const own = glyphFiles.map((file) => ({ path: file.path, glyphs: parseGlyphs(file, font.width, font.height) }));
  const byCodePoint = new Map<number, Glyph>();
  for (const files of [included, own]) {
    const seen = new Map<number, string>();
    for (const file of files) {
      for (const glyph of file.glyphs) {
        const other = seen.get(glyph.codePoint);
        if (other !== undefined)
          throw new Error(`${file.path}: ${codePointLabel(glyph.codePoint)} is also in ${other}`);
        seen.set(glyph.codePoint, file.path);
        byCodePoint.set(glyph.codePoint, glyph);
      }
    }
  }
  const glyphs = [...byCodePoint.values()].sort((a, b) => a.codePoint - b.codePoint);
  return { ...font, glyphs };
}

const FONTS_DIR = "fonts";

/** The font directories in fonts/, sorted. Files such as .DS_Store are left out. */
export async function fontDirs(): Promise<string[]> {
  const entries = await readdir(FONTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FONTS_DIR, entry.name))
    .sort();
}

/** Reads a font directory. Glyph files named in `skip` are left out. */
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
