import { formatGlyph } from "./glyphs.ts";

const ROM_SIZE = 16384;
const ROM_FONT_ADDRESS = 0x3d00;
const FONT_SIZE = 96 * 8;
const FIRST_CODE = 0x20;

// Spectrum codes that are not ASCII.
const UNICODE: Record<number, number> = { 0x5e: 0x2191, 0x60: 0x00a3, 0x7f: 0x00a9 };

export function fontBytes(file: Uint8Array): Uint8Array {
  if (file.length === ROM_SIZE) return file.subarray(ROM_FONT_ADDRESS, ROM_FONT_ADDRESS + FONT_SIZE);
  if (file.length === FONT_SIZE) return file;
  throw new Error(`expected a ${ROM_SIZE}-byte ROM or a ${FONT_SIZE}-byte font, got ${file.length} bytes`);
}

export function glyphText(font: Uint8Array, comment: string): string {
  const lines = comment.split("\n").map((line) => `# ${line}`);
  for (let i = 0; i < FONT_SIZE / 8; i++) {
    const code = FIRST_CODE + i;
    const codePoint = UNICODE[code] ?? code;
    const rows = [...font.subarray(i * 8, i * 8 + 8)].map((byte) =>
      [...Array(8).keys()].map((x) => (byte & (0x80 >> x)) !== 0),
    );
    lines.push("");
    if (codePoint !== code) lines.push(`# ROM code 0x${code.toString(16).toUpperCase()}`);
    lines.push(formatGlyph({ codePoint, rows }));
  }
  return lines.join("\n") + "\n";
}
