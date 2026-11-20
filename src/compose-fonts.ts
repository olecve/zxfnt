// Writes fonts/<font>/composed.txt for every font, from the character lists in sets/.

import { composeAll } from "./compose.ts";

for (const line of await composeAll()) console.log(line);
