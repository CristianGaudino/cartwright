// Which car has the lowest and which the highest of a number, so the compare page can say so. "low" and "high" are the extremes only:
// with three cars the middle one gets nothing. Nothing at all when fewer than two cars have the number, or they are all the same.
export type Mark = "low" | "high" | undefined;

export function rank(values: (number | undefined)[]): Mark[] {
  const known = values.filter((v): v is number => v !== undefined);
  const low = Math.min(...known);
  const high = Math.max(...known);
  if (known.length < 2 || low === high) return values.map(() => undefined);
  return values.map((v) => (v === low ? "low" : v === high ? "high" : undefined));
}
