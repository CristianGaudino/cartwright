import { card, subTitle } from "@/components/ui";

// The round red-tinted badge that holds an icon or a step number. One look for every "reason" and "step" on the site.
export function IconBadge({ children, size = "md" }: { children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent ring-1 ring-accent/30 ${size === "md" ? "size-12" : "size-10"}`}>{children}</span>
  );
}

// One reason or fact in a list: a badge, a short title and a line of text, in a bordered card. Renders an <li>, so it goes in a <ul>.
export function FeatureCard({ badge, title, text }: { badge: React.ReactNode; title: string; text: string }) {
  return (
    <li className={`flex items-start gap-4 ${card} p-5`}>
      <IconBadge>{badge}</IconBadge>
      <TitleText title={title} text={text} />
    </li>
  );
}

// A titled group of cards.
export function FeatureSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={subTitle}>{title}</h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</ul>
    </section>
  );
}

// A bold line and a quieter line under it: the title and text of a reason, a step or a fact.
export function TitleText({ title, text }: { title: string; text: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-body font-semibold">{title}</span>
      <span className="text-meta text-text-2">{text}</span>
    </span>
  );
}
