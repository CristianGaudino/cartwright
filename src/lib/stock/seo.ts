import type { Metadata } from "next";
import { DEALER_TEL, SITE_NAME, SITE_URL } from "@/lib/site";
import { carName, carTitle, formatKm, formatPrice } from "./format";
import { FUEL_LABELS, GEARBOX_LABELS, isSold } from "./types";
import type { Car } from "./types";

// The sale date never enters metadata or JSON-LD (owner instruction, 2026-11-06).
export function carDescription(car: Car): string {
  const specs = [car.mileageKm !== undefined && formatKm(car.mileageKm), car.fuel && FUEL_LABELS[car.fuel], car.gearbox && GEARBOX_LABELS[car.gearbox]].filter(Boolean).join(", ");
  return [`${car.year} ${carTitle(car)}.`, specs && `${specs}.`, isSold(car) ? "Sold." : `${formatPrice(car.priceEur)}.`, `${SITE_NAME}, Tralee, Co. Kerry.`].filter(Boolean).join(" ");
}

// No site suffix in the title: the root layout's template adds it. Image and url resolve to absolute against metadataBase.
// shortcut: the images are pre-generated for the demo by `npm run stock:og`; a live provider adds cars without a script run,
// so switch to the car's first photo or a request-time image when one lands (#16).
export function carMetadata(car: Car): Metadata {
  const title = `${car.year} ${carTitle(car)} for sale`;
  const description = carDescription(car);
  const path = `/used-cars/${car.slug}`;
  const images = [{ url: `/og/${car.id}.jpg`, width: 1200, height: 630, alt: carName(car) }];
  return { title, description, alternates: { canonical: path }, openGraph: { type: "website", url: path, title, description, images }, twitter: { card: "summary_large_image" } };
}

// Google does not treat Car as a Product subtype, so both types. A sold car keeps a price-less SoldOut offer. Undefined values vanish in JSON.stringify.
export function carJsonLd(car: Car): Record<string, unknown> {
  const url = `${SITE_URL}/used-cars/${car.slug}`;
  const sold = isSold(car);
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Car"],
    name: `${car.year} ${carTitle(car)}`,
    description: carDescription(car),
    url,
    image: car.photos.length ? car.photos.map((p) => `${SITE_URL}${p.src}`) : undefined,
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    itemCondition: "https://schema.org/UsedCondition",
    mileageFromOdometer: car.mileageKm === undefined ? undefined : { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" },
    fuelType: car.fuel && FUEL_LABELS[car.fuel],
    vehicleTransmission: car.gearbox && GEARBOX_LABELS[car.gearbox],
    bodyType: car.bodyType,
    numberOfDoors: car.doors,
    vehicleSeatingCapacity: car.seats,
    numberOfPreviousOwners: car.owners,
    color: car.colour,
    vehicleEngine: car.engineLitres === undefined ? undefined : { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: car.engineLitres, unitCode: "LTR" } },
    offers: {
      "@type": "Offer",
      url,
      itemCondition: "https://schema.org/UsedCondition",
      availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      price: sold ? undefined : car.priceEur,
      priceCurrency: sold ? undefined : "EUR",
      seller: {
        "@type": "AutoDealer",
        name: SITE_NAME,
        telephone: DEALER_TEL,
        address: { "@type": "PostalAddress", addressLocality: "Tralee", addressRegion: "Kerry", addressCountry: "IE" },
      },
    },
  };
}
