import { FUEL_LABELS, GEARBOX_LABELS } from "./types";
import type { Car } from "./types";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const km = new Intl.NumberFormat("en-IE");

export const formatPrice = (n: number) => eur.format(n);
export const formatKm = (n: number) => `${km.format(n)} km`;
export const formatCount = (n: number) => km.format(n); // 1,163, as the rest of the site writes a number

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
    ["Body type", car.bodyType],
    ["Engine", car.engineLitres === undefined ? undefined : `${car.engineLitres.toFixed(1)} L`],
    ["Colour", car.colour],
    ["Doors", car.doors === undefined ? undefined : String(car.doors)],
    ["Seats", car.seats === undefined ? undefined : String(car.seats)],
    ["Owners", car.owners === undefined ? undefined : String(car.owners)],
    ["NCT expires", car.nctExpiry && nctLabel(car.nctExpiry)],
    ["Max speed", car.maxSpeedMph === undefined ? undefined : `${car.maxSpeedMph} mph`],
    ["0 to 62 mph", car.zeroTo62Secs === undefined ? undefined : `${car.zeroTo62Secs} s`],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

// The first four present of Year, Mileage, Fuel, Transmission, Body type, Engine, Colour: spec order is the priority order.
const KEY_LABELS = ["Year", "Mileage", "Fuel", "Transmission", "Body type", "Engine", "Colour"];
export const keyFacts = (car: Car) => specRows(car).filter((r) => KEY_LABELS.includes(r.label)).slice(0, 4);

export const countLabel = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${formatCount(n)} cars`);
