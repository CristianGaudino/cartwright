import { describe, expect, it } from "vitest";
import { clearFilters, DEFAULT_QUERY, PAGE_SIZE, parseStockQuery, stockHref, toSearchParams } from "./query";
import type { StockQuery } from "./types";

describe("parseStockQuery", () => {
  it("gives the default query for no params and always uses a page size of 12", () => {
    expect(parseStockQuery({})).toEqual(DEFAULT_QUERY);
    expect(PAGE_SIZE).toBe(12);
    expect(parseStockQuery({ pageSize: "500" }).pageSize).toBe(12);
  });

  it("uses the first value of a repeated param", () => {
    expect(parseStockQuery({ make: ["audi", "bmw"] }).make).toEqual(["audi"]);
  });

  it("trims q and cuts it to 80 characters; an empty q becomes undefined", () => {
    expect(parseStockQuery({ q: "  a4  " }).q).toBe("a4");
    expect(parseStockQuery({ q: "x".repeat(200) }).q).toHaveLength(80);
    expect(parseStockQuery({ q: "   " }).q).toBeUndefined();
    expect(parseStockQuery({ q: "" }).q).toBeUndefined();
  });

  it("cleans slug lists: trimmed, lowercased, de-duplicated, junk dropped", () => {
    expect(parseStockQuery({ make: "Audi, bmw,audi" }).make).toEqual(["audi", "bmw"]);
    expect(parseStockQuery({ make: "<script>" }).make).toEqual([]);
    expect(parseStockQuery({ model: "3-series,x1" }).model).toEqual(["3-series", "x1"]);
    expect(parseStockQuery({ body: "suv,hatchback" }).body).toEqual(["suv", "hatchback"]);
  });

  it("drops a slug over 40 characters and caps a list at 20 values", () => {
    expect(parseStockQuery({ make: "a".repeat(41) }).make).toEqual([]);
    expect(parseStockQuery({ make: "a".repeat(40) }).make).toHaveLength(1);
    const many = Array.from({ length: 25 }, (_, i) => `make${i}`).join(",");
    expect(parseStockQuery({ make: many }).make).toHaveLength(20);
  });

  it("keeps only known fuels and gearboxes", () => {
    expect(parseStockQuery({ fuel: "diesel,banana" }).fuel).toEqual(["diesel"]);
    expect(parseStockQuery({ fuel: "plug-in-hybrid" }).fuel).toEqual(["plug-in-hybrid"]);
    expect(parseStockQuery({ gearbox: "automatic" }).gearbox).toBe("automatic");
    expect(parseStockQuery({ gearbox: "cvt" }).gearbox).toBeUndefined();
  });

  it("keeps only whole numbers inside their bounds", () => {
    expect(parseStockQuery({ yearFrom: "abc" }).yearFrom).toBeUndefined();
    expect(parseStockQuery({ yearFrom: "1900" }).yearFrom).toBeUndefined();
    expect(parseStockQuery({ yearFrom: "2019.5" }).yearFrom).toBeUndefined();
    expect(parseStockQuery({ yearFrom: "2019" }).yearFrom).toBe(2019);
    expect(parseStockQuery({ yearTo: "2101" }).yearTo).toBeUndefined();
    expect(parseStockQuery({ priceMax: "10000001" }).priceMax).toBeUndefined();
    expect(parseStockQuery({ priceMin: "0" }).priceMin).toBe(0);
    expect(parseStockQuery({ kmMax: "60000" }).kmMax).toBe(60000);
    expect(parseStockQuery({ kmMax: "2000001" }).kmMax).toBeUndefined();
  });

  it("falls back for a bad page or sort", () => {
    expect(parseStockQuery({ page: "0" }).page).toBe(1);
    expect(parseStockQuery({ page: "10001" }).page).toBe(1);
    expect(parseStockQuery({ page: "3" }).page).toBe(3);
    expect(parseStockQuery({ sort: "bogus" }).sort).toBe("newest");
    expect(parseStockQuery({ sort: "price-asc" }).sort).toBe("price-asc");
  });

  it("ignores unknown params without throwing", () => {
    expect(() => parseStockQuery({ foo: "bar", constructor: "x" })).not.toThrow();
    expect(parseStockQuery({ foo: "bar" })).toEqual(DEFAULT_QUERY);
  });
});

describe("stockHref and toSearchParams", () => {
  it("is /used-cars with no params", () => {
    expect(stockHref(DEFAULT_QUERY)).toBe("/used-cars");
  });

  it("writes lists with plain commas and omits default sort and page", () => {
    expect(stockHref({ ...DEFAULT_QUERY, make: ["audi", "bmw"] })).toBe("/used-cars?make=audi,bmw");
    expect(stockHref({ ...DEFAULT_QUERY, sort: "newest", page: 1 })).toBe("/used-cars");
  });

  it("writes params in the UI-SPEC order", () => {
    const full: StockQuery = {
      q: "a4",
      make: ["audi"],
      model: ["a4"],
      yearFrom: 2018,
      yearTo: 2022,
      priceMin: 5000,
      priceMax: 20000,
      body: ["saloon"],
      fuel: ["diesel"],
      gearbox: "manual",
      kmMax: 100000,
      sort: "price-asc",
      page: 2,
      pageSize: 12,
    };
    expect([...toSearchParams(full).keys()]).toEqual([
      "q", "make", "model", "yearFrom", "yearTo", "priceMin", "priceMax", "body", "fuel", "gearbox", "kmMax", "sort", "page",
    ]);
  });

  it("encodes free text so it cannot break out of the URL", () => {
    expect(stockHref({ ...DEFAULT_QUERY, q: "a&b=c" })).toBe("/used-cars?q=a%26b%3Dc");
  });

  it("round trips full queries", () => {
    const queries: StockQuery[] = [
      DEFAULT_QUERY,
      { ...DEFAULT_QUERY, q: "x1 sport", make: ["bmw"], model: ["x1", "3-series"], sort: "km-asc", page: 4 },
      {
        q: "a4",
        make: ["audi", "bmw"],
        model: ["a4"],
        yearFrom: 2018,
        yearTo: 2022,
        priceMin: 5000,
        priceMax: 20000,
        body: ["suv", "hatchback"],
        fuel: ["diesel", "plug-in-hybrid"],
        gearbox: "automatic",
        kmMax: 100000,
        sort: "price-desc",
        page: 2,
        pageSize: 12,
      },
      { ...DEFAULT_QUERY, priceMin: 0, fuel: ["electric"], sort: "year-desc" },
    ];
    for (const x of queries) {
      expect(parseStockQuery(Object.fromEntries(toSearchParams(x)))).toEqual(x);
    }
  });
});

describe("clearFilters", () => {
  it("keeps only the sort", () => {
    const q: StockQuery = { ...DEFAULT_QUERY, q: "a4", make: ["audi"], fuel: ["diesel"], kmMax: 50000, sort: "price-asc", page: 3 };
    expect(clearFilters(q)).toEqual({ ...DEFAULT_QUERY, sort: "price-asc" });
  });
});
