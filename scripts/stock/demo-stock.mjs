// Demo stock pipeline (plan 01-03). Manual, one-run tool: never used in CI, at build time or at runtime.
//
//   node scripts/stock/demo-stock.mjs fetch [--limit N] [--no-photos]   network, into .stock-cache/
//   node scripts/stock/demo-stock.mjs build [--limit N] [--report]      offline, from .stock-cache/ only
//
// Requests the owner authorised (D-01 scraped once, D-10 one listing call, D-13 one-time run):
//   one GET /used-cars/, one GET of the theme main.js, one listing POST, and one GET /car-details/ per car
//   only when the listing lacks what we need (the listing carries every spec but only the main photo URL,
//   so the detail page is read for the gallery). Dealer site: at least 1500 ms apart; photo CDN (c0.carsie.ie):
//   at least 300 ms apart. Never retried, redirects are not followed, every request logged.
// The data and photos belong to the dealer and CarsIreland and are for the private pitch only (D-04).

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const CACHE = ".stock-cache";
const LOG = join(CACHE, "requests.log");
const LIST_RAW = join(CACHE, "list.raw.json");
const OUT_JSON = "src/lib/stock/demo-cars.json";
const OUT_PHOTOS = "public/stock";
const DEALER = "www.cartwright.ie";
const HOSTS = [DEALER, "c0.carsie.ie"];
const UA = "cartwright-demo-build/1.0";
const LIST_PATH = "wp-json/api/v2/search/cars";
const LISTINGS_PATH = ["data", "cars"]; // where the listings array sits in list.raw.json (seen in main.js: e.data.cars)
const PAGE_SIZE = 100; // the site asks for 8 at a time; one call must cover the whole stock (page total is about 57)
const PHOTO_W = 900;
const PHOTO_H = 675;
const MAX_PHOTOS = 6;
const MIN_PHOTOS = 3;
// Demo sold cars: id -> days before the build day. Sale dates are relative so the demo shows sold cars whenever it is built
// (re-run `build` before a pitch); tests pin their own clock. Every id must be among the built cars.
const SOLD_DAYS_AGO = {
  4521033: 4, // Tesla, the only one: a make with just a recently sold car
  4491477: 1, // Ford, lowest id: sold, make still has stock
  4359735: 9, // Volkswagen, lowest id: sold, make still has stock
  4532458: 120, // Volvo, the only one: expired, make with no car at all
  4396311: 45, // Hyundai, lowest id: expired, make still has stock
};

const USAGE = "Usage: demo-stock.mjs fetch|build [--limit N] [--no-photos|--report]";
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const limitAt = rest.indexOf("--limit");
const LIMIT = limitAt >= 0 ? Number(rest[limitAt + 1]) : Infinity;
if (limitAt >= 0 && !(Number.isInteger(LIMIT) && LIMIT > 0)) {
  console.error(USAGE);
  process.exit(1);
}
// The one selection rule: the first N listings by numeric id ascending.
const select = (items) => [...items].sort((a, b) => Number(a.id) - Number(b.id)).slice(0, LIMIT);

const readCache = (p) => (existsSync(p) ? readFileSync(p) : null);
const ensureDir = (p) => mkdirSync(dirname(p), { recursive: true });
function writeCache(p, data) {
  ensureDir(p);
  writeFileSync(p, data);
}

// ---------- fetch ----------

