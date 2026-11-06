import { describe, expect, it } from "vitest";
import { appliedFilters, clearFilters, DEFAULT_QUERY, facetRows, PAGE_SIZE, parseStockQuery, stockHref, toggle, toSearchParams, withRange } from "./query";
import type { Facets, StockQuery } from "./types";

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

describe("withRange", () => {
  const q: StockQuery = { ...DEFAULT_QUERY, yearFrom: 2018, yearTo: 2020, priceMin: 5000, priceMax: 10000, page: 3 };
  it("applies an ordered change and resets the page", () => {
    expect(withRange(q, { yearFrom: 2019 })).toEqual({ ...q, yearFrom: 2019, page: 1 });
  });
  it("moves To up when From passes it, and From down when To passes it", () => {
    expect(withRange(q, { yearFrom: 2022 })).toMatchObject({ yearFrom: 2022, yearTo: 2022 });
    expect(withRange(q, { yearTo: 2015 })).toMatchObject({ yearFrom: 2015, yearTo: 2015 });
    expect(withRange(q, { priceMin: 20000 })).toMatchObject({ priceMin: 20000, priceMax: 20000 });
    expect(withRange(q, { priceMax: 1000 })).toMatchObject({ priceMin: 1000, priceMax: 1000 });
  });
  it("leaves an open end alone and never touches the other pair", () => {
    expect(withRange({ ...q, yearTo: undefined }, { yearFrom: 2030 })).toMatchObject({ yearFrom: 2030, yearTo: undefined, priceMin: 5000, priceMax: 10000 });
    expect(withRange(q, { yearFrom: undefined })).toMatchObject({ yearFrom: undefined, yearTo: 2020 });
  });
});

const facets: Facets = {
  make: [
    { value: "audi", label: "Audi", count: 5 },
    { value: "bmw", label: "BMW", count: 0 },
  ],
  model: [
    { value: "a4", label: "A4", count: 3, parent: "audi" },
    { value: "x1", label: "X1", count: 2, parent: "bmw" },
  ],
  body: [{ value: "suv", label: "SUV", count: 4 }],
  fuel: [{ value: "diesel", label: "Diesel", count: 4 }],
  gearbox: [],
  years: { min: 2015, max: 2023 },
};

describe("toggle", () => {
  it("adds, removes and goes back to page 1", () => {
    const on = toggle({ ...DEFAULT_QUERY, page: 3 }, "make", "audi", facets);
    expect(on.make).toEqual(["audi"]);
    expect(on.page).toBe(1);
    expect(toggle(on, "make", "audi", facets).make).toEqual([]);
    expect(toggle(DEFAULT_QUERY, "fuel", "diesel", facets).fuel).toEqual(["diesel"]);
  });

  it("removing a make drops only that make's models", () => {
    const q: StockQuery = { ...DEFAULT_QUERY, make: ["audi", "bmw"], model: ["a4", "x1"] };
    expect(toggle(q, "make", "audi", facets).model).toEqual(["x1"]);
    expect(toggle(q, "model", "a4", facets).make).toEqual(["audi", "bmw"]);
  });

  it("keeps a model another selected make also has", () => {
    const shared: Facets = { ...facets, model: [...facets.model, { value: "a4", label: "A4", count: 1, parent: "bmw" }] };
    const q: StockQuery = { ...DEFAULT_QUERY, make: ["audi", "bmw"], model: ["a4"] };
    expect(toggle(q, "make", "audi", shared).model).toEqual(["a4"]);
  });
});

describe("appliedFilters", () => {
  const q: StockQuery = {
    q: "a4", make: ["audi"], model: ["a4"], yearFrom: 2018, yearTo: 2022, priceMin: 5000, priceMax: 20000,
    body: ["suv"], fuel: ["diesel"], gearbox: "manual", kmMax: 100000, sort: "price-asc", page: 2, pageSize: 12,
  };

  it("gives one entry per filter in group order", () => {
    expect(appliedFilters(q, facets).map((f) => f.label)).toEqual([
      "Search: a4", "Audi", "A4", "From 2018", "To 2022", "From €5,000", "Up to €20,000", "SUV", "Diesel", "Manual", "Up to 100,000 km",
    ]);
    expect(appliedFilters(DEFAULT_QUERY, null)).toEqual([]);
  });

  it("each next removes exactly that filter, keeps the sort and resets the page", () => {
    for (const f of appliedFilters(q, facets)) {
      expect(f.next.page).toBe(1);
      expect(f.next.sort).toBe("price-asc");
      expect(appliedFilters(f.next, facets)).toHaveLength(appliedFilters(q, facets).length - (f.id === "make:audi" ? 2 : 1));
    }
  });

  it("falls back to the raw value without facets", () => {
    expect(appliedFilters({ ...DEFAULT_QUERY, make: ["audi"] }, null)[0].label).toBe("audi");
  });
});

describe("facetRows", () => {
  it("counted: shows counts, disables an unselected zero-count option, keeps a selected one enabled", () => {
    expect(facetRows(facets.make, [], true)).toEqual([
      { value: "audi", label: "Audi", count: 5, disabled: false },
      { value: "bmw", label: "BMW", count: 0, disabled: true },
    ]);
    expect(facetRows(facets.make, ["bmw"], true)[1]).toEqual({ value: "bmw", label: "BMW", count: 0, disabled: false });
  });

  it("not counted: every option, no counts, none disabled", () => {
    const rows = facetRows(facets.make, [], false);
    expect(rows).toEqual([
      { value: "audi", label: "Audi", disabled: false },
      { value: "bmw", label: "BMW", disabled: false },
    ]);
    expect(rows.every((r) => !("count" in r))).toBe(true);
  });

  it("appends a selected value missing from the options, labelled with its raw value", () => {
    expect(facetRows(facets.make, ["zzz"], true).at(-1)).toEqual({ value: "zzz", label: "zzz", disabled: false });
  });

  it("with no facets at all, shows the selected values alone", () => {
    expect(facetRows([], ["audi"], false)).toEqual([{ value: "audi", label: "audi", disabled: false }]);
  });
});
