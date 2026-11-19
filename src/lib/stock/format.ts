import { FUEL_LABELS, GEARBOX_LABELS } from "./types";
import type { Car } from "./types";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const km = new Intl.NumberFormat("en-IE");

export const formatPrice = (n: number) => eur.format(n);
export const formatKm = (n: number) => `${km.format(n)} km`;
export const formatCount = (n: number) => km.format(n); // 1,163, as the rest of the site writes a number
const KM_PER_MILE = 1.609344;

export const carTitle = (car: Pick<Car, "make" | "model" | "variant">) => [car.make, car.model, car.variant].filter(Boolean).join(" ");
export const carName = (car: Pick<Car, "year" | "make" | "model">) => `${car.year} ${car.make} ${car.model}`;
// What a lead dialog shows of a car (CarSummary). Only these fields cross into client components, never the Car (LED-02).
export const carSummary = (car: Car) => ({ id: car.id, name: carName(car), title: carTitle(car), price: formatPrice(car.priceEur), photo: car.photos[0]?.src });

export const carMeta = (car: Car) =>
  [
    car.year,
    car.mileageKm !== undefined && formatKm(car.mileageKm),
    car.fuel && FUEL_LABELS[car.fuel],
    car.gearbox && GEARBOX_LABELS[car.gearbox],
  ]
    .filter(Boolean)
    .join(" · ");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2027-07" -> "Jul 2027". Fixed names, not Intl, so the Worker and Node print the same text.
const nctLabel = (s: string) => {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : undefined;
};

// Every spec the car has, in the order the page shows them. Rows with no value are left out (D-10); road tax is dropped on purpose (stale due dates).
export function specRows(car: Car): { label: string; value: string }[] {
  const rows: [string, string | undefined][] = [
    ["Year", String(car.year)],
    ["Mileage", car.mileageKm === undefined ? undefined : formatKm(car.mileageKm)],
    ["Fuel", car.fuel && FUEL_LABELS[car.fuel]],
    ["Transmission", car.gearbox && GEARBOX_LABELS[car.gearbox]],
    ["Body Type", car.bodyType],
    ["Engine", car.engineLitres === undefined ? undefined : `${car.engineLitres.toFixed(1)} L`],
    ["Colour", car.colour],
    ["Doors", car.doors === undefined ? undefined : String(car.doors)],
    ["Seats", car.seats === undefined ? undefined : String(car.seats)],
    ["Owners", car.owners ? String(car.owners) : undefined], // 0 owners (a new car) is no row
    ["NCT Expires", car.nctExpiry && nctLabel(car.nctExpiry)],
    // Published in mph; an Irish site reads km/h. 62 mph is 100 km/h, so the sprint time stands as it is.
    ["Max Speed", car.maxSpeedMph === undefined ? undefined : `${Math.round(car.maxSpeedMph * KM_PER_MILE)} km/h`],
    ["0 to 100 km/h", car.zeroTo62Secs === undefined ? undefined : `${car.zeroTo62Secs} s`],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

// The first four present of Year, Mileage, Fuel, Transmission, Body type, Engine, Colour: spec order is the priority order.
const KEY_LABELS = ["Year", "Mileage", "Fuel", "Transmission", "Body Type", "Engine", "Colour"];
export const keyFacts = (car: Car) => specRows(car).filter((r) => KEY_LABELS.includes(r.label)).slice(0, 4);

export const countLabel = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${formatCount(n)} cars`);

// Dealer text as plain words: tags dropped (a <br> or </p> becomes a line break) and the common entities decoded. React still escapes
// what is left, so this is about looks, not safety.
export const plainText = (s: string) =>
  s
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// A sold car's text without the selling: each sentence or line that offers finance, trade-ins, delivery, a warranty or a viewing, or
// asks the reader to buy, goes; the facts about the car stay.
const SELLING = /\b(?:financ\w*|trade[- ]?ins?|part exchange|deliver(?:y|ies)|warrant\w*|viewings?|walk ?through|online sales|purchase|buy (?:with|in) \w+)\b/i;
export const withoutSelling = (s: string) =>
  s
    .split("\n")
    .flatMap((line) => {
      const kept = line.split(/(?<=[.!?])\s+/).filter((sentence) => !SELLING.test(sentence)).join(" ");
      return kept || !line.trim() ? [kept] : []; // a line that was all selling goes, a blank line stays
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Equipment as a buyer reads it: no dealer services (finance or history checked, trade-ins, warranty), no repeats, and a general item
// left out when a more specific one names it (Sunroof beside Panoramic sunroof, Parking sensors beside Rear parking sensors). Feed order kept.
const NOT_EQUIPMENT = /^(?:finance checked|history checked|trade[- ]?ins? accepted|.*\bwarranty)$/i;
// Two names for one thing, mapped to the one they are compared as.
const SAME: Record<string, string> = {
  "electronic handbrake": "electric handbrake",
  "satellite navigation": "navigation system",
  "sat nav": "navigation system",
  immobiliser: "immobilizer",
  "apple car play": "apple carplay",
  alarm: "alarm system",
  "hill holder": "hill hold assist",
  "sports suspension": "sport suspension",
  "stability cont": "stability control",
  "automatic lights": "auto lights (dusk sensor)",
  "heated seats": "heated front seats",
  "parking camera": "reversing camera",
  "remote boot release": "remote boot/hatch/rear door release",
  "electric boot": "motorised tailgate",
};
const featureKey = (f: string) => {
  const k = f.toLowerCase().replace(/\s+/g, " ").trim();
  return SAME[k] ?? k;
};
export function cleanFeatures(features: string[]): string[] {
  const kept = features.filter((f) => f.trim() && !NOT_EQUIPMENT.test(f.trim()));
  const keys = kept.map(featureKey);
  return kept.filter((_, i) => keys.indexOf(keys[i]) === i && !keys.some((k) => k.endsWith(` ${keys[i]}`)));
}
