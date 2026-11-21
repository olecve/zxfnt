// Builds every font directory in fonts/ into dist/<name>.otf and dist/<name>.woff2, and writes a demo page
// dist/index.html.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compress } from "wawoff2";
import { buildFont } from "./font.ts";
import { fontDirs, readGlyphFont, type GlyphFont } from "./glyphs.ts";

const DIST_DIR = "dist";

// An 8-bit palette, colours 0-7 at normal brightness.
const PALETTE = ["#000000", "#0000d7", "#d70000", "#d700d7", "#00d700", "#00d7d7", "#d7d700", "#d7d7d7"];
const COLOUR_NAMES = ["black", "blue", "red", "magenta", "green", "cyan", "yellow", "white"];

// The glyph table shows these groups, in this order. A glyph goes into the first group that matches it.
const GLYPH_GROUPS: [string, (codePoint: number) => boolean][] = [
  ["ASCII", (c) => c <= 0x7e],
  ["Latin", (c) => /\p{Script=Latin}/u.test(String.fromCodePoint(c))],
  ["Cyrillic", (c) => /\p{Script=Cyrillic}/u.test(String.fromCodePoint(c))],
  ["Georgian", (c) => /\p{Script=Georgian}/u.test(String.fromCodePoint(c))],
  ["Punctuation and symbols", () => true],
];

// Pangrams and other sentences that use the special letters of a language. A font shows the ones it has all
// characters for.
const SAMPLES: [lang: string, name: string, text: string][] = [
  ["en", "English", "The quick brown fox jumps over the lazy dog."],
  ["fi", "Finnish", "Törkylempijävongahdus."],
  ["sv", "Swedish", "Flygande bäckasiner söka hwila på mjuka tuvor."],
  ["et", "Estonian", "Põdur Zagrebi tšellomängija-följetonist Ciqo külmetas kehvas garaažis."],
  ["de", "German", "Falsches Üben von Xylophonmusik quält jeden größeren Zwerg."],
  ["ru", "Russian", "Съешь же ещё этих мягких французских булок, да выпей чаю."],
  ["uk", "Ukrainian", "Чуєш їх, доцю, га? Кумедна ж ти, прощайся без ґольфів!"],
  ["be", "Belarusian", "У Іўі худы жвавы чорт у зялёнай камізэльцы пабег пад’есці фаршу з юшкай."],
  ["kk", "Kazakh", "Қоңыр күз келді: ағаштың жапырағы сарғайып, ұзын жол әсем көрінді."],
  ["ka", "Georgian", "ეს არის ქართული ანბანის ნიმუში."],
];

// Start from an empty dist/, so that a renamed or removed font does not stay there and get published.
await rm(DIST_DIR, { recursive: true, force: true });
await mkdir(DIST_DIR);

const built: GlyphFont[] = [];
for (const path of await fontDirs()) {
  const source = await readGlyphFont(path);
  const otf = new Uint8Array(buildFont(source).toArrayBuffer());
  const woff2 = await compress(otf);
  await writeFile(join(DIST_DIR, `${source.name}.otf`), otf);
  await writeFile(join(DIST_DIR, `${source.name}.woff2`), woff2);
  console.log(
    `${path} -> ${DIST_DIR}/${source.name}.otf and .woff2 (${source.glyphs.length} glyphs, ${otf.length} and ${woff2.length} bytes)`,
  );
  built.push(source);
}

await writeFile(join(DIST_DIR, "index.html"), demoPage(built));
console.log(`${DIST_DIR}/index.html`);

