import { subTitle } from "@/components/ui";

// A page-sized message with something to do about it: nothing saved, nothing to compare, no cars match, the cars would not load.
// The action (a button or link) goes in as children.
export function StateBlock({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="reveal py-16 text-center">
      <h2 className={subTitle}>{title}</h2>
      <p className="mt-2 text-body text-text-2">{text}</p>
      {children}
    </div>
  );
}
