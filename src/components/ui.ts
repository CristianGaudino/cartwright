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