// A page that looks like an 8-bit screen: a border, paper and ink. The FONT buttons show one font at a time, and all
// text of the page is in that font.
function demoPage(fonts: GlyphFont[]): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const faces = fonts
    .map(
      (f) =>
        `@font-face { font-family: "${f.family}"; src: url("${f.name}.woff2") format("woff2"), url("${f.name}.otf") format("opentype"); }`,
    )
    .join("\n      ");
  const border = PALETTE.map(
    (colour, i) =>
      `<button type="button" style="background: ${colour}" title="BORDER ${i}: ${COLOUR_NAMES[i]}" data-colour="${colour}">${i}</button>`,
  ).join("");
  const fontButtons = fonts
    .map((f, i) => `<button type="button" data-font="${f.name}" aria-pressed="${i === 0}">${escape(f.family)}</button>`)
    .join("");
  const sections = fonts
    .map((f, i) => {
      const sizes = [8, 16, 24, 32]
        .map((px) => `<p style="font-size: ${px}px">${px}px: The quick brown fox jumps over the lazy dog.</p>`)
        .join("\n          ");
      const cell = (codePoint: number) => {
        const char = String.fromCodePoint(codePoint);
        const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
        return `<span title="${code} ${escape(char)}">${escape(char)}</span>`;
      };
      const groups = new Map<string, number[]>(GLYPH_GROUPS.map(([name]) => [name, []]));
      for (const { codePoint } of f.glyphs) {
        groups.get(GLYPH_GROUPS.find(([, matches]) => matches(codePoint))![0])!.push(codePoint);
      }
      const glyphs = [...groups]
        .filter(([, codePoints]) => codePoints.length > 0)
        .map(
          ([name, codePoints]) =>
            `<h4>${name}</h4>\n          <div class="glyphs">${codePoints.map(cell).join("")}</div>`,
        )
        .join("\n          ");
      const has = new Set(f.glyphs.map((g) => String.fromCodePoint(g.codePoint)));
      const samples = SAMPLES.filter(([, , text]) => [...text].every((c) => has.has(c)))
        .map(([lang, name, text]) => `<p>${name}: <span lang="${lang}">${escape(text)}</span></p>`)
        .join("\n          ");
      return `
        <section data-name="${f.name}" data-family="${escape(f.family)}"${i === 0 ? "" : " hidden"}>
          <h2>${escape(f.family)}</h2>
          <p><a href="${f.name}.woff2" download>${f.name}.woff2</a> <a href="${f.name}.otf" download>${f.name}.otf</a> ${f.width}×${f.height} cell, ${f.glyphs.length} glyphs</p>
          <h3>Type here</h3>
          <textarea spellcheck="false">10 PRINT "HELLO, WORLD!"\n20 GO TO 10</textarea>
          <h3>Sizes</h3>
          ${sizes}
          <h3>All glyphs</h3>
          ${glyphs}
          <h3>Languages</h3>
          ${samples}
        </section>`;
    })
    .join("\n");
  const uiFont = fonts[0] ? `"${fonts[0].family}", ` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zxfnt</title>
    <style>
      ${faces}
      :root {
        --border: ${PALETTE[1]};
        --paper: ${PALETTE[7]};
        --ink: ${PALETTE[0]};
        --link: ${PALETTE[1]};
        --font: ${uiFont}monospace;
      }
      * { box-sizing: border-box; }
      html { background: var(--border); transition: background 0.2s steps(1); }
      body {
        margin: 0;
        padding: 32px 16px;
        font-family: var(--font);
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
      h4 { margin: 8px 0 0; font-weight: normal; font-size: inherit; }
      p { margin: 0 0 8px; overflow-wrap: anywhere; }
      p[style] { line-height: 1.5; }
      a { color: var(--link); text-decoration-thickness: from-font; text-underline-position: from-font; }
      .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
      .controls span { width: 7ch; }
      .controls button {
        font: inherit;
        height: 32px;
        padding: 0 8px;
        border: 0;
        outline: 2px solid var(--ink);
        outline-offset: -2px;
        color: var(--ink);
        background: var(--paper);
        cursor: pointer;
      }
      .controls button[aria-pressed="true"] { color: var(--paper); background: var(--ink); }
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
      .glyphs { display: flex; flex-wrap: wrap; }
      .glyphs span { width: 24px; text-align: center; }
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
      <div class="controls"><span>FONT</span>${fontButtons}</div>
      <div class="controls border"><span>BORDER</span>${border}</div>
${sections}
      <footer>OK</footer>
    </main>
    <script>
      for (const button of document.querySelectorAll(".border button")) {
        button.addEventListener("click", () =>
          document.documentElement.style.setProperty("--border", button.dataset.colour),
        );
      }

      // Shows the section of one font and sets the font of the whole page. The URL hash keeps the choice.
      const showFont = (name) => {
        const section = document.querySelector("section[data-name=" + JSON.stringify(name) + "]");
        if (!section) return;
        for (const s of document.querySelectorAll("section")) s.hidden = s !== section;
        for (const b of document.querySelectorAll("[data-font]")) b.setAttribute("aria-pressed", b.dataset.font === name);
        document.documentElement.style.setProperty("--font", JSON.stringify(section.dataset.family) + ", monospace");
      };
      for (const button of document.querySelectorAll("[data-font]")) {
        button.addEventListener("click", () => {
          showFont(button.dataset.font);
          history.replaceState(null, "", "#" + button.dataset.font);
        });
      }
      showFont(location.hash.slice(1));
    </script>
  </body>
</html>
`;
}
