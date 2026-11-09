import demoCars from "./demo-cars.json";
import type { DevMode } from "../dev-modes";
import type { Review, Reviews } from "../reviews";
import type { Car, Photo } from "./types";

// break-ui: the worst realistic stock, for the dev-only Demo / Worst case switch (src/lib/dev-data.ts). Dev builds only; never imported in production.
// Every value is something a dealer feed can produce. Photos reuse real demo files so the layout is judged on the data, not on missing images.
const demo = demoCars as Car[];
const six: Photo[] = demo[0].photos;
const photos = (n: number): Photo[] => six.slice(0, n);

let next = 9_000_001;
let pad = 8_000_001; // fillers sort below the worst cars, which are newest first
const car = (c: Omit<Car, "id" | "slug" | "makeSlug" | "modelSlug"> & { makeSlug?: string; modelSlug?: string }): Car => {
  const id = String(next++);
  const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const makeSlug = c.makeSlug ?? slug(c.make);
  const modelSlug = c.modelSlug ?? slug(c.model);
  return { ...c, id, makeSlug, modelSlug, slug: `${makeSlug}-${modelSlug}-${c.year}-${id}` };
};

// A dealer's pasted text: 2,000 characters, line breaks, a bare URL, markup characters, emoji.
const LONG_TEXT = [
  "FULL SERVICE HISTORY - 2 KEYS - NCT 07/2027 <b>no accidents</b> & never smoked in!!",
  "See the full video walk-around at https://www.example.com/dealers/kerry/used-cars/walkaround/9f8e7d6c5b4a?tab=video&source=autotrader&ref=website-listing-widget-2026",
  "",
  "Finance available. Trade-ins welcome. Nationwide delivery 🚚 from €150. Call or WhatsApp 083 133 3154 anytime 👍",
  ...Array.from({ length: 12 }, (_, i) => `Line ${i + 1}: Recent timing belt, water pump, brake discs and pads, four new tyres, full valet and 12 months NCT. Warranty included on engine and gearbox.`),
].join("\n").slice(0, 2000);

// Equipment: 94 items (the demo's own maximum), one 120 characters long, one a single unbreakable code.
const FEATURES = [
  ...Array.from({ length: 90 }, (_, i) => ["Central Locking", "Electric Windows", "Airbag", "Cruise Control", "Heated Seats", "Parking Sensors"][i % 6]),
  "Adaptive LED Matrix Headlights with Dynamic Cornering Light and Automatic High Beam Assist plus Front Camera Washer System",
  "ISOFIX-Child-Seat-Anchors-On-Both-Rear-Outer-Seats-And-Front-Passenger-Seat",
  "A",
  "Sat Nav",
];

const worst: Car[] = [
  // Long everything: the title, the variant, the colour, the price column.
  car({ make: "Mercedes-Benz", model: "Sprinter 316 CDI Crew Cab Dropside Tipper", variant: "2.0 TDI 150HP 4X4 Ambition 7 Seat Special Edition Panoramic Roof Pack", year: 2019, priceEur: 38950, mileageKm: 612345, fuel: "diesel", gearbox: "automatic", bodyType: "Pickup", bodySlug: "pickup", engineLitres: 2.1, colour: "Metallic Pearl White Tricoat", doors: 4, seats: 7, owners: 4, nctExpiry: "2027-07", maxSpeedMph: 112, zeroTo62Secs: 14.8, description: LONG_TEXT, features: FEATURES, photos: photos(6) }),
  // Almost nothing: no variant, mileage, fuel, gearbox, body, no photos, no equipment, the cheapest and oldest.
  car({ make: "Škoda", model: "Octavia", year: 1998, priceEur: 950, photos: [] }),
  // The other end: a six-figure price, zero km, a single photo, a very long colour.
  car({ make: "Ferrari", model: "812 GTS", variant: "6.5 V12", year: 2022, priceEur: 349000, mileageKm: 0, fuel: "petrol", gearbox: "automatic", bodyType: "Coupe", bodySlug: "coupe", engineLitres: 6.5, colour: "Rosso Corsa Metallic Tri-coat Pearl", doors: 2, seats: 2, owners: 1, maxSpeedMph: 211, zeroTo62Secs: 3, description: "One owner.", features: ["Carbon Ceramic Brakes"], photos: photos(1) }),
  // A photo that 404s, and diacritics that stack.
  car({ make: "Citroën", model: "Berlingo Multispace", variant: "1.6 BlueHDi 100 Feel Edition Lounge Pack Plus", year: 2021, priceEur: 17995, mileageKm: 48210, fuel: "diesel", gearbox: "manual", bodyType: "MPV", bodySlug: "mpv", engineLitres: 1.6, colour: "Grey", doors: 5, seats: 5, owners: 1, nctExpiry: "bad-date", description: "Ready to go.", features: ["Sat Nav"], photos: [{ src: "/stock/does-not-exist/1-missing.webp", width: 900, height: 675 }, ...photos(2)] }),
  // The shortest names there are, and every optional field present.
  car({ make: "MG", model: "ZS", variant: "EV", year: 2023, priceEur: 21495, mileageKm: 9, fuel: "electric", gearbox: "automatic", bodyType: "SUV", bodySlug: "suv", engineLitres: 0, colour: "Red", doors: 5, seats: 5, owners: 0, nctExpiry: "2030-12", maxSpeedMph: 108, zeroTo62Secs: 8.2, description: "x", features: ["x"], photos: photos(2) }),
  // A sold car with the longest name, so the sold card is tested too.
  car({ make: "Land Rover", model: "Range Rover Sport Autobiography Dynamic", variant: "3.0 SDV6 HSE Dynamic Black Pack Panoramic Roof Meridian Sound", year: 2017, priceEur: 54950, mileageKm: 133000, fuel: "plug-in-hybrid", gearbox: "automatic", bodyType: "SUV", bodySlug: "suv", engineLitres: 3, colour: "Santorini Black", doors: 5, seats: 5, owners: 3, description: LONG_TEXT, features: FEATURES.slice(0, 13), photos: photos(6), soldAt: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10) }),
  // An unbreakable model name and a make that is not in the demo.
  car({ make: "Volkswagen", model: "Caravelle-Executive-Long-Wheelbase-Trendline", variant: "T6.1", year: 2020, priceEur: 61500, mileageKm: 90500, fuel: "diesel", gearbox: "automatic", bodyType: "MPV", bodySlug: "mpv", engineLitres: 2, colour: "Black", doors: 5, seats: 8, owners: 2, description: LONG_TEXT.slice(0, 600), features: FEATURES.slice(0, 40), photos: photos(4) }),
];

