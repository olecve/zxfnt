// Builds every font directory in fonts/ into dist/<name>.otf, and writes a demo page dist/index.html.

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildFont } from "./font.ts";
import { readGlyphFont, type GlyphFont } from "./glyphs.ts";

const FONTS_DIR = "fonts";
const DIST_DIR = "dist";

// An 8-bit palette, colours 0-7 at normal brightness.
const PALETTE = ["#000000", "#0000d7", "#d70000", "#d700d7", "#00d700", "#00d7d7", "#d7d700", "#d7d7d7"];
const COLOUR_NAMES = ["black", "blue", "red", "magenta", "green", "cyan", "yellow", "white"];

const dirs = (await readdir(FONTS_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
await mkdir(DIST_DIR, { recursive: true });

const built: GlyphFont[] = [];
for (const dir of dirs.sort()) {
  const path = join(FONTS_DIR, dir);
  const source = await readGlyphFont(path);
  const bytes = buildFont(source).toArrayBuffer();
  await writeFile(join(DIST_DIR, `${source.name}.otf`), Buffer.from(bytes));
  console.log(`${path} -> ${DIST_DIR}/${source.name}.otf (${source.glyphs.length} glyphs, ${bytes.byteLength} bytes)`);
  built.push(source);
}

await writeFile(join(DIST_DIR, "index.html"), demoPage(built));
console.log(`${DIST_DIR}/index.html`);

// A page that looks like an 8-bit screen: a border, paper and ink, all text in the first font.
function demoPage(fonts: GlyphFont[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const faces = fonts
    .map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.name}.otf") format("opentype"); }`)
    .join("\n      ");
  const border = PALETTE.map(
    (colour, i) =>
      `<button type="button" style="background: ${colour}" title="BORDER ${i}: ${COLOUR_NAMES[i]}" data-colour="${colour}">${i}</button>`,
  ).join("");
  const sections = fonts
    .map((f) => {
      const sizes = [8, 16, 24, 32]
        .map((px) => `<p style="font-size: ${px}px">${px}px: The quick brown fox jumps over the lazy dog.</p>`)
        .join("\n          ");
      const cells = f.glyphs
        .map((g) => {
          const char = String.fromCodePoint(g.codePoint);
          const code = `U+${g.codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
          return `<span title="${code} ${escape(char)}">${escape(char)}</span>`;
        })
        .join("");
      return `
        <section style="font-family: '${f.family}', monospace">
          <h2>${escape(f.family)}</h2>
          <p><a href="${f.name}.otf" download>${f.name}.otf</a> ${f.glyphs.length} glyphs</p>
          ${sizes}
          <h3>All glyphs</h3>
          <div class="glyphs">${cells}</div>
          <h3>Type here</h3>
          <textarea spellcheck="false">10 PRINT "HELLO, WORLD!"\n20 GO TO 10</textarea>
        </section>`;
    })
    .join("\n");
  const uiFont = fonts[0] ? `'${fonts[0].family}', ` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zxfnt</title>
    <style>
      ${faces}
      :root { --border: ${PALETTE[1]}; --paper: ${PALETTE[7]}; --ink: ${PALETTE[0]}; --link: ${PALETTE[1]}; }
      * { box-sizing: border-box; }
      html { background: var(--border); transition: background 0.2s steps(1); }
      body {
        margin: 0;
        padding: 32px 16px;
        font-family: ${uiFont}monospace;
        font-size: 16px;
        line-height: 24px;
        color: var(--ink);
        /* macOS thickens glyphs by default, which blurs the pixel edges. */
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      main {
        max-width: 1024px;
        /* Whole-pixel margins keep the pixels of the font on the screen grid. */
        margin-left: max(0px, round(down, (100% - 1024px) / 2, 8px));
        padding: 32px;
        background: var(--paper);
      }
      header { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
      h1, h2, h3 { margin: 0; font-weight: normal; font-size: inherit; }
      h1 { font-size: 32px; line-height: 32px; }
      h2, h3 { background: var(--ink); color: var(--paper); padding: 0 8px; margin: 32px 0 16px; }
      h3 { display: inline-block; margin: 24px 0 8px; }
      p { margin: 0 0 8px; overflow-wrap: anywhere; }
      p[style] { line-height: 1.5; }
      a { color: var(--link); }
      .border { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .border button {
        font: inherit;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        /* An ink frame, so that white is visible on white paper. */
        outline: 2px solid var(--ink);
        outline-offset: -2px;
        color: ${PALETTE[7]};
        cursor: pointer;
      }
      .border button:nth-child(n + 6) { color: ${PALETTE[0]}; }
      .glyphs { display: flex; flex-wrap: wrap; font-size: 32px; line-height: 48px; }
      .glyphs span { width: 48px; text-align: center; }
      .glyphs span:hover { background: var(--ink); color: var(--paper); }
      textarea {
        display: block;
        width: 100%;
        height: 96px;
        font: inherit;
        color: var(--ink);
        background: var(--paper);
        border: 0;
        outline: 8px solid var(--ink);
        outline-offset: -8px;
        padding: 16px;
        resize: vertical;
        caret-color: var(--ink);
      }
      footer { margin-top: 32px; }
      @media (max-width: 600px) {
        body { padding: 16px 8px; }
        main { padding: 16px; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>zxfnt</h1>
      </header>
      <p>Pixel fonts for the web. <a href="https://github.com/olecve/zxfnt">Source on GitHub</a>.</p>
      <div class="border"><span>BORDER</span>${border}</div>
${sections}
      <footer>OK</footer>
    </main>
    <script>
      for (const button of document.querySelectorAll(".border button")) {
        button.addEventListener("click", () =>
          document.documentElement.style.setProperty("--border", button.dataset.colour),
        );
      }
    </script>
  </body>
</html>
`;
}
