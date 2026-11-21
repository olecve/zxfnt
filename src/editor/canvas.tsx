// The canvases of the editor: the drawing grid, and text drawn in a font's own pixels. The reference letter is drawn only
// on the canvas as a guide, and is never saved.

import { useEffect, useRef } from "preact/hooks";
import type { EditorFont } from "./api.ts";
import { xHeightRow, type Rows } from "./model.ts";

const CELL = 40;

type GridProps = {
  font: EditorFont;
  codePoint: number;
  rows: Rows;
  referenceFont: string | undefined;
  /** Sets one pixel. A stroke starts with `start`, so that the rows before it go into the undo history. */
  onPaint: (x: number, y: number, value: boolean, start: boolean) => void;
};

export function Grid({ font, codePoint, rows, referenceFont, onPaint }: GridProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (canvas.current) drawGrid(canvas.current, font, codePoint, rows, referenceFont);
  });

  const cellAt = (event: PointerEvent) => [Math.floor(event.offsetX / CELL), Math.floor(event.offsetY / CELL)];

  return (
    <canvas
      ref={canvas}
      class="grid"
      onPointerDown={(event) => {
        const [x, y] = cellAt(event);
        if (rows[y]?.[x] === undefined) return;
        paint.current = !rows[y][x];
        event.currentTarget.setPointerCapture(event.pointerId);
        onPaint(x, y, paint.current, true);
      }}
      onPointerMove={(event) => {
        const [x, y] = cellAt(event);
        if (paint.current === undefined || rows[y]?.[x] === undefined || rows[y][x] === paint.current) return;
        onPaint(x, y, paint.current, false);
      }}
      onPointerUp={() => (paint.current = undefined)}
    />
  );
}

function drawGrid(canvas: HTMLCanvasElement, f: EditorFont, cp: number, rows: Rows, referenceFont: string | undefined) {
  const { width, height, baseline } = f;
  canvas.width = width * CELL;
  canvas.height = height * CELL;
  const ctx = canvas.getContext("2d")!;
  const xTop = xHeightRow(f);
  for (let y = 0; y < height; y++) {
    ctx.fillStyle = y >= baseline ? "#eef" : y < xTop ? "#fef4f4" : "#fff";
    ctx.fillRect(0, y * CELL, width * CELL, CELL);
  }
  if (referenceFont !== undefined) {
    // The reference letter is scaled so that its x-height fills the rows of the font's x-height.
    const family = referenceFont || "sans-serif";
    ctx.font = `100px ${family}`;
    const scale = ((baseline - xTop) * CELL) / ctx.measureText("x").actualBoundingBoxAscent;
    ctx.font = `${100 * scale}px ${family}`;
    const char = String.fromCodePoint(cp);
    const m = ctx.measureText(char);
    const center = ((width - 1) * CELL) / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillText(char, center - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, baseline * CELL);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  rows.forEach((row, y) => row.forEach((lit, x) => lit && ctx.fillRect(x * CELL, y * CELL, CELL, CELL)));
  ctx.strokeStyle = "#ccc";
  for (let x = 0; x <= width; x++) line(ctx, x * CELL, 0, x * CELL, height * CELL);
  for (let y = 0; y <= height; y++) line(ctx, 0, y * CELL, width * CELL, y * CELL);
  ctx.strokeStyle = "#d70000";
  line(ctx, 0, baseline * CELL, width * CELL, baseline * CELL);
  ctx.strokeStyle = "#00a000";
  line(ctx, 0, xTop * CELL, width * CELL, xTop * CELL);
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x0 + 0.5, y0 + 0.5);
  ctx.lineTo(x1 + 0.5, y1 + 0.5);
  ctx.stroke();
}

type PixelTextProps = {
  font: EditorFont;
  lines: string[];
  scale: number;
  /** The rows of a character, or undefined when the font does not have it. */
  rowsOf: (cp: number) => Rows | undefined;
};

/** Text in the font's own pixels, one cell after another. A character the font does not have is a grey box. */
export function PixelText({ font, lines, scale, rowsOf }: PixelTextProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const chars = lines.map((l) => [...l]);
    c.width = Math.max(1, ...chars.map((l) => l.length)) * font.width * scale;
    c.height = lines.length * font.height * scale;
    const ctx = c.getContext("2d")!;
    chars.forEach((lineChars, row) =>
      lineChars.forEach((char, col) => {
        const ox = col * font.width * scale;
        const oy = row * font.height * scale;
        const glyph = rowsOf(char.codePointAt(0)!);
        if (!glyph) {
          ctx.fillStyle = "#999";
          ctx.fillRect(ox + scale, oy + scale, (font.width - 2) * scale, (font.height - 2) * scale);
          return;
        }
        ctx.fillStyle = "#000";
        glyph.forEach((r, y) =>
          r.forEach((lit, x) => lit && ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale)),
        );
      }),
    );
  });
  return <canvas ref={canvas} class="pixels" />;
}
