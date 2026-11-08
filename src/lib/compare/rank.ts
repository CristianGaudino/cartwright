// Which car has the lowest and which the highest of a number, so the compare page can show it. With three cars the one between gets
// "mid". Nothing at all when fewer than two cars have the number, or they are all the same.
export type Mark = "low" | "high" | "mid" | undefined;

export function rank(values: (number | undefined)[]): Mark[] {
  const known = values.filter((v): v is number => v !== undefined);
  const low = Math.min(...known);
  const high = Math.max(...known);
  if (known.length < 2 || low === high) return values.map(() => undefined);
  return values.map((v) => (v === undefined ? undefined : v === low ? "low" : v === high ? "high" : "mid"));
}
