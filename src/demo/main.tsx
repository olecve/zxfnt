// The demo page: one view at a time of one font, or of all fonts one above the other to compare them.

import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { GLYPH_GROUPS, LANGUAGES, type Language } from "../scripts.ts";
import type { DemoFont } from "./data.ts";

// An 8-bit palette, colours 0-7 at normal brightness.
const PALETTE = ["#000000", "#0000d7", "#d70000", "#d700d7", "#00d700", "#00d7d7", "#d7d700", "#d7d7d7"];
// Black has no bright version.
const BRIGHT_PALETTE = ["#000000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"];
const COLOUR_NAMES = ["black", "blue", "red", "magenta", "green", "cyan", "yellow", "white"];
const VIEWS = [
  ["alphabet", "Alphabet"],
  ["type", "Type here"],
  ["sizes", "Sizes"],
  ["glyphs", "All glyphs"],
];
const BOTH = "both";
const READY = "OK";

const fonts = JSON.parse(document.getElementById("fonts")!.textContent) as DemoFont[];
const label = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
const covers = (f: DemoFont, l: Language) => {
  const has = new Set(f.codePoints);
  return [...(l.upper + l.lower + l.sample)].every((c) => has.has(c.codePointAt(0)!));
};
const languages = LANGUAGES.filter((l) => fonts.some((f) => covers(f, l)));
const choice = (options: string[], wanted: string | undefined) =>
  wanted !== undefined && options.includes(wanted) ? wanted : options[0];

function App() {
  const [hashFont, hashLang, hashView] = location.hash.slice(1).split("/");
  const [fontName, setFontName] = useState(choice([...fonts.map((f) => f.name), BOTH], hashFont));
  const [lang, setLang] = useState(
    choice(
      languages.map((l) => l.lang),
      hashLang,
    ),
  );
  const [view, setView] = useState(
    choice(
      VIEWS.map(([v]) => v),
      hashView,
    ),
  );
  const [border, setBorder] = useState(PALETTE[1]);
  const [bright, setBright] = useState("0");
  const [status, setStatus] = useState(READY);
  // Typing does not use the language, so the control is dimmed in that view.
  const languageUnused = view === "type";
  const [typed, setTyped] = useState('10 PRINT "HELLO, WORLD!"\n20 GO TO 10');
  const shown = fontName === BOTH ? fonts : fonts.filter((f) => f.name === fontName);
  const language = languages.find((l) => l.lang === lang)!;

  useEffect(() => history.replaceState(null, "", `#${fontName}/${lang}/${view}`), [fontName, lang, view]);
  useEffect(() => {
    // BRIGHT changes the paper and the ink, but not the border.
    const colours = bright === "1" ? BRIGHT_PALETTE : PALETTE;
    document.documentElement.style.setProperty("--border", border);
    document.documentElement.style.setProperty("--paper", colours[7]);
    document.documentElement.style.setProperty("--link", colours[1]);
    document.documentElement.style.setProperty("--font", `"${shown[0].family}", monospace`);
  }, [border, bright, fontName]);

  return (
    <main>
      <header>
        <h1>zxfnt</h1>
      </header>
      <p>
        Pixel fonts for the web. <a href="https://github.com/olecve/zxfnt">Source on GitHub</a>.
      </p>
      <Toggle
        label="FONT"
        value={fontName}
        onChange={setFontName}
        options={[...fonts.map((f) => [f.name, `${f.width}×${f.height}`]), [BOTH, "Both"]]}
      />
      <Toggle label="VIEW" value={view} onChange={setView} options={VIEWS} />
      <div class={languageUnused ? "controls unused" : "controls"}>
        <span>LANGUAGE</span>
        <select
          aria-label="Language"
          value={lang}
          disabled={languageUnused}
          onChange={(e) => setLang(e.currentTarget.value)}
        >
          {[...languages]
            // English first, as the default.
            .sort((a, b) => Number(b.lang === "en") - Number(a.lang === "en") || a.name.localeCompare(b.name, "en"))
            .map((l) => (
              <option value={l.lang}>{l.name}</option>
            ))}
        </select>
      </div>
      <div class="controls border">
        <span>BORDER</span>
        {PALETTE.map((colour, i) => (
          <button
            type="button"
            title={`BORDER ${i}: ${COLOUR_NAMES[i]}`}
            style={{ background: colour, color: i < 5 ? PALETTE[7] : PALETTE[0] }}
            onClick={() => setBorder(colour)}
          >
            {i}
          </button>
        ))}
      </div>
      <Toggle
        label="BRIGHT"
        value={bright}
        onChange={setBright}
        options={[
          ["0", "0"],
          ["1", "1"],
        ]}
      />
      {shown.map((font) => (
        <section style={{ fontFamily: `"${font.family}", monospace` }}>
          <h2>{font.family}</h2>
          <p>
            <a href={`${font.name}.woff2`} download>
              {font.name}.woff2
            </a>{" "}
            <a href={`${font.name}.otf`} download>
              {font.name}.otf
            </a>{" "}
            {font.width}×{font.height} cell, {font.codePoints.length} glyphs
          </p>
          {view === "alphabet" && <Alphabet font={font} language={language} />}
          {view === "type" && (
            <textarea
              spellcheck={false}
              aria-label="Type here"
              value={typed}
              onInput={(e) => setTyped(e.currentTarget.value)}
            />
          )}
          {view === "sizes" &&
            [8, 16, 24, 32].map((px) => (
              <p lang={lang} style={{ fontSize: `${px}px`, lineHeight: `${px * 1.5}px` }}>
                {px}px: {language.sample}
              </p>
            ))}
          {view === "glyphs" && <Glyphs font={font} marked={language} onPick={setStatus} />}
        </section>
      ))}
      <footer>{status}</footer>
    </main>
  );
}

