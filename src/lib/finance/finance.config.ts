// PLACEHOLDER: not the dealer's terms. Replace defaults, terms and notice with the dealer's own and set placeholder to false (D-16, #9).
// finance.config.test.ts fails the deploy's test step while placeholder is true and APP_ENV is production.
export const FINANCE: {
  placeholder: boolean;
  defaults: { priceEur: number; depositEur: number; termMonths: number; aprPct: number };
  terms: readonly number[];
  notice: string;
} = {
  placeholder: true, // shows the Placeholder figures badge
  defaults: { priceEur: 15000, depositEur: 3000, termMonths: 48, aprPct: 9.9 },
  terms: [12, 24, 36, 48, 60],
  // The dealer's required wording replaces this string.
  notice: "This is an estimate only, not an approval or an offer of credit. Finance is provided through a lender, subject to status. The rate and amount you're offered depend on your circumstances and are confirmed by the lender.",
};
