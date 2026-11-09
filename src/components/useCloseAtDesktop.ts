import { useEffect } from "react";

// A sheet that lives in a bar hidden from 1024px: an open modal dialog would stay open there, invisible, keeping the page inert and scroll
// locked. This runs `close` when the desktop layout takes over (resize, iPad rotation).
export function useCloseAtDesktop(close: () => void) {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && close();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `close` only touches refs and setters, so the first one is always right
  }, []);
}
