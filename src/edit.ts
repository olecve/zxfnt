// The glyph editor (docs/adr/0005-glyph-editor.md) writes the glyph files in fonts/, so it listens only on this computer.

import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { editorFonts, saveGlyph } from "./edit-fonts.ts";
import type { SaveRequest } from "./editor/api.ts";

const PORT = Number(process.env.PORT ?? 8081);
const MAX_BODY = 64 * 1024;

// The page and the browser code are read and built on each request, so a change to them shows after a reload.
async function editorScript(): Promise<string> {
  const result = await build({
    entryPoints: ["src/editor/main.tsx"],
    bundle: true,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "preact",
    write: false,
  });
  return result.outputFiles[0].text;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) {
    body += String(chunk);
    if (body.length > MAX_BODY) throw new Error("the request is too large");
  }
  return body;
}

function send(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  try {
    if (req.method === "GET" && path === "/") {
      return send(res, 200, "text/html; charset=utf-8", await readFile("src/editor/index.html", "utf8"));
    }
    if (req.method === "GET" && path === "/editor.js") {
      return send(res, 200, "text/javascript; charset=utf-8", await editorScript());
    }
    if (req.method === "GET" && path === "/api/fonts") {
      return send(res, 200, "application/json", JSON.stringify(await editorFonts()));
    }
    if (req.method === "PUT" && path === "/api/glyph") {
      await saveGlyph(JSON.parse(await readBody(req)) as SaveRequest);
      return send(res, 200, "application/json", JSON.stringify(await editorFonts()));
    }
    send(res, 404, "text/plain", "Not found");
  } catch (error) {
    send(res, 400, "text/plain; charset=utf-8", error instanceof Error ? error.message : String(error));
  }
}

// handle() catches its own errors, so its promise never rejects.
createServer((req, res) => void handle(req, res)).listen(PORT, "127.0.0.1", () =>
  console.log(`http://localhost:${PORT}`),
);
