/** One run of text on a page, in PDF coordinates: the origin is the bottom-left corner. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The x position of the gap between two columns, or null for a single-column page.
 *
 * A PDF stores text in the order it was drawn, which on a two-column CV often runs straight across
 * both columns. The gap is the widest strip in the middle of the page that almost no text crosses,
 * with a real share of the text on each side. Only the middle is searched, so a narrow column of
 * dates beside its descriptions is not treated as a column of its own.
 */
export function findColumnGap(items: TextItem[], pageWidth: number): number | null {
  if (items.length < 12 || pageWidth <= 0) return null;

  const STEPS = 200;
  const from = pageWidth * 0.28;
  const to = pageWidth * 0.72;
  const maxCrossing = Math.max(1, Math.floor(items.length * 0.12));

  let best: { start: number; end: number } | null = null;
  let run: { start: number; end: number } | null = null;

  for (let i = 0; i <= STEPS; i++) {
    const x = from + ((to - from) * i) / STEPS;
    const crossing = items.filter((it) => it.x < x && it.x + it.width > x).length;

    if (crossing <= maxCrossing) {
      run = run ? { start: run.start, end: x } : { start: x, end: x };
      if (!best || run.end - run.start > best.end - best.start) best = run;
    } else {
      run = null;
    }
  }

  if (!best || best.end - best.start < pageWidth * 0.01) return null;

  const gap = (best.start + best.end) / 2;
  const left = items.filter((it) => it.x + it.width <= gap).length;
  const right = items.filter((it) => it.x >= gap).length;
  const minSide = items.length * 0.15;

  return left >= minSide && right >= minSide ? gap : null;
}

/** Joins items into lines, top to bottom, each line left to right. */
export function toLines(items: TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];

  for (const item of sorted) {
    const row = rows[rows.length - 1];
    const first = row?.[0];
    // Same line when the baselines are within half a line height of each other.
    if (row && first && Math.abs(first.y - item.y) <= Math.max(first.height, item.height, 1) * 0.5) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    let end = 0;
    for (const item of row) {
      // Items that touch are one word cut in two by the PDF; a visible gap is a space.
      const gap = item.x - end;
      if (line && gap > Math.max(item.height, 1) * 0.15 && !line.endsWith(" ")) line += " ";
      line += item.str;
      end = item.x + item.width;
    }
    return line;
  });
}

/**
 * The text of one page in reading order. On a two-column page, a line that runs across both
 * columns (the name at the top, a full-width heading) splits the page into bands, and each band is
 * read left column first, then right.
 */
export function pageToText(rawItems: TextItem[], pageWidth: number): string {
  const items = rawItems.filter((it) => it.str.trim() !== "");
  const gap = findColumnGap(items, pageWidth);
  if (gap === null) return toLines(items).join("\n");

  const spanning = items.filter((it) => it.x < gap && it.x + it.width > gap);
  const breaks = [...new Set(spanning.map((it) => it.y))].sort((a, b) => b - a);
  // Band 0 is above the first spanning line, band 1 between the first and second, and so on.
  const bandOf = (y: number) => breaks.filter((lineY) => lineY > y).length;

  const lines: string[] = [];
  for (let band = 0; band <= breaks.length; band++) {
    if (band > 0) {
      const y = breaks[band - 1];
      lines.push(...toLines(spanning.filter((it) => it.y === y)));
    }
    const inBand = items.filter((it) => !spanning.includes(it) && bandOf(it.y) === band);
    lines.push(...toLines(inBand.filter((it) => it.x + it.width <= gap)));
    lines.push(...toLines(inBand.filter((it) => it.x >= gap)));
  }

  return lines.join("\n");
}
