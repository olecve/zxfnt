// Browsers do not load fonts for pages opened as file:// URLs.

import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 8080);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
};

async function serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  // normalize() removes "..", so a request cannot read files outside dist/.
  const file = join("dist", normalize(path === "/" ? "/index.html" : path));
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

// serve() catches its own errors, so its promise never rejects.
// Only this computer can open the page, not other devices on the network.
createServer((req, res) => void serve(req, res)).listen(PORT, "127.0.0.1", () =>
  console.log(`http://localhost:${PORT}`),
);
