// The data that the glyph editor server sends and receives (docs/adr/0005-glyph-editor.md). This module runs in Node and
// in the browser, so it imports nothing.

/** A glyph file of a font, as the editor sees it. */
export type EditorFile = {
  path: string;
  /** False for read-only files, such as ascii.txt and composed.txt. */
  writable: boolean;
  /** True for a file of another font, named in the `include` header. */
  included: boolean;
};

/** A glyph with its rows of "X" and ".", and the path of the file that it comes from. */
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

/** The body of a save: the glyph's rows go into `file`, a file name in the font's directory. */
export type SaveRequest = { font: string; file: string; codePoint: number; rows: string[] };
