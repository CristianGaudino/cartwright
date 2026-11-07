"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, PlusIcon } from "@/components/stock/icons";
import {
  PHOTO_COUNT_ERROR,
  PHOTO_MAX_COUNT,
  PHOTO_MAX_MB,
  PHOTO_STORED_MAX_BYTES,
  PHOTO_TOTAL_ERROR,
  PHOTO_TOTAL_MAX_BYTES,
  PHOTO_TYPES,
  photoError,
} from "@/lib/leads/constants";
import { downscale } from "./downscale";
import type { PhotoBinding } from "./LeadForm";

const size = (photos: Blob[]) => photos.reduce((n, p) => n + p.size, 0);

// Trade-in photos (D-13, UI-SPEC Photos). Each pick is shrunk on the device before it is kept, so only the re-encoded JPEG is
// ever held or sent. The photos live in LeadForm's state, which outlives a failed send; the file input is only a way to add more.
export function PhotoPicker({ id, error, photos, onChange, onBusy }: PhotoBinding) {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const helperId = `${id}-helper`;
  const errorId = error ? `${id}-error` : undefined;

  async function add(input: HTMLInputElement) {
    const picked = Array.from(input.files ?? []);
    input.value = ""; // so the same photo can be picked again after a remove
    if (!picked.length) return;
    setBusy(true);
    onBusy(true);
    const refused = new Set<string>();
    const room = PHOTO_MAX_COUNT - photos.length;
    if (picked.length > room) refused.add(PHOTO_COUNT_ERROR);
    const added: Blob[] = [];
    let total = size(photos);
    for (const file of picked.slice(0, Math.max(room, 0))) {
      if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_MB * 1024 * 1024) {
        refused.add(photoError(file.name));
        continue;
      }
      // A photo the phone cannot shrink, or that is still over the server's cap, is refused: the original is never sent.
      const photo = await downscale(file).catch(() => null);
      if (!photo || photo.size > PHOTO_STORED_MAX_BYTES) refused.add(photoError(file.name));
      else if (total + photo.size > PHOTO_TOTAL_MAX_BYTES) refused.add(PHOTO_TOTAL_ERROR);
      else {
        total += photo.size;
        added.push(photo);
      }
    }
    // Added to the list as it is now, so a tile removed while these were shrinking stays removed. Removing only lowers the
    // count and total checked above (and can leave the announced count one high, which is harmless).
    onChange((prev) => [...prev, ...added]);
    setMessages([...refused]);
    if (added.length) setStatus(`${added.length} ${added.length === 1 ? "photo" : "photos"} added. ${photos.length + added.length} of ${PHOTO_MAX_COUNT} photos.`);
    setBusy(false);
    onBusy(false);
  }

  function remove(i: number) {
    onChange((prev) => prev.filter((_, j) => j !== i));
    setMessages([]);
    setStatus("Photo removed");
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-meta font-semibold">
        Photos<span className="font-normal text-text-2"> (optional)</span>
      </legend>
      <p id={helperId} className="text-meta text-text-2">
        Up to {PHOTO_MAX_COUNT} photos. JPEG, PNG or WebP, {PHOTO_MAX_MB} MB each.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, i) => (
          <li key={i} className="relative aspect-[4/3] overflow-hidden rounded-control bg-photo-bg">
            <Preview blob={photo} alt={`Photo ${i + 1}`} />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-0 top-0 flex size-11 items-center justify-center active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-[rgb(14_14_16/0.6)] text-white backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none contrast-more:border contrast-more:border-white">
                <CloseIcon className="size-5" />
              </span>
            </button>
          </li>
        ))}
        {/* The input stays in the page at 12 so a summary link can still reach it; only the Add tile goes. */}
        <li className={photos.length >= PHOTO_MAX_COUNT ? "sr-only" : "relative"}>
          <input
            id={id}
            name="photos"
            type="file"
            multiple
            accept={PHOTO_TYPES.join(",")}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={[helperId, errorId].filter(Boolean).join(" ")}
            onChange={(e) => add(e.currentTarget)}
            className="peer sr-only"
          />
          {photos.length < PHOTO_MAX_COUNT && (
            <label
              htmlFor={id}
              aria-busy={busy}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-control text-meta font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text peer-disabled:cursor-default peer-disabled:opacity-60 contrast-more:border-text"
            >
              <PlusIcon />
              Add Photos
            </label>
          )}
        </li>
      </ul>
      <div aria-live="polite" className="flex flex-col gap-1">
        <p className="sr-only">{status}</p>
        {messages.map((m) => (
          <p key={m} className="break-words text-meta text-destructive">
            {m}
          </p>
        ))}
      </div>
      {error && (
        <p id={errorId} className="break-words text-meta text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// A blob URL made per mounted tile and revoked when the tile goes or the page leaves, set on the element so no render
// creates one.
function Preview({ blob, alt }: { blob: Blob; alt: string }) {
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    img.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element -- a local blob preview; next/image cannot load it
  return <img ref={img} alt={alt} className="size-full object-cover" />;
}