type ToggleProps = { label: string; value: string; onChange: (value: string) => void; options: string[][] };

function Toggle({ label, value, onChange, options }: ToggleProps) {
  return (
    <div class="controls">
      <span>{label}</span>
      {options.map(([v, text]) => (
        <button type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Alphabet({ font, language }: { font: DemoFont; language: Language }) {
  if (!covers(font, language)) return <p>This font does not have all letters of {language.name}.</p>;
  return (
    <div lang={language.lang}>
      {language.upper !== "" && <p class="alphabet">{language.upper}</p>}
      <p class="alphabet">{language.lower}</p>
      <p>{language.sample}</p>
    </div>
  );
}

// A glyph shows its code in the status line when it is pointed at or tapped, so that it works on touch screens too.
type GlyphsProps = { font: DemoFont; marked: Language; onPick: (status: string) => void };

function Glyphs({ font, marked, onPick }: GlyphsProps) {
  const [picked, setPicked] = useState<number | undefined>();
  const letters = new Set([...(marked.upper + marked.lower)].map((c) => c.codePointAt(0)));
  const groups = GLYPH_GROUPS.map((): number[] => []);
  for (const cp of font.codePoints) groups[GLYPH_GROUPS.findIndex(([, matches]) => matches(cp))].push(cp);
  const show = (cp: number) => onPick(`${label(cp)} ${String.fromCodePoint(cp)}`);
  return (
    <>
      {groups.map((group, i) =>
        group.length === 0 ? null : (
          <>
            <h3>{GLYPH_GROUPS[i][0]}</h3>
            <div class="glyphs">
              {group.map((cp) => (
                <button
                  type="button"
                  class={letters.has(cp) ? "letter" : undefined}
                  aria-pressed={cp === picked}
                  onMouseEnter={() => show(cp)}
                  onClick={() => {
                    setPicked(cp);
                    show(cp);
                  }}
                >
                  {String.fromCodePoint(cp)}
                </button>
              ))}
            </div>
          </>
        ),
      )}
    </>
  );
}

render(<App />, document.getElementById("app")!);
