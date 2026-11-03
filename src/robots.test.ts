import { expect, test } from "vitest";
import robots from "@/app/robots";

test("robots blocks everything outside production", () => {
  expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
});
