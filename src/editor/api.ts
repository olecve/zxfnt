// This module runs in Node and in the browser, so it imports nothing.

export type EditorFile = {
  path: string;
  /** False for generated files, such as rom.txt and composed.txt. */
  writable: boolean;
  /** True for a file of another font, named in the `include` header. */
  included: boolean;
};

export type EditorGlyph = { codePoint: number; rows: string[]; file: string };

export type EditorFont = {
  name: string;
  dir: string;
  family: string;
  width: number;
  height: number;
  baseline: number;
  files: EditorFile[];
  glyphs: EditorGlyph[];
};

/** `file` is a file name in the font's directory, not a path. */
export type SaveRequest = { font: string; file: string; codePoint: number; rows: string[] };
