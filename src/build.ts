// Builds every font in fonts/*/glyphs.txt into dist/<name>.otf, and writes a demo page dist/index.html.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildFont } from "./font.ts";
import { parseGlyphFont, type GlyphFont } from "./glyphs.ts";

const FONTS_DIR = "fonts";
const DIST_DIR = "dist";

const dirs = (await readdir(FONTS_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
await mkdir(DIST_DIR, { recursive: true });

const built: GlyphFont[] = [];
for (const dir of dirs.sort()) {
  const path = join(FONTS_DIR, dir, "glyphs.txt");
  const source = parseGlyphFont(await readFile(path, "utf8"), path);
  const bytes = buildFont(source).toArrayBuffer();
  await writeFile(join(DIST_DIR, `${source.name}.otf`), Buffer.from(bytes));
  console.log(`${path} -> ${DIST_DIR}/${source.name}.otf (${source.glyphs.length} glyphs, ${bytes.byteLength} bytes)`);
  built.push(source);
}

await writeFile(join(DIST_DIR, "index.html"), demoPage(built));
console.log(`${DIST_DIR}/index.html`);

function demoPage(fonts: GlyphFont[]): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const faces = fonts
    .map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.name}.otf") format("opentype"); }`)
    .join("\n      ");
  const sections = fonts
    .map((f) => {
      const all = f.glyphs.map((g) => String.fromCodePoint(g.codePoint)).join("");
      const sizes = [8, 16, 24, 32, 48]
        .map((px) => `<p style="font-size: ${px}px">${px}px: The quick brown fox jumps over the lazy dog.</p>`)
        .join("\n        ");
      return `
      <section style="font-family: '${f.family}', monospace">
        <h2>${escape(f.family)} <small>(${f.name}.otf, ${f.glyphs.length} glyphs)</small></h2>
        ${sizes}
        <p class="all">${escape(all)}</p>
        <textarea spellcheck="false">10 PRINT "HELLO, WORLD!"\n20 GO TO 10</textarea>
      </section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zxfnt fonts</title>
    <style>
      ${faces}
      body { margin: 0; padding: 32px 16px; background: #d7d7d7; color: #000; font-family: system-ui, sans-serif; }
      /* macOS thickens glyphs by default, which blurs the pixel edges. */
      section { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      section { max-width: 960px; margin: 0 auto 32px; padding: 24px; background: #fff; border: 16px solid #0000d7; }
      h2 { font-size: 24px; margin: 0 0 16px; }
      h2 small { font-size: 16px; }
      p { margin: 0 0 8px; overflow-wrap: anywhere; }
      .all { font-size: 32px; line-height: 1.5; }
      textarea { font: inherit; font-size: 16px; width: 100%; box-sizing: border-box; height: 96px; margin-top: 16px; }
    </style>
  </head>
  <body>
${sections}
  </body>
</html>
`;
}
