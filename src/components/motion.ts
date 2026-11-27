// Motion values shared by script, so a component does not hand-write its own query or curve.
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
// The --ease-out token in globals.css, for Web Animations calls: keep the two the same.
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// A script scroll (scrollTo, scrollBy, scrollIntoView) glides, or jumps for anyone who asks for reduced motion. Call it in an event, not in render.
export const scrollBehavior = (): ScrollBehavior => (window.matchMedia(REDUCED_MOTION).matches ? "instant" : "smooth");
