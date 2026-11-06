import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import { buildLeadEmail } from "./email";
import type { LeadRow } from "./process";

const row: LeadRow = {
  id: "00000000-0000-4000-8000-000000000001",
  clientRef: "00000000-0000-4000-8000-000000000002",
  type: "enquiry",
  carId: "4359693",
  carSlug: "mercedes-benz-g-class-2011-4359693",
  carTitle: "2011 Mercedes-Benz G Class",
  carPriceEur: 75950,
  sourcePath: "/used-cars/mercedes-benz-g-class-2011-4359693",
  name: "SENTINEL_NAME",
  phone: "SENTINEL_PHONE",
  email: "sentinel@example.com",
  message: "SENTINEL_MESSAGE\nsecond line",
  details: {},
  photoKeys: [],
  consentAt: new Date("2026-11-06T10:00:00Z"),
  consentVersion: "2026-11-06",
};

describe("buildLeadEmail", () => {
  it("prefixes [DEMO] on the demo and not in production", () => {
    expect(buildLeadEmail(row, { demo: true }).subject).toBe("[DEMO] Enquiry: 2011 Mercedes-Benz G Class");
    expect(buildLeadEmail(row, { demo: false }).subject).toBe("Enquiry: 2011 Mercedes-Benz G Class");
  });

  it("keeps everything the buyer typed out of the subject", () => {
    const { subject } = buildLeadEmail(row, { demo: false });
    for (const s of ["SENTINEL", "sentinel@example.com"]) expect(subject).not.toContain(s);
  });

  it("puts the contact details, car page and consent version in the body", () => {
    const { text } = buildLeadEmail(row, { demo: false });
    expect(text).toContain("SENTINEL_NAME");
    expect(text).toContain("SENTINEL_MESSAGE\nsecond line");
    expect(text).toContain(`Car page: ${SITE_URL}/used-cars/${row.carSlug}`);
    expect(text).toContain("version 2026-11-06");
    expect(text).toContain("2026-11-06T10:00:00.000Z");
  });

  it("leaves the car out of the subject and body when the lead has no car", () => {
    const noCar = { ...row, carId: null, carSlug: null, carTitle: null, carPriceEur: null };
    const { subject, text } = buildLeadEmail(noCar, { demo: false });
    expect(subject).toBe("Enquiry");
    expect(text).not.toContain("Car page:");
    expect(text).not.toContain("Car:");
    expect(text).not.toContain("Price:");
  });
});
