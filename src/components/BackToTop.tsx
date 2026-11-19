"use client";

// A text link in the footer that takes the reader back to the top of any page. A button, not an anchor: it needs no hash in the URL.
// Focus moves to the header's first link too, so the next Tab goes on from the top rather than from the footer.
function top() {
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  document.querySelector<HTMLElement>("body > header a")?.focus({ preventScroll: true });
}

export function BackToTop({ className }: { className?: string }) {
  return (
    <button type="button" onClick={top} className={className}>
      Back to Top
    </button>
  );
}
