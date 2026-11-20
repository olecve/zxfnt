// Writes fonts/<font>/composed.txt for every font, from the character lists in sets/.

import { readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { COMPOSED_FILE, composedText } from "./compose.ts";

const FONTS_DIR = "fonts";

for (const dir of (await readdir(FONTS_DIR)).sort()) {
  const path = join(FONTS_DIR, dir, COMPOSED_FILE);
  const { text, skipped } = await composedText(join(FONTS_DIR, dir));
  for (const reason of skipped) console.log(`${dir}: skipped ${reason}`);
  if (text === undefined) {
    await rm(path, { force: true });
  } else {
    await writeFile(path, text);
    console.log(`-> ${path}`);
  }
}
