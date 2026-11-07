// The one repayment formula (UI-SPEC Maths): monthly rate = APR / 12, one payment a month. Pure, so it runs in the browser.
// APR / 12 treats the APR as nominal; confirm against the dealer's product when the real terms arrive (research A9, #9).
export type Quote = { monthlyEur: number; borrowedEur: number; totalEur: number; interestEur: number };
// The prices the calculator works with; the car page leaves out its Finance section for a car outside them.
export const financeable = (priceEur: number) => priceEur >= 1000 && priceEur <= 250000;

// Integer cents throughout: the monthly figure is rounded once and the total and interest come from it, so they agree.
// null for anything invalid, so the page shows "Check the figures you entered." and never NaN.
export function quote(priceEur: number, depositEur: number, termMonths: number, aprPct: number): Quote | null {
  const borrowed = priceEur - depositEur;
  if (!financeable(priceEur) ||!(depositEur >= 0) || !(borrowed > 0) || !(aprPct >= 0 && aprPct <= 30) || !Number.isInteger(termMonths) || termMonths < 1) return null;
  const r = aprPct / 100 / 12;
  const P = Math.round(borrowed * 100);
  const monthlyC = Math.round(r === 0 ? P / termMonths : (P * r) / (1 - Math.pow(1 + r, -termMonths)));
  const totalC = monthlyC * termMonths;
  return { monthlyEur: monthlyC / 100, borrowedEur: P / 100, totalEur: totalC / 100, interestEur: (totalC - P) / 100 };
}
