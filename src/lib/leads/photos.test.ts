import { afterEach, describe, expect, it, vi } from "vitest";
import { signPhotoPath, sniffImage, verifyPhotoSig } from "./photos";

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
    expect(await verifyPhotoSig(l.key, l.exp, l.sig, "secret-a")).toBe(true);
    expect(await verifyPhotoSig(key.replace("1.jpg", "2.jpg"), l.exp, l.sig, "secret-a")).toBe(false);
    expect(await verifyPhotoSig(l.key, String(Number(l.exp) + 1), l.sig, "secret-a")).toBe(false);
    const flipped = (l.sig[0] === "A" ? "B" : "A") + l.sig.slice(1);
    expect(await verifyPhotoSig(l.key, l.exp, flipped, "secret-a")).toBe(false);
    expect(await verifyPhotoSig(l.key, l.exp, l.sig, "secret-b")).toBe(false);
    expect(await verifyPhotoSig(l.key, l.exp, "not a signature", "secret-a")).toBe(false);
  });

  it("expires after 7 days by default", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-07T12:00:00Z") });
    const l = parse(await signPhotoPath(key, "secret-a"));
    expect(Number(l.exp)).toBe(Date.parse("2026-11-14T12:00:00Z") / 1000);
    vi.setSystemTime(new Date("2026-11-14T11:59:00Z"));
    expect(await verifyPhotoSig(l.key, l.exp, l.sig, "secret-a")).toBe(true);
    vi.setSystemTime(new Date("2026-11-14T12:01:00Z"));
    expect(await verifyPhotoSig(l.key, l.exp, l.sig, "secret-a")).toBe(false);
  });
});
