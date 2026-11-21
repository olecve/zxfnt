// The demo page: one view at a time of one font, or of all fonts one above the other to compare them.

import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
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
// What the status line shows for a glyph that is pointed at or tapped.
const codeText = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${String.fromCodePoint(cp)}`;
// Copies the character. Without clipboard access, the status line only shows its code.
const copy = (cp: number, onPick: (status: string) => void) =>
  navigator.clipboard.writeText(String.fromCodePoint(cp)).then(
    () => onPick(`Copied ${codeText(cp)}`),
    () => onPick(codeText(cp)),
  );
const covers = (f: DemoFont, l: Language) => {
  const has = new Set(f.codePoints);
  return [...(l.upper + l.lower + l.sample)].every((c) => has.has(c.codePointAt(0)!));
};
const languages = LANGUAGES.filter((l) => fonts.some((f) => covers(f, l)));

// The letters of all alphabets in one order: each letter that a language adds goes right after the letter that it
// follows in that language, so Ґ comes after Г and Ә after А. Capitals come before small letters.
const merge = (alphabets: string[]) => {
  const order: string[] = [];
  for (const alphabet of alphabets) {
    [...alphabet].forEach((letter, i) => {
      if (order.includes(letter)) return;
      const after = i === 0 ? -1 : order.indexOf([...alphabet][i - 1]);
      order.splice(after + 1, 0, letter);
    });
  }
  return order;
};
const ALPHABET_ORDER = new Map(
  [...merge(LANGUAGES.map((l) => l.upper)), ...merge(LANGUAGES.map((l) => l.lower))].map((c, i) => [
    c.codePointAt(0)!,
    i,
  ]),
);
// Letters in alphabet order, then the other glyphs in code point order.
const byAlphabet = (a: number, b: number) =>
  (ALPHABET_ORDER.get(a) ?? Infinity) - (ALPHABET_ORDER.get(b) ?? Infinity) || a - b;
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
    document.documentElement.style.setProperty("--paper-flipped", (bright === "1" ? PALETTE : BRIGHT_PALETTE)[7]);
    document.documentElement.style.setProperty("--link", colours[1]);
    document.documentElement.style.setProperty("--font", `"${shown[0].family}", monospace`);
  }, [border, bright, fontName]);

  return (
    <>
      <LoadingBorder trigger={lang} />
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
            {view === "alphabet" && <Alphabet font={font} language={language} onPick={setStatus} />}
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
    </>
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

type AlphabetProps = { font: DemoFont; language: Language; onPick: (status: string) => void };

function Alphabet({ font, language, onPick }: AlphabetProps) {
  if (!covers(font, language)) return <p>This font does not have all letters of {language.name}.</p>;
  const letters = (text: string) =>
    [...text].map((char) => {
      const cp = char.codePointAt(0)!;
      return (
        <span class="pick" onMouseEnter={() => onPick(codeText(cp))} onClick={() => void copy(cp, onPick)}>
          {char}
        </span>
      );
    });
  return (
    <div lang={language.lang}>
      {language.upper !== "" && <p class="alphabet">{letters(language.upper)}</p>}
      <p class="alphabet">{letters(language.lower)}</p>
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
  // ASCII keeps its code order: digits and signs between the letters.
  for (const group of groups.slice(1)) group.sort(byAlphabet);
  const show = (cp: number) => onPick(codeText(cp));
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
                    void copy(cp, onPick);
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

// Loading stripes: wide red and cyan stripes first, then thin blue and yellow ones.
const PILOT_MS = 250;
const DATA_MS = 400;

function LoadingBorder({ trigger }: { trigger: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const c = canvas.current;
    if (!c) return;
    // With reduced motion the stripes stand still: the pilot does not roll, and the data is the same in every frame.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    c.width = innerWidth;
    c.height = innerHeight;
    const ctx = c.getContext("2d")!;
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = now - start;
      if (t > PILOT_MS + DATA_MS) {
        ctx.clearRect(0, 0, c.width, c.height);
        return;
      }
      const pilot = t < PILOT_MS;
      const roll = still ? 0 : (t / 2) % 32;
      let seed = 1;
      const random = still ? () => (seed = (seed * 16807) % 2147483647) / 2147483647 : Math.random;
      let y = pilot ? -roll : 0;
      while (y < c.height) {
        const height = pilot ? 16 : 2 + Math.floor(random() * 6);
        ctx.fillStyle = pilot
          ? Math.floor((y + roll) / 16) % 2
            ? PALETTE[5]
            : PALETTE[2]
          : random() < 0.5
            ? PALETTE[1]
            : PALETTE[6];
        ctx.fillRect(0, y, c.width, height);
        y += height;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, c.width, c.height);
    };
  }, [trigger]);
  return <canvas ref={canvas} class="loading" aria-hidden="true" />;
}

// About 1.4 CSS pixels for each pixel of the font on a phone, rounded to whole device pixels.
const setFontPixel = () => {
  const ratio = devicePixelRatio || 1;
  document.documentElement.style.setProperty("--px", `${Math.max(1, Math.round(1.4 * ratio)) / ratio}px`);
};
setFontPixel();
addEventListener("resize", setFontPixel);

render(<App />, document.getElementById("app")!);
