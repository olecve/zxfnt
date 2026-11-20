// The ROM does not store the block graphics of codes 128-143: it builds each one from the four bits of its code when it
// prints it. So they are generated here too, for the cell of each font, and not imported.

// The demo page runs blockText in the browser, so this module imports nothing.

// The Unicode block element for each set of lit quarters: bit 0 top left, 1 top right, 2 bottom left, 3 bottom right.
// Nothing lit is the space, which every font already has.
const BLOCKS: Record<number, number> = {
  0b0001: 0x2598,
  0b0010: 0x259d,
  0b0011: 0x2580,
  0b0100: 0x2596,
  0b0101: 0x258c,
  0b0110: 0x259e,
  0b0111: 0x259b,
  0b1000: 0x2597,
  0b1001: 0x259a,
  0b1010: 0x2590,
  0b1011: 0x259c,
  0b1100: 0x2584,
  0b1101: 0x2599,
  0b1110: 0x259f,
  0b1111: 0x2588,
};

/** The quarters fill the whole cell, so that blocks of the next cell or line join them without a gap. */
export function blockGlyphs(width: number, height: number): { codePoint: number; rows: boolean[][] }[] {
  return Object.entries(BLOCKS).map(([bits, codePoint]) => {
    const lit = (x: number, y: number) => (Number(bits) >> ((y < height / 2 ? 0 : 2) + (x < width / 2 ? 0 : 1))) & 1;
    const rows = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => lit(x, y) === 1));
    return { codePoint, rows };
  });
}

/** Two rows and two columns of pixels make one block character, as Spectrum programs printed big titles. */
export function blockText(rows: boolean[][]): string[] {
  const lines: string[] = [];
  for (let y = 0; y < rows.length; y += 2) {
    let line = "";
    for (let x = 0; x < rows[y].length; x += 2) {
      const bits = [rows[y][x], rows[y][x + 1], rows[y + 1]?.[x], rows[y + 1]?.[x + 1]].reduce(
        (sum, lit, i) => sum + (lit ? 1 << i : 0),
        0,
      );
      line += bits === 0 ? " " : String.fromCodePoint(BLOCKS[bits]);
    }
    lines.push(line);
  }
  return lines;
}
