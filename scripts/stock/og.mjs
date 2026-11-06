// OG share images (plan 02-08, D-16). Manual: never run in CI, at build time or at runtime.
//
//   npm run stock:og     reads src/lib/stock/demo-cars.json, writes public/og/{id}.jpg (1200 x 630, progressive JPEG)
//
// Layout is fixed in 02-UI-SPEC.md "OG image". The text band is drawn by satori + resvg, which ship inside `next`;
// we import them from the internal path below (Assumption A1: re-check it on every Next upgrade, or switch to
// satori + @resvg/resvg-js as devDependencies). `sharp` (already a devDependency) lays the photo under the band.
// The font in scripts/stock/fonts/ is Inter SemiBold (SIL Open Font License), used by this script only and never served.
// The sale date decides "sold" and is never drawn.
//
// shortcut: files are named {id}.jpg, not content-hashed, so a platform that already cached a link may show an old image until it re-fetches; fine for the demo.

import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createElement as h } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

const CARS = "src/lib/stock/demo-cars.json";
const OUT = "public/og";
const W = 1200;
const H = 630;
const BAND = 168;
const PHOTO_H = H - BAND; // 462
const SAFE = 48;
const INK = "#0E0E10";
const PHOTO_BG = "#26262B";
const MAX_BYTES = 200_000;

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const font = readFileSync("scripts/stock/fonts/Inter-SemiBold.ttf");
const logo = readFileSync("public/brand/logo.png");
const logoMeta = await sharp(logo).metadata();
const LOGO_H = 72;
const LOGO_W = Math.round((logoMeta.width / logoMeta.height) * LOGO_H);
const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

async function layer(element, width, height) {
  const res = new ImageResponse(element, { width, height, fonts: [{ name: "Inter", data: font, weight: 600, style: "normal" }] });
  return Buffer.from(await res.arrayBuffer());
}

const text = (size, color, extra) => ({ fontFamily: "Inter", fontWeight: 600, fontSize: size, color, ...extra });

function band(car, sold) {
  const name = h("div", { style: text(40, "#fff", { lineHeight: "48px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }, `${car.year} ${car.make} ${car.model}`);
  const price = sold ? null : h("div", { style: text(56, "#fff", { lineHeight: "64px", fontVariantNumeric: "tabular-nums" }) }, eur.format(car.priceEur));
  const left = h(
    "div",
    { style: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: sold ? "center" : "flex-start", paddingTop: sold ? 0 : 28 } },
    name,
    price,
  );
  const mark = h("img", { src: logoSrc, width: LOGO_W, height: LOGO_H, style: { marginLeft: 32 } });
  return h("div", { style: { display: "flex", alignItems: "center", width: W, height: BAND, padding: `0 ${SAFE}px`, background: INK } }, left, mark);
}

// The top 462px layer: the "No photo yet" surface, or the sold overlay with its pill. Null when the photo needs nothing on top.
function top(car, sold) {
  const hasPhoto = car.photos.length > 0;
  if (hasPhoto && !sold) return null;
  const frame = { display: "flex", alignItems: "center", justifyContent: "center", width: W, height: PHOTO_H, position: "relative", background: hasPhoto ? "rgba(14, 14, 16, 0.45)" : PHOTO_BG };
  const empty = hasPhoto ? null : h("div", { style: text(40, "#A1A1AA", { display: "flex" }) }, "No photo yet");
  const pill = sold ? h("div", { style: text(40, "#fff", { position: "absolute", top: SAFE, left: SAFE, display: "flex", padding: "20px 48px", borderRadius: 999, background: INK }) }, "Sold") : null;
  return h("div", { style: frame }, empty, pill);
}

async function render(car) {
  const sold = Boolean(car.soldAt);
  const layers = [];
  if (car.photos.length) layers.push({ input: await sharp(`public${car.photos[0].src}`).resize(W, PHOTO_H, { fit: "cover", position: "centre" }).png().toBuffer(), top: 0, left: 0 });
  const overlay = top(car, sold);
  if (overlay) layers.push({ input: await layer(overlay, W, PHOTO_H), top: 0, left: 0 });
  layers.push({ input: await layer(band(car, sold), W, BAND), top: PHOTO_H, left: 0 });
  return sharp({ create: { width: W, height: H, channels: 3, background: INK } })
    .composite(layers)
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();
}

const cars = JSON.parse(readFileSync(CARS, "utf8"));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const car of cars) writeFileSync(`${OUT}/${car.id}.jpg`, await render(car));

const sizes = readdirSync(OUT).map((f) => [f, statSync(`${OUT}/${f}`).size]);
const total = sizes.reduce((n, [, s]) => n + s, 0);
const [bigName, big] = sizes.reduce((a, b) => (b[1] > a[1] ? b : a));
console.log(`${sizes.length} images, largest ${bigName} (${(big / 1000).toFixed(0)} KB), total ${(total / 1e6).toFixed(2)} MB`);
const over = sizes.filter(([, s]) => s >= MAX_BYTES);
if (over.length) {
  console.error(`Over ${MAX_BYTES / 1000} KB:\n${over.map(([f, s]) => `  ${f} ${s}`).join("\n")}`);
  process.exit(1);
}
