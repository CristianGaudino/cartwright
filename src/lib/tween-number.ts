// A figure as the site writes it ("€12,400", "124 cars", "4.6") split into its number and the words around it, so the screen can
// count from one value to the next instead of jumping.
export type Figure = { before: string; n: number; decimals: number; grouped: boolean; after: string };

const FIGURE = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

// Null for anything that is not one number with words around it ("3 of 12", "Not set").
export function parseFigure(text: string): Figure | null {
  const m = FIGURE.exec(text);
  if (!m) return null;
  const [, before, num, after] = m;
  return { before, n: Number(num.replaceAll(",", "")), decimals: num.split(".")[1]?.length ?? 0, grouped: num.includes(","), after };
}

// Only the number may change: "1 car" to "2 cars", or € to %, is a different thing and just swaps.
export const countable = (a: Figure | null, b: Figure | null): a is Figure =>
  !!a && !!b && a.before === b.before && a.after === b.after && a.decimals === b.decimals && a.n !== b.n;

// The text at `t` (0 to 1) of the way from one figure to the other, eased out so it settles on the new value.
export function figureAt(from: Figure, to: Figure, t: number): string {
  const eased = 1 - (1 - Math.min(1, Math.max(0, t))) ** 4;
  const n = from.n + (to.n - from.n) * eased;
  const text = n.toLocaleString("en-IE", { minimumFractionDigits: to.decimals, maximumFractionDigits: to.decimals, useGrouping: from.grouped || to.grouped });
  return `${to.before}${text}${to.after}`;
}
