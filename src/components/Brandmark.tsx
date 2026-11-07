import mark from "@/app/icon.png";

// The CR mark, small in the bottom left of every car photo, so a screenshot of one always carries it.
// A background, not an img: it is decoration, so it is no photo to count and nothing for a screen reader.
export function Brandmark() {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundImage: `url(${mark.src})` }}
      className="pointer-events-none absolute bottom-3 left-3 z-10 h-5 w-[29px] bg-contain bg-no-repeat opacity-85 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
    />
  );
}
