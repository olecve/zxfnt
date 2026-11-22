import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compress } from "wawoff2";
import { blockText } from "./blocks.ts";
import { boldFont } from "./bold.ts";
import type { DemoFont } from "./demo/data.ts";
import { buildFont, type Style } from "./font.ts";
import { fontDirs, readGlyphFont, type GlyphFont } from "./glyphs.ts";
import { italicFont } from "./italic.ts";

const DIST_DIR = "dist";

// Start from an empty dist/, so that a renamed or removed font does not stay there and get published.
await rm(DIST_DIR, { recursive: true, force: true });
await mkdir(DIST_DIR);

const built: GlyphFont[] = [];
const faces: string[] = [];
for (const path of await fontDirs()) {
  const source = await readGlyphFont(path);
  const styles: [GlyphFont, Style][] = [
    [source, {}],
    [boldFont(source), { bold: true }],
    [italicFont(source), { italic: true }],
    [
      { ...boldFont(italicFont(source), source), name: `${source.name}-bold-italic` },
      { bold: true, italic: true },
    ],
  ];
  for (const [font, style] of styles) {
    const otf = new Uint8Array(buildFont(font, style).toArrayBuffer());
    const woff2 = await compress(otf);
    await writeFile(join(DIST_DIR, `${font.name}.otf`), otf);
    await writeFile(join(DIST_DIR, `${font.name}.woff2`), woff2);
    console.log(
      `${path} -> ${DIST_DIR}/${font.name}.otf and .woff2 (${font.glyphs.length} glyphs, ${otf.length} and ${woff2.length} bytes)`,
    );
    faces.push(
      `@font-face { font-family: "${font.family}"; font-weight: ${style.bold ? 700 : 400}; font-style: ${style.italic ? "italic" : "normal"}; src: url("${font.name}.woff2") format("woff2"), url("${font.name}.otf") format("opentype"); }`,
    );
  }
  built.push(source);
}

const data: DemoFont[] = built.map((f) => ({
  name: f.name,
  family: f.family,
  width: f.width,
  height: f.height,
  codePoints: f.glyphs.map((g) => g.codePoint),
}));
// The title of the demo page in big letters made of block graphics, from the glyphs of the first square font.
const square = built.find((f) => f.width === f.height) ?? built[0];
const bannerRows = Array.from({ length: square.height }, (_, y) =>
  [..."zxfnt"].flatMap((char) => square.glyphs.find((g) => g.codePoint === char.codePointAt(0))?.rows[y] ?? []),
);
const banner = { family: square.family, lines: blockText(bannerRows) };
const template = await readFile("src/demo/index.html", "utf8");
// "<" in the JSON could end the script element early.
const page = template
  .replace("/* FONT FACES */", faces.join("\n      "))
  .replace("/* FONTS */", JSON.stringify(data).replace(/</g, "\\u003c"))
  .replace("/* BANNER */", JSON.stringify(banner).replace(/</g, "\\u003c"));
await writeFile(join(DIST_DIR, "index.html"), page);
await build({
  entryPoints: ["src/demo/main.tsx"],
  outfile: join(DIST_DIR, "demo.js"),
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
});
console.log(`${DIST_DIR}/index.html and ${DIST_DIR}/demo.js`);
