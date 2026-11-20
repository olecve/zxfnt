// Writes fonts/<font>/composed.txt for every font, from the character lists in sets/.

import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { COMPOSED_FILE, composedText } from "./compose.ts";
import { fontDirs } from "./glyphs.ts";

for (const dir of await fontDirs()) {
  const path = join(dir, COMPOSED_FILE);
  const { text, skipped } = await composedText(dir);
  for (const reason of skipped) console.log(`${dir}: skipped ${reason}`);
  if (text === undefined) {
    await rm(path, { force: true });
  } else {
    await writeFile(path, text);
    console.log(`-> ${path}`);
  }
}
