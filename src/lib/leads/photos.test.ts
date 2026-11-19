import { afterEach, describe, expect, it, vi } from "vitest";
import { signPhotoPath, signSlotPath, sniffImage, verifyLinkSig, verifySlotLink } from "./photos";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 1, 2, 3, 4, ...new TextEncoder().encode("WEBPVP8 ")]);

describe("sniffImage", () => {
  it("knows JPEG, PNG and WebP by their bytes", () => {
    expect(sniffImage(JPEG)).toEqual({ ext: "jpg", contentType: "image/jpeg" });
    expect(sniffImage(PNG)).toEqual({ ext: "png", contentType: "image/png" });
    expect(sniffImage(WEBP)).toEqual({ ext: "webp", contentType: "image/webp" });
  });

  it("reports a PNG named .jpg as a PNG, and refuses GIF, SVG, other RIFF files and empty bytes", () => {
    expect(new File([PNG], "car.jpg", { type: "image/jpeg" }).name).toBe("car.jpg"); // the name never reaches sniffImage
    expect(sniffImage(PNG)?.ext).toBe("png");
    expect(sniffImage(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("RIFF....WAVEfmt "))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("signed photo links", () => {
  const key = "trade-in/00000000-0000-4000-8000-000000000001/1.jpg";
  const parse = (path: string) => {
    const u = new URL(path, "https://example.test");
    return { key: decodeURIComponent(u.pathname.replace("/lead-photos/", "")), exp: u.searchParams.get("exp")!, sig: u.searchParams.get("sig")! };
  };
  afterEach(() => vi.useRealTimers());

  it("verifies its own link and refuses any change", async () => {
    const path = await signPhotoPath(key, "secret-a");
    expect(path.startsWith(`/lead-photos/${key}?exp=`)).toBe(true);
    const l = parse(path);
    expect(l.key).toBe(key);
    expect(await verifyLinkSig(l.key, l.exp, l.sig, "secret-a")).toBe(true);
    expect(await verifyLinkSig(key.replace("1.jpg", "2.jpg"), l.exp, l.sig, "secret-a")).toBe(false);
    expect(await verifyLinkSig(l.key, String(Number(l.exp) + 1), l.sig, "secret-a")).toBe(false);
    const flipped = (l.sig[0] === "A" ? "B" : "A") + l.sig.slice(1);
    expect(await verifyLinkSig(l.key, l.exp, flipped, "secret-a")).toBe(false);
    expect(await verifyLinkSig(l.key, l.exp, l.sig, "secret-b")).toBe(false);
    expect(await verifyLinkSig(l.key, l.exp, "not a signature", "secret-a")).toBe(false);
  });

  it("expires after 7 days by default", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-07T12:00:00Z") });
    const l = parse(await signPhotoPath(key, "secret-a"));
    expect(Number(l.exp)).toBe(Date.parse("2026-11-14T12:00:00Z") / 1000);
    vi.setSystemTime(new Date("2026-11-14T11:59:00Z"));
    expect(await verifyLinkSig(l.key, l.exp, l.sig, "secret-a")).toBe(true);
    vi.setSystemTime(new Date("2026-11-14T12:01:00Z"));
    expect(await verifyLinkSig(l.key, l.exp, l.sig, "secret-a")).toBe(false);
  });
});

describe("signed free-this-slot links (#166)", () => {
  const lead = "00000000-0000-4000-8000-000000000001";
  const startsAt = new Date("2026-11-24T10:30:00Z");
  const parse = (path: string) => Object.fromEntries(new URL(path, "https://example.test").searchParams);
  afterEach(() => vi.useRealTimers());

  it("works until the drive's start, for that lead and secret only", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-20T10:00:00Z") });
    const path = await signSlotPath(lead, startsAt, "secret-a");
    expect(path.startsWith(`/test-drive-slot/${lead}?exp=${startsAt.getTime() / 1000}&sig=`)).toBe(true);
    const { exp, sig } = parse(path);
    expect(await verifySlotLink(lead, exp, sig, "secret-a")).toBe(true);
    expect(await verifySlotLink(lead.replace("1", "2"), exp, sig, "secret-a")).toBe(false);
    expect(await verifySlotLink(lead, exp, sig, "secret-b")).toBe(false);
    expect(await verifySlotLink(lead, undefined, sig, "secret-a")).toBe(false);
    expect(await verifySlotLink("../x", exp, sig, "secret-a")).toBe(false);
    vi.setSystemTime(new Date("2026-11-24T10:31:00Z"));
    expect(await verifySlotLink(lead, exp, sig, "secret-a")).toBe(false);
  });

  it("never accepts a photo link's signature, nor opens a photo with its own", async () => {
    const photo = parse(await signPhotoPath(`trade-in/${lead}/1.jpg`, "secret-a"));
    expect(await verifySlotLink(lead, photo.exp, photo.sig, "secret-a")).toBe(false);
    const slot = parse(await signSlotPath(lead, new Date(Date.now() + 86_400_000), "secret-a"));
    expect(await verifyLinkSig(`trade-in/${lead}/1.jpg`, slot.exp, slot.sig, "secret-a")).toBe(false);
  });
});
