// Builds every font directory in fonts/ into dist/<name>.otf and dist/<name>.woff2, and the demo page into
// dist/index.html and dist/demo.js.

import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compress } from "wawoff2";
import type { DemoFont } from "./demo/data.ts";
import { buildFont } from "./font.ts";
import { fontDirs, readGlyphFont, type GlyphFont } from "./glyphs.ts";

const DIST_DIR = "dist";

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

const faces = built
  .map(
    (f) =>
      `@font-face { font-family: "${f.family}"; src: url("${f.name}.woff2") format("woff2"), url("${f.name}.otf") format("opentype"); }`,
  )
  .join("\n      ");
const data: DemoFont[] = built.map((f) => ({
  name: f.name,
  family: f.family,
  width: f.width,
  height: f.height,
  codePoints: f.glyphs.map((g) => g.codePoint),
}));
const template = await readFile("src/demo/index.html", "utf8");
// "<" in the JSON could end the script element early.
const page = template
  .replace("/* FONT FACES */", faces)
  .replace("/* FONTS */", JSON.stringify(data).replace(/</g, "\\u003c"));
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
