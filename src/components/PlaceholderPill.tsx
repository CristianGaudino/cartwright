// The Phase 3 Placeholder figures shape: marks content that is not real yet (Demo reviews, Placeholder details).
export function PlaceholderPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-7 items-center self-start rounded-full bg-text px-3 text-meta font-semibold text-ink">{children}</span>;
}
