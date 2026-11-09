// Class strings shared by buttons and links, so a restyle is one edit.
export const press = "active:scale-[0.97] motion-reduce:active:scale-100";
// The accent call to action, 48px tall. Callers add layout (width, display) beside it.
// The outlined button beside an accent one. Callers add size and layout.
export const secondaryButton = `rounded-control border border-control bg-card font-semibold ${press}`;
export const accentButton = `h-12 rounded-control bg-accent px-6 font-semibold text-white ${press}`;
export const textLink = "inline-flex min-h-11 items-center underline";
// The mockup's small red slash before a heading or eyebrow.
export const slash = "before:mr-3 before:inline-block before:h-[0.9em] before:w-[0.3em] before:-skew-x-[14deg] before:bg-accent before:align-[-0.05em]";
// One look for every page title and every section heading, so no page reads as a different site.
export const pageTitle = `text-display font-bold lg:text-hero ${slash}`;
export const sectionTitle = `text-heading font-bold sm:text-display ${slash}`;
// The page frame every page shares (w-full, because the body is a flex column that keeps the footer at the bottom): centred, 1280px wide, the same side padding at each width. `pageMain` adds the vertical space.
export const pageWidth = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8";
export const pageMain = `${pageWidth} pb-16 pt-12`;
// A plain heading for a section inside a page (the slashed one is `sectionTitle`).
export const subTitle = "text-heading font-semibold";
// The bordered panel every card on the site is: rounded, a hairline border, the card colour. Callers add padding and layout.
export const card = "rounded-card border border-hairline bg-card";
// A round, frosted control over a photo (heart, remove, counter): solid ink when the buyer asks for less transparency, with a border
// when they ask for more contrast.
export const glass =
  "rounded-full bg-ink/60 text-white backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none contrast-more:border contrast-more:border-white";
// A filter chip: filled and checked when on, dimmed when `muted` (nothing matches).
export const chip = (on: boolean, muted = false) =>
  `inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border px-4 text-meta font-semibold transition-colors duration-150 ${press} ${on ? "border-accent bg-accent text-white" : `border-control bg-card ${muted ? "text-text-2" : ""}`}`;
// The round close button at the right of a sheet's header (44px, nudged out so the icon lines up with the edge).
export const closeButton = `-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full ${press}`;
// A row that swipes sideways one slide at a time (photo gallery, lightbox, card photos).
export const swipeRow = "flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden";
// The solid round badge that holds a tick or an arrow.
export const doneBadge = "flex size-11 items-center justify-center rounded-full bg-text text-ink";
// A car card in an AutoCarousel: one and a bit on a phone, two, then three across.
export const carSlide = "w-[85%] shrink-0 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]";
// A whole-page message (not found, something broke): centred in the space between header and footer.
export const messagePage = `${pageMain} flex flex-1 flex-col items-center justify-center text-center`;
