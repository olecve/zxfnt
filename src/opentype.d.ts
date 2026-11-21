// opentype.js 2.0 ships no types, and its package entry is CommonJS without named exports, so zxfnt
// imports the ES module build directly. These types cover only the parts that zxfnt uses.

declare module "opentype.js/dist/opentype.mjs" {
  export class Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    close(): void;
  }

  export class Glyph {
    constructor(options: { name: string; unicode?: number; advanceWidth: number; path: Path });
    name: string;
    unicode?: number;
    advanceWidth: number;
    path: Path;
  }

  export class Font {
    constructor(options: {
      familyName: string;
      styleName: string;
      version?: string;
      copyright?: string;
      description?: string;
      manufacturer?: string;
      manufacturerURL?: string;
      license?: string;
      licenseURL?: string;
      unitsPerEm: number;
      ascender: number;
      descender: number;
      weightClass?: number;
      panose?: number[];
      tables?: { post?: Record<string, number>; os2?: Record<string, number> };
      glyphs: Glyph[];
    });
    glyphs: { length: number };
    names: { windows: Record<string, { en: string }> };
    unitsPerEm: number;
    ascender: number;
    descender: number;
    tables: { post: Record<string, number>; os2: Record<string, number> & { panose: number[] } };
    charToGlyph(char: string): Glyph & { path: { commands: { type: string; x?: number; y?: number }[] } };
    toArrayBuffer(): ArrayBuffer;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
