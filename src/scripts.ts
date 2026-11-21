// This module runs in Node and in the browser, so it imports nothing.

/** A glyph goes into the first group that matches it. */
export const GLYPH_GROUPS: [string, (codePoint: number) => boolean][] = [
  ["ASCII", (c) => c <= 0x7e],
  ["Latin", (c) => /\p{Script=Latin}/u.test(String.fromCodePoint(c))],
  ["Cyrillic", (c) => /\p{Script=Cyrillic}/u.test(String.fromCodePoint(c))],
  ["Georgian", (c) => /\p{Script=Georgian}/u.test(String.fromCodePoint(c))],
  ["Block graphics", (c) => c >= 0x2580 && c <= 0x259f],
  ["Punctuation and symbols", () => true],
];

export type Language = {
  lang: string;
  name: string;
  /** The capital letters in the order of the alphabet. Empty for a script without capitals. */
  upper: string;
  /** The small letters in the order of the alphabet. */
  lower: string;
  /** A pangram or another sentence that uses the special letters of the language. */
  sample: string;
};

const cased = (lang: string, name: string, upper: string, sample: string, extra = ""): Language => ({
  lang,
  name,
  upper,
  lower: upper.toLowerCase() + extra,
  sample,
});

export const LANGUAGES: Language[] = [
  cased("en", "English", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "The quick brown fox jumps over the lazy dog."),
  cased("fi", "Finnish", "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ", "Törkylempijävongahdus."),
  cased("sv", "Swedish", "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ", "Flygande bäckasiner söka hwila på mjuka tuvor."),
  cased(
    "et",
    "Estonian",
    "ABCDEFGHIJKLMNOPQRSŠZŽTUVWÕÄÖÜXY",
    "Põdur Zagrebi tšellomängija-följetonist Ciqo külmetas kehvas garaažis.",
  ),
  // ß has no capital in the font.
  cased(
    "de",
    "German",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ",
    "Falsches Üben von Xylophonmusik quält jeden größeren Zwerg.",
    "ß",
  ),
  cased(
    "ru",
    "Russian",
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
    "Съешь же ещё этих мягких французских булок, да выпей чаю.",
  ),
  cased(
    "uk",
    "Ukrainian",
    "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ",
    "Чуєш їх, доцю, га? Кумедна ж ти, прощайся без ґольфів!",
  ),
  cased(
    "be",
    "Belarusian",
    "АБВГДЕЁЖЗІЙКЛМНОПРСТУЎФХЦЧШЫЬЭЮЯ",
    "У Іўі худы жвавы чорт у зялёнай камізэльцы пабег пад’есці фаршу з юшкай.",
  ),
  cased(
    "kk",
    "Kazakh",
    "АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ",
    "Алтын күн аспаны, алтын дән даласы, ерліктің дастаны – еліме қарашы!",
  ),
  // The capitals are Mtavruli, which Georgian uses for all-caps headings and signs, never at the start of a sentence.
  cased("ka", "Georgian", "ᲐᲑᲒᲓᲔᲕᲖᲗᲘᲙᲚᲛᲜᲝᲞᲟᲠᲡᲢᲣᲤᲥᲦᲧᲨᲩᲪᲫᲬᲭᲮᲯᲰ", "ჩემი ხატია სამშობლო, სახატე მთელი ქვეყანა."),
];
