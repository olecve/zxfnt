// Character groups and sample sentences, shared by the demo page and the glyph editor. This module runs in Node and
// in the browser, so it imports nothing.

/** Groups of the glyph table, in this order. A glyph goes into the first group that matches it. */
export const GLYPH_GROUPS: [string, (codePoint: number) => boolean][] = [
  ["ASCII", (c) => c <= 0x7e],
  ["Latin", (c) => /\p{Script=Latin}/u.test(String.fromCodePoint(c))],
  ["Cyrillic", (c) => /\p{Script=Cyrillic}/u.test(String.fromCodePoint(c))],
  ["Georgian", (c) => /\p{Script=Georgian}/u.test(String.fromCodePoint(c))],
  ["Punctuation and symbols", () => true],
];

/**
 * Pangrams and other sentences that use the special letters of a language. A font shows the ones it has all characters
 * for.
 */
export const SAMPLES: [lang: string, name: string, text: string][] = [
  ["en", "English", "The quick brown fox jumps over the lazy dog."],
  ["fi", "Finnish", "Törkylempijävongahdus."],
  ["sv", "Swedish", "Flygande bäckasiner söka hwila på mjuka tuvor."],
  ["et", "Estonian", "Põdur Zagrebi tšellomängija-följetonist Ciqo külmetas kehvas garaažis."],
  ["de", "German", "Falsches Üben von Xylophonmusik quält jeden größeren Zwerg."],
  ["ru", "Russian", "Съешь же ещё этих мягких французских булок, да выпей чаю."],
  ["uk", "Ukrainian", "Чуєш їх, доцю, га? Кумедна ж ти, прощайся без ґольфів!"],
  ["be", "Belarusian", "У Іўі худы жвавы чорт у зялёнай камізэльцы пабег пад’есці фаршу з юшкай."],
  ["kk", "Kazakh", "Алтын күн аспаны, алтын дән даласы, ерліктің дастаны – еліме қарашы!"],
  ["ka", "Georgian", "ჩემი ხატია სამშობლო, სახატე მთელი ქვეყანა."],
];
