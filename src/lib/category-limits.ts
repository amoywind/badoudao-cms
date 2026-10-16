/**
 * The category description length, and what happens past it.
 *
 * 600 characters cut three category descriptions mid-sentence — the
 * stored text ended "dependable lead times and low defect rat" and
 * "Amazon Vendors, Wayfair s". The admin had been told 已保存. Nothing in
 * the form said the field was limited, so the loss was silent and only
 * visible on the published page.
 *
 * 2000 is enough for a category page: the longest of the current ones run
 * to about 600 complete, and 2000 leaves room for three of them without
 * the column layout having to break the text into anything but two blocks.
 */
export const DESC_MAX = 2000;

/**
 * Trim to DESC_MAX, but only at a word boundary and say so.
 *
 * Returns the text to store plus the number of characters dropped, so the
 * caller can tell the author rather than accepting the loss quietly.
 * Breaking on a space means a truncated description ends mid-sentence at
 * least at a whole word, never "defect rat".
 */
export function clipDescription(raw: unknown): { text: string; dropped: number } {
  const text = String(raw ?? '');
  if (text.length <= DESC_MAX) return { text, dropped: 0 };

  const cut = text.slice(0, DESC_MAX);
  const at = cut.lastIndexOf(' ');
  /* -1 means the limit fell inside the first word; keep the hard cut
     rather than losing the whole description to a boundary search. */
  const text2 = at > DESC_MAX * 0.6 ? cut.slice(0, at) : cut;
  return { text: text2, dropped: text.length - text2.length };
}