import { FUEL_LABELS, GEARBOX_LABELS } from "./types";
import type { Car } from "./types";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const km = new Intl.NumberFormat("en-IE");

export const formatPrice = (n: number) => eur.format(n);
export const formatKm = (n: number) => `${km.format(n)} km`;

export const carTitle = (car: Pick<Car, "make" | "model" | "variant">) => [car.make, car.model, car.variant].filter(Boolean).join(" ");
export const carName = (car: Pick<Car, "year" | "make" | "model">) => `${car.year} ${car.make} ${car.model}`;

export const carMeta = (car: Car) =>
  [
    car.year,
    car.mileageKm !== undefined && formatKm(car.mileageKm),
    car.fuel && FUEL_LABELS[car.fuel],
    car.gearbox && GEARBOX_LABELS[car.gearbox],
  ]
    .filter(Boolean)
    .join(" · ");

export const countLabel = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${n} cars`);