const lastSent = new Map();
async function get(url, init = {}) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !HOSTS.includes(u.host)) throw new Error(`Refusing ${url}`);
  const gap = u.host === DEALER ? 1500 : 300;
  const wait = (lastSent.get(u.host) ?? 0) + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSent.set(u.host, Date.now());
  writeCache(join(CACHE, ".gitignore"), "*\n"); // the cache ignores itself
  appendFileSync(LOG, `${new Date().toISOString()} ${init.method ?? "GET"} ${u.host} ${u.pathname}${u.search}\n`);
  // redirect: "manual" so a 3xx is a hard failure below, not an unlogged, unthrottled, un-allowlisted extra request.
  const res = await fetch(url, { ...init, redirect: "manual", headers: { "User-Agent": UA, ...init.headers } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function printTotals() {
  const lines = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean) : [];
  const t = { "www.cartwright.ie used-cars page": 0, "www.cartwright.ie main.js": 0, "www.cartwright.ie listing POST": 0, "www.cartwright.ie car-details": 0, "c0.carsie.ie photos": 0 };
  for (const l of lines) {
    const [, method, host, path] = l.split(" ");
    if (host !== DEALER) t["c0.carsie.ie photos"]++;
    else if (method === "POST") t["www.cartwright.ie listing POST"]++;
    else if (path.startsWith("/used-cars/")) t["www.cartwright.ie used-cars page"]++;
    else if (path.startsWith("/car-details/")) t["www.cartwright.ie car-details"]++;
    else t["www.cartwright.ie main.js"]++;
  }
  console.log("Request totals (whole log):", JSON.stringify(t, null, 2));
}

async function cached(path, fetcher) {
  const hit = readCache(path);
  if (hit) return hit;
  const data = await fetcher();
  writeCache(path, data);
  return data;
}

const digits = (v) => typeof v === "string" && /^\d+$/.test(v) ? v : typeof v === "number" ? String(v) : "";

// Mirrors the site script (getFullSearchFormData): the unfiltered form as the browser would serialise it,
// with the page-size field raised so one call returns the whole stock and offset 0.
function listBody(page) {
  const start = page.indexOf('id="fullSearchForm"');
  const form = page.slice(start, page.indexOf("</form>", start));
  const fields = [];
  for (const m of form.matchAll(/<(input|select)\b([^>]*)>([\s\S]*?)(?=<(?:input|select|\/form)\b|$)/g)) {
    const attr = (n) => m[2].match(new RegExp(`\\b${n}="([^"]*)"`))?.[1];
    const name = attr("name");
    if (!name || / disabled\b/.test(m[2])) continue;
    if (m[1] === "select") {
      const opts = [...m[3].matchAll(/<option\b([^>]*)>/g)].map((o) => o[1]);
      const pick = opts.find((o) => /\bselected\b/.test(o)) ?? opts[0];
      if (pick) fields.push([name, pick.match(/\bvalue="([^"]*)"/)?.[1] ?? ""]);
    } else if (/type="(checkbox|radio)"/.test(m[2])) {
      if (/\schecked\b/.test(m[2])) fields.push([name, attr("value") ?? "on"]);
    } else fields.push([name, attr("value") ?? ""]);
  }
  const lists = ["bodyTypeIdsList", "transmissionTypeIdsList", "fuelTypeIdsList", "colourIdsList", "seatIdsList"];
  const single = ["makeId", "modelId", "yearLowerId", "yearUpperId"];
  const body = Object.fromEntries(lists.map((k) => [k, []]));
  for (const [k, v] of fields) {
    const val = parseInt(v) || v;
    if (body[k] && !single.includes(k)) body[k].push(val);
    else body[k] = val;
  }
  const sort = page.match(/name="sortById"[^>]*>[\s\S]*?<option selected value="(\d+)"/)?.[1];
  Object.assign(body, { sortById: parseInt(sort), initialCall: 1, offset: 0, loadCount: PAGE_SIZE });
  for (const k of ["reserveCarEnabled", "valueYourTradeInEnabled", "appointmentRequestEnabled", "whatsAppChatEnabled", "mobilePreferred"]) body[k] = body[k] === "1" || body[k] === 1;
  return body;
}

async function fetchList(page) {
  let raw = readCache(LIST_RAW);
  if (!raw) {
    const nonce = page.match(/rest_nonce":"([^"]+)"/)?.[1]; // held in memory only
    if (!nonce) throw new Error("No rest_nonce on the used-cars page");
    raw = await get(`https://${DEALER}/${LIST_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce, Referer: `https://${DEALER}/used-cars/` },
      body: JSON.stringify(listBody(page)),
    });
    writeCache(LIST_RAW, raw); // before parsing anything
  }
  let json;
  let listings;
  try {
    json = JSON.parse(raw.toString("utf8"));
    listings = LISTINGS_PATH.reduce((o, k) => o?.[k], json);
  } catch {}
  const ok = Array.isArray(listings) && listings.length > 0 && listings.every((l) => digits(l.id) && typeof l.path === "string" && l.path.includes("/car-details/"));
  if (!ok) {
    console.error("Unexpected listing response. Fix the mapping offline against", LIST_RAW);
    console.error("top-level keys:", json && Object.keys(json), "data keys:", json?.data && Object.keys(json.data));
    console.error("first item keys:", Array.isArray(listings) ? listings[0] && Object.keys(listings[0]) : "not an array", "count:", listings?.length, "data.count:", json?.data?.count);
    throw new Error("listing validation failed");
  }
  console.log("data.count:", json.data.count, "allRetrieved:", json.data.allRetrieved);
  return listings.map((l) => ({ ...l, id: digits(l.id) }));
}

// The listing has every spec but only the main photo URL, so each selected car costs one detail GET for its gallery (D-13).
async function fetchDetails(items) {
  for (const l of items) await cached(join(CACHE, "cars", l.id, "detail.html"), () => get(new URL(l.path, `https://${DEALER}/`).href));
}

async function fetchCmd() {
  try {
    const page = (await cached(join(CACHE, "used-cars.html"), () => get(`https://${DEALER}/used-cars/`))).toString("utf8");
    const src = [...page.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]).find((s) => /\/themes\/[^"']*main[^"']*\.js/.test(s));
    if (!src) throw new Error("No theme main.js script tag on the used-cars page");
    const mainJs = (await cached(join(CACHE, "main.js"), () => get(new URL(src, `https://${DEALER}/`).href))).toString("utf8");
    if (!mainJs.includes(LIST_PATH)) throw new Error(`main.js does not contain ${LIST_PATH}`);
    const listings = await fetchList(page);
    console.log(`listTotal (listings returned): ${listings.length}; page total: ${page.match(/js-search-total-results">(\d+)</)?.[1] ?? "unknown"}`);
    await fetchDetails(select(listings));
    if (flag("--no-photos")) return console.log("Details cached. Stopping before the photos.");
    for (const l of select(listings)) await fetchPhotos(l.id);
  } finally {
    printTotals();
  }
}

// Gallery images in page order, full size only (the thumbnails strip uses another class). Each decision is saved
// to photos.json straight away, so a stopped run never asks the CDN for the same image twice.
async function fetchPhotos(id) {
  const dir = join(CACHE, "cars", id);
  const stateFile = join(dir, "photos.json");
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : []; // [{ url, n, width, height }], n null when rejected
  const html = readFileSync(join(dir, "detail.html"), "utf8");
  const urls = [...new Set([...html.matchAll(/<img\b[^>]*car-details-gallery__slider-img[^>]*\ssrc="(https:\/\/c0\.carsie\.ie\/[^"]+)"/g)].map((m) => m[1]))];
  for (const url of urls) {
    if (state.filter((s) => s.n).length >= MAX_PHOTOS) break;
    if (state.some((s) => s.url === url)) continue;
    const buf = await get(url);
    const { width, height } = await sharp(buf).metadata();
    const n = width >= PHOTO_W ? state.filter((s) => s.n).length + 1 : null;
    if (n) writeCache(join(dir, `photo-${n}.jpg`), buf);
    state.push({ url, n, width, height });
    writeCache(stateFile, JSON.stringify(state));
  }
}

// ---------- build ----------

const slugify = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-" };
// Scraped text becomes plain text: no tags, no entities, no en or em dashes (CLAUDE.md bans them on the site).
const clean = (v) =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, name) => (d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : (ENTITIES[name.toLowerCase()] ?? m)))
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

function mapFuel(raw) {
  const t = raw.toLowerCase();
  if (t.includes("plug")) return "plug-in-hybrid";
  if (t.includes("hybrid") || (t.includes("electric") && /petrol|diesel/.test(t))) return "hybrid";
  if (t.includes("electric")) return "electric";
  if (t.includes("diesel")) return "diesel";
  if (t.includes("petrol")) return "petrol";
  return "other";
}
const mapGearbox = (raw) => (/auto|dsg|cvt|tiptronic|semi/i.test(raw) ? "automatic" : /manual/i.test(raw) ? "manual" : undefined);

async function buildCmd() {
  const listings = LISTINGS_PATH.reduce((o, k) => o?.[k], JSON.parse(readFileSync(LIST_RAW, "utf8")));
  const skipped = [];
  const unmappedFuel = [];
  const cars = [];
  const files = []; // [path, buffer]
  const today = new Date();
  const maxYear = today.getFullYear() + 1;
  const soldAt = (id) => (id in SOLD_DAYS_AGO ? new Date(today.getTime() - SOLD_DAYS_AGO[id] * 86_400_000).toISOString().slice(0, 10) : undefined);

  for (const l of select(listings.map((x) => ({ ...x, id: String(x.id) })))) {
    const skip = (reason) => skipped.push({ id: l.id, reason });
    const s = l.specs ?? {};
    const make = clean(l.make);
    const model = clean(l.model);
    const year = parseInt(clean(s.year), 10);
    // Keeps the decimal point: "12,950.50" is 12951, not 1295050. NaN (no price) fails the check below.
    const priceEur = Math.round(parseFloat(String(l.price ?? "").replace(/[^\d.]/g, "")));
    if (!make || !model) { skip("no make or model"); continue; }
    if (!(priceEur > 0)) { skip("no price"); continue; }
    if (!(year >= 1950 && year <= maxYear)) { skip(`year out of range: ${s.year}`); continue; }

    const kms = clean(s.mileage?.kms).match(/^([\d,]+)\s*kms?\b/i);
    const fuelRaw = clean(s.fuel);
    const fuel = fuelRaw ? mapFuel(fuelRaw) : undefined;
    if (fuel === "other") unmappedFuel.push(fuelRaw);
    const bodyType = clean(s.body) || undefined;
    const variant = clean(l.highlights).replace(new RegExp(`^${(make + " " + model).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "") || undefined;

    const photoState = join(CACHE, "cars", l.id, "photos.json");
    const kept = (existsSync(photoState) ? JSON.parse(readFileSync(photoState, "utf8")) : []).filter((p) => p.n).sort((a, b) => a.n - b.n);
    if (kept.length < MIN_PHOTOS) { skip(`only ${kept.length} usable photos`); continue; }
    const photos = [];
    for (const p of kept) {
      const webp = await sharp(readFileSync(join(CACHE, "cars", l.id, `photo-${p.n}.jpg`))).resize(900, 675, { fit: "cover" }).webp({ quality: 72 }).toBuffer();
      const name = `${p.n}-${createHash("sha1").update(webp).digest("hex").slice(0, 8)}.webp`;
      files.push([join(OUT_PHOTOS, l.id, name), webp]);
      photos.push({ src: `/stock/${l.id}/${name}`, width: PHOTO_W, height: PHOTO_H });
    }

    const makeSlug = slugify(make);
    const modelSlug = slugify(model);
    cars.push(Object.fromEntries(Object.entries({
      id: l.id, slug: `${makeSlug}-${modelSlug}-${year}-${l.id}`, make, makeSlug, model, modelSlug, variant, year, priceEur,
      mileageKm: kms ? parseInt(kms[1].replace(/,/g, ""), 10) : undefined,
      fuel, gearbox: mapGearbox(clean(s.transmission)), bodyType, bodySlug: bodyType ? slugify(bodyType) : undefined, photos, soldAt: soldAt(l.id),
    }).filter(([, v]) => v !== undefined)));
  }

  for (const id of Object.keys(SOLD_DAYS_AGO)) if (!cars.some((c) => c.id === id)) throw new Error(`SOLD_DAYS_AGO names ${id}, which is not among the built cars`);
  cars.sort((a, b) => Number(a.id) - Number(b.id));
  rmSync(OUT_PHOTOS, { recursive: true, force: true }); // no stale file survives (Pitfall 5)
  for (const [p, buf] of files) writeCache(p, buf);
  writeCache(OUT_JSON, JSON.stringify(cars, null, 2) + "\n");

  if (flag("--report")) {
    const bytes = files.reduce((n, [, b]) => n + b.length, 0);
    const avg = bytes / (files.length || 1);
    console.log(JSON.stringify({
      listTotal: listings.length, carsBuilt: cars.length, skipped, photos: files.length, bytes,
      avgPhotoKB: +(avg / 1024).toFixed(1), projectedMB: +((avg * MAX_PHOTOS * listings.length) / 1e6).toFixed(1), unmappedFuel,
    }, null, 2));
  }
}

if (cmd === "fetch") {
  await fetchCmd().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
} else if (cmd === "build") {
  await buildCmd();
} else {
  console.error(USAGE);
  process.exit(1);
}