// Filler so a page holds more than one page of results, with the same names twice over (identical cards, different ids).
const padded = (n: number, from: Car[]): Car[] =>
  Array.from({ length: n }, (_, i) => {
    const b = from[i % from.length];
    const id = String(pad++);
    return { ...b, id, slug: `${b.makeSlug}-${b.modelSlug}-${b.year}-${id}` };
  });

const FIXTURES: Record<Exclude<DevMode, "demo">, () => Car[]> = {
  worst: () => [...worst, ...padded(25, [...worst, ...demo.slice(0, 8)])],
  empty: () => [],
  one: () => [worst[0]],
  huge: () => [...worst, ...padded(1277, [...worst, ...demo])],
};
const cache = new Map<DevMode, Car[]>();
export const fixtureCars = (mode: Exclude<DevMode, "demo">): Car[] => {
  if (!cache.has(mode)) cache.set(mode, FIXTURES[mode]());
  return cache.get(mode)!;
};

// The same switch for the reviews strip (null is the "no reviews" case: the strip renders nothing).
const rev = (n: number, r: Partial<Review>): Review => ({ id: `worst-${n}`, author: "A", rating: 5, text: "", relativeTime: "a month ago", reviewUri: "https://www.google.com/maps/", ...r });
const WORST_REVIEWS: Review[] = [
  rev(1, { author: "Aleksandra Wiśniewska-Kowalczyk", rating: 5, text: LONG_TEXT, relativeTime: "11 months ago", photoUri: "https://lh3.googleusercontent.example/a/does-not-exist", authorUri: "https://www.google.com/maps/contrib/1" }),
  rev(2, { author: "J", rating: 1, text: "" }),
  rev(3, { author: "نور الهدى عبد الرحمن", rating: 4, text: "سيارة ممتازة وخدمة جيدة جدا", languageCode: "ar", relativeTime: "3 years ago" }),
  rev(4, { author: "Christopher Alexander Montgomery III", rating: 3, text: "See https://www.example.com/reviews/9f8e7d6c5b4a4c3d8e2f1a0b9c8d7e6f/original-post-with-photos-and-a-very-long-address-that-never-breaks", relativeTime: "12 days ago" }),
  rev(5, { author: "🦊 Fox", rating: 5, text: "Brilliant 👩🏽‍💻🚗", relativeTime: "a week ago" }),
];
export const worstReviews = (mode: DevMode): Reviews | null | undefined => {
  const base = { source: "google" as const, placeUri: "https://www.google.com/maps/" };
  if (mode === "empty") return null;
  if (mode === "one") return { ...base, rating: 5, count: 1, reviews: [WORST_REVIEWS[4]] };
  if (mode === "worst" || mode === "huge") return { ...base, rating: 4.6, count: 1284, reviews: WORST_REVIEWS };
};
