import { composeAll } from "./compose.ts";

for (const line of await composeAll()) console.log(line);
