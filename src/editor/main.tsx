// The browser side of the glyph editor (docs/adr/0005-glyph-editor.md).

import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { GLYPH_GROUPS } from "../scripts.ts";
import type { EditorFont, SaveRequest } from "./api.ts";
import { Grid, PixelText } from "./canvas.tsx";
import {
  emptyRows,
  fileName,
  fileOf,
  glyphOf,
  groupName,
  label,
  missingCodePoints,
  sampleFor,
  saveTarget,
  shifted,
  toRows,
  toText,
  wrap,
  type Rows,
} from "./model.ts";

const NEW_FILE = "";

type Edit = { codePoint: number; rows: Rows; saved: string; undo: Rows[]; redo: Rows[] };

function openEdit(f: EditorFont, cp: number): Edit {
  const glyph = glyphOf(f, cp);
  const rows = glyph ? toRows(glyph.rows) : emptyRows(f);
  return { codePoint: cp, rows, saved: JSON.stringify(toText(rows)), undo: [], redo: [] };
}

const isDirty = (edit: Edit) => JSON.stringify(toText(edit.rows)) !== edit.saved;

function App() {
  const [fonts, setFonts] = useState<EditorFont[]>([]);
  const [fontName, setFontName] = useState(location.hash.slice(1));
  const [edit, setEdit] = useState<Edit | undefined>();
  const [status, setStatus] = useState({ text: "", error: false });
  const [reference, setReference] = useState(true);
  const [referenceFont, setReferenceFont] = useState("sans-serif");
  const [file, setFile] = useState("");
  const [newFile, setNewFile] = useState("");
  const [text, setText] = useState("");

  const font = fonts.find((f) => f.name === fontName) ?? fonts[0];

  useEffect(() => {
    void fetch("/api/fonts")
      .then((response) => response.json() as Promise<EditorFont[]>)
      .then(setFonts);
  }, []);

  // A new font or glyph starts with its save file and sample text.
  const open = (f: EditorFont, cp: number, ask = true) => {
    if (
      ask &&
      edit &&
      isDirty(edit) &&
      !confirm(`${label(edit.codePoint)} has changes that are not saved. Leave it?`)
    ) {
      return;
    }
    setEdit(openEdit(f, cp));
    setFile(saveTarget(f, cp).file);
    setText(sampleFor(cp));
  };
  useEffect(() => {
    if (font && !edit) open(font, 0x41, false);
  }, [font]);

  // State updates use the latest edit, because pointer events can come faster than the page draws again.
  const change = (rows: Rows) => setEdit((e) => e && { ...e, rows, undo: [...e.undo, e.rows], redo: [] });
  const paint = (x: number, y: number, value: boolean, start: boolean) =>
    setEdit((e) => {
      if (!e) return e;
      const rows = e.rows.map((row, ry) => row.map((p, rx) => (rx === x && ry === y ? value : p)));
      return start ? { ...e, rows, undo: [...e.undo, e.rows], redo: [] } : { ...e, rows };
    });
  const step = (back: boolean) => {
    if (!edit) return;
    const from = back ? edit.undo : edit.redo;
    const previous = from.at(-1);
    if (!previous) return;
    const rest = from.slice(0, -1);
    const other = [...(back ? edit.redo : edit.undo), edit.rows];
    setEdit({ ...edit, rows: previous, undo: back ? rest : other, redo: back ? other : rest });
  };

  const save = async () => {
    if (!font || !edit) return;
    const target = file === NEW_FILE ? newFile.trim() : file;
    const request: SaveRequest = { font: font.name, file: target, codePoint: edit.codePoint, rows: toText(edit.rows) };
    const response = await fetch("/api/glyph", { method: "PUT", body: JSON.stringify(request) });
    if (!response.ok) return setStatus({ text: await response.text(), error: true });
    const next = (await response.json()) as EditorFont[];
    setFonts(next);
    setEdit({ ...edit, saved: JSON.stringify(toText(edit.rows)) });
    setFile(
      saveTarget(
        next.find((f) => f.name === font.name)!,
        edit.codePoint,
      ).file,
    );
    setStatus({ text: `Saved ${label(edit.codePoint)} to ${font.dir}/${target}`, error: false });
  };

  // The drawing in the glyph format, as in a glyph file, for example to paste into a message.
  const copy = async () => {
    if (!edit) return;
    const char = edit.codePoint === 0x20 ? "" : ` ${String.fromCodePoint(edit.codePoint)}`;
    await navigator.clipboard.writeText([`${label(edit.codePoint)}${char}`, ...toText(edit.rows)].join("\n") + "\n");
    setStatus({ text: `Copied ${label(edit.codePoint)}`, error: false });
  };

  // A drawing in the glyph format from the clipboard. The U+ line is optional, and the rows must fit the font.
  const paste = async () => {
    if (!font || !edit) return;
    const lines = (await navigator.clipboard.readText()).split(/\r?\n/).map((l) => l.trim());
    const rows = lines.filter((l) => /^[X.]+$/.test(l));
    if (rows.length !== font.height || rows.some((r) => r.length !== font.width)) {
      return setStatus({ text: `Paste needs ${font.height} rows of ${font.width} "X" and "."`, error: true });
    }
    change(toRows(rows));
    setStatus({ text: `Pasted into ${label(edit.codePoint)}`, error: false });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      const mod = event.metaKey || event.ctrlKey;
      const shifts: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (mod && event.key.toLowerCase() === "z") step(!event.shiftKey);
      else if (mod && event.key === "s") void save();
      else if (shifts[event.key] && edit) change(shifted(edit.rows, ...shifts[event.key]));
      else return;
      event.preventDefault();
    };
    const onLeave = (event: BeforeUnloadEvent) => edit && isDirty(edit) && event.preventDefault();
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  if (!font || !edit) return <p class="loading">Loading…</p>;
  const char = String.fromCodePoint(edit.codePoint);
  const target = saveTarget(font, edit.codePoint);
  const savedRowsOf = (f: EditorFont) => (cp: number) => {
    const glyph = glyphOf(f, cp);
    return glyph && toRows(glyph.rows);
  };
  const rowsOf = (f: EditorFont) => (cp: number) =>
    f === font && cp === edit.codePoint ? edit.rows : savedRowsOf(f)(cp);
  const files = [
    ...new Set([...font.files.filter((f) => f.writable && !f.included).map((f) => fileName(f.path)), target.file]),
  ].sort();

  return (
    <>
      <header>
        <h1>zxfnt editor</h1>
        <select
          aria-label="Font"
          value={font.name}
          onChange={(event) => {
            const next = fonts.find((f) => f.name === event.currentTarget.value)!;
            if (isDirty(edit) && !confirm("The glyph has changes that are not saved. Leave it?")) return;
            setFontName(next.name);
            history.replaceState(null, "", `#${next.name}`);
            open(next, edit.codePoint, false);
          }}
        >
          {fonts.map((f) => (
            <option value={f.name}>
              {f.family} ({f.width}×{f.height})
            </option>
          ))}
        </select>
        <input
          placeholder="Go to: character or U+XXXX"
          size={24}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const value = event.currentTarget.value.trim();
            const hex = /^U\+([0-9A-Fa-f]{4,6})$/.exec(value);
            const cp = hex ? parseInt(hex[1], 16) : value.codePointAt(0);
            if (cp !== undefined) open(font, cp);
          }}
        />
        <span class={status.error ? "status error" : "status"}>{status.text}</span>
      </header>
      <main>
        <GlyphList font={font} current={edit.codePoint} onOpen={(cp) => open(font, cp)} />
        <section>
          <h2>
            {label(edit.codePoint)} {char}
            {isDirty(edit) ? " •" : ""}
          </h2>
          <Grid
            font={font}
            codePoint={edit.codePoint}
            rows={edit.rows}
            referenceFont={reference ? referenceFont : undefined}
            onPaint={paint}
          />
          <div class="tools">
            <label>
              <input type="checkbox" checked={reference} onChange={(e) => setReference(e.currentTarget.checked)} />{" "}
              Reference
            </label>
            <input
              aria-label="Reference font"
              size={12}
              value={referenceFont}
              onInput={(e) => setReferenceFont(e.currentTarget.value)}
            />
            {(
              [
                ["←", -1, 0, "left"],
                ["↑", 0, -1, "up"],
                ["↓", 0, 1, "down"],
                ["→", 1, 0, "right"],
              ] as const
            ).map(([arrow, dx, dy, name]) => (
              <button title={`Shift ${name}`} onClick={() => change(shifted(edit.rows, dx, dy))}>
                {arrow}
              </button>
            ))}
            <button onClick={() => change(emptyRows(font))}>Clear</button>
            <button
              title="Back to the last load or save"
              onClick={() => isDirty(edit) && change(toRows(JSON.parse(edit.saved) as string[]))}
            >
              Reset
            </button>
            <button title="Undo (Cmd+Z)" onClick={() => step(true)}>
              Undo
            </button>
            <button title="Redo (Shift+Cmd+Z)" onClick={() => step(false)}>
              Redo
            </button>
          </div>
          <div class="tools">
            <label>
              Save to{" "}
              <select value={file} onChange={(e) => setFile(e.currentTarget.value)}>
                {files.map((name) => (
                  <option value={name}>{name}</option>
                ))}
                <option value={NEW_FILE}>New file…</option>
              </select>
            </label>
            {file === NEW_FILE && (
              <input
                aria-label="New file name"
                placeholder="new-file.txt"
                size={14}
                value={newFile}
                onInput={(e) => setNewFile(e.currentTarget.value)}
              />
            )}
            <button title="Save (Cmd+S)" disabled={!target.canSave} onClick={() => void save()}>
              Save
            </button>
            <button title="Copy the drawing in the glyph format" onClick={() => void copy()}>
              Copy
            </button>
            <button title="Paste a drawing in the glyph format" onClick={() => void paste()}>
              Paste
            </button>
          </div>
          <p>{target.note}</p>
        </section>
        <aside>
          <h3>Real size</h3>
          {[1, 2, 3].map((scale) => (
            <PixelText font={font} lines={[`x${char}x ${char}${char}${char}`]} scale={scale} rowsOf={rowsOf(font)} />
          ))}
          <h3>Text</h3>
          <input aria-label="Preview text" value={text} onInput={(e) => setText(e.currentTarget.value)} />
          <p class="caption">Before: as saved</p>
          <PixelText font={font} lines={wrap(text, 40)} scale={2} rowsOf={savedRowsOf(font)} />
          <p class="caption">After: with this drawing{isDirty(edit) ? "" : " (no changes yet)"}</p>
          <PixelText font={font} lines={wrap(text, 40)} scale={2} rowsOf={rowsOf(font)} />
          <h3>Other fonts</h3>
          {/* Both fonts have the same rows below the baseline, so bottom alignment puts the glyphs on one baseline. */}
          <div class="others">
            {fonts.map((f) => (
              <figure>
                <PixelText font={f} lines={[char]} scale={6} rowsOf={rowsOf(f)} />
                <figcaption>
                  {f.name}
                  {glyphOf(f, edit.codePoint) || f === font ? "" : " (missing)"}
                </figcaption>
              </figure>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
}

type GlyphListProps = { font: EditorFont; current: number; onOpen: (cp: number) => void };

/** The glyphs of the font in the groups of the demo page, then the letters of the samples that it does not have. */
function GlyphList({ font, current, onOpen }: GlyphListProps) {
  const groups = new Map<string, [number, string][]>(GLYPH_GROUPS.map(([name]) => [name, []]));
  for (const g of font.glyphs) {
    const source = fileOf(font, g.file);
    const kind = source?.included ? "included" : source?.writable ? "" : "generated";
    groups.get(groupName(g.codePoint))!.push([g.codePoint, kind]);
  }
  groups.set(
    "Missing from the samples",
    missingCodePoints(font).map((cp) => [cp, "missing"]),
  );
  return (
    <nav aria-label="Glyphs">
      {[...groups]
        .filter(([, glyphs]) => glyphs.length > 0)
        .map(([name, glyphs]) => (
          <>
            <h3>{name}</h3>
            {glyphs.map(([cp, kind]) => (
              <button
                class={`${kind}${cp === current ? " current" : ""}`}
                title={`${label(cp)} ${String.fromCodePoint(cp)}`}
                onClick={() => onOpen(cp)}
              >
                {String.fromCodePoint(cp)}
              </button>
            ))}
          </>
        ))}
    </nav>
  );
}

render(<App />, document.getElementById("app")!);
