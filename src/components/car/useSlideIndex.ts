import { useEffect, useRef } from "react";

// The index of the slide a scroll-snap scroller sits on, read once per frame so a swipe costs one state update per paint.
export function useSlideIndex(onIndex: (i: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = ref.current;
      if (el?.clientWidth) onIndex(Math.round(el.scrollLeft / el.clientWidth));
    });
  };
  return { ref, onScroll };
}
