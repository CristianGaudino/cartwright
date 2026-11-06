// 24px grid, 1.5px stroke, currentColor. Plans 01-06 to 01-08 import these.
type Props = { className?: string };

function Icon({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const SlidersIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);
export const CloseIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const CheckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const ChevronLeftIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Icon>
);
export const ChevronRightIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </Icon>
);
export const ChevronDownIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m5 9.5 7 7 7-7" />
  </Icon>
);
export const PhoneIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M21 16.9V20a2 2 0 0 1-2.2 2A19 19 0 0 1 2 5.2 2 2 0 0 1 4 3h3.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 11a15 15 0 0 0 5.9 5.9l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);
