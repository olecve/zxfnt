// Parser for the plain text glyph format (docs/adr/0002-plain-text-glyph-format.md).

export type Glyph = {
  codePoint: number;
  // rows[y][x] is true for a lit pixel. Row 0 is the top row.
  rows: boolean[][];
};

export type GlyphFont = {
  name: string;
  family: string;
  width: number;
  height: number;
  // Index of the first row below the baseline.
  baseline: number;
  glyphs: Glyph[];
};

const GLYPH_START = /^U\+([0-9A-F]{4,6})(?:\s|$)/;
const HEADER = /^([a-z]+):\s*(.*)$/;

export function parseGlyphFont(text: string, source: string): GlyphFont {
  const lines = text.split(/\r?\n/);
  const header = new Map<string, string>();
  const glyphs: Glyph[] = [];
  const seen = new Set<number>();
  const fail = (lineIndex: number, message: string): never => {
    throw new Error(`${source}:${lineIndex + 1}: ${message}`);
  };

  let i = 0;
  // The header ends at the first glyph.
  for (; i < lines.length && !GLYPH_START.test(lines[i]); i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = HEADER.exec(line) ?? fail(i, `expected "key: value" or a glyph, got "${line}"`);
    header.set(match[1], match[2].trim());
  }

  const required = (key: string): string => header.get(key) ?? fail(0, `missing header "${key}"`);
  const size = /^(\d+)x(\d+)$/.exec(required("size")) ?? fail(0, 'size must look like "8x8"');
  const width = Number(size[1]);
  const height = Number(size[2]);
  const baseline = Number(required("baseline"));
  if (!Number.isInteger(baseline) || baseline < 1 || baseline > height) {
    fail(0, `baseline must be a row number from 1 to ${height}`);
  }

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = GLYPH_START.exec(line) ?? fail(i, `expected a glyph such as "U+0041 A", got "${line}"`);
    const codePoint = parseInt(match[1], 16);
    if (seen.has(codePoint)) fail(i, `duplicate glyph U+${match[1]}`);
    seen.add(codePoint);

    const rows: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const index = i + 1 + y;
      const row = (lines[index] ?? "").trim();
      if (!new RegExp(`^[X.]{${width}}$`).test(row)) {
        fail(index, `expected ${width} characters of "X" and "." for row ${y} of U+${match[1]}, got "${row}"`);
      }
      rows.push([...row].map((c) => c === "X"));
    }
    glyphs.push({ codePoint, rows });
    i += height;
  }

  return { name: required("name"), family: required("family"), width, height, baseline, glyphs };
}
