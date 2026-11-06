import { expect, it } from "vitest";
import { CONSENT } from "./schema";

// Every lead stores the consent version it was sent under (D-06). Changing the wording means a new version: add it here,
// never edit an old entry.
const FROZEN: Record<string, string> = {
  "2026-11-06": "I agree to Carright using these details to reply to my request.",
};

it("ties the consent wording to its version", () => {
  expect(FROZEN[CONSENT.version], `consent version ${CONSENT.version} is not frozen in this test`).toBeDefined();
  expect(CONSENT.text).toBe(FROZEN[CONSENT.version]);
});
