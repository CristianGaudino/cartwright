// Shrinks a picked photo on the device to a JPEG with a 2,000px long edge (UI-SPEC Photos, Resizing). Drawing it to a
// canvas also drops the EXIF data, GPS and camera details included, so the original never leaves the phone (T-03-33).
export async function downscale(file: File, longEdge = 2000, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, longEdge / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.fillStyle = "#fff"; // a transparent PNG gets a white background, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("Encode failed"))), "image/jpeg", quality));
}
