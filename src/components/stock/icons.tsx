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
export const ShareIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </Icon>
);
const HEART = "M12 20.5s-7.6-4.6-9.3-9.5C1.5 7.6 3.8 4.5 7.2 4.5c2 0 3.7 1.1 4.8 2.8 1.1-1.7 2.8-2.8 4.8-2.8 3.4 0 5.7 3.1 4.5 6.5-1.7 4.9-9.3 9.5-9.3 9.5z";
// Saved is the filled shape, not only the colour; the outline stays on top for contrast over any photo.
export const HeartIcon = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Icon {...p}>
    <path d={HEART} stroke="none" className={`fill-accent transition-opacity duration-150 ease-out motion-reduce:transition-none ${filled ? "opacity-100" : "opacity-0"}`} />
    <path d={HEART} />
  </Icon>
);
export const PlusIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const StarIcon = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Icon {...p}>
    <path fill={filled ? "currentColor" : "none"} d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" />
  </Icon>
);
export const PhoneIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M21 16.9V20a2 2 0 0 1-2.2 2A19 19 0 0 1 2 5.2 2 2 0 0 1 4 3h3.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 11a15 15 0 0 0 5.9 5.9l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);
export const MenuIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const ArrowRightIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </Icon>
);
export const SearchIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);
export const ShieldCheckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);
export const LayersIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
  </Icon>
);
export const CalculatorIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
  </Icon>
);
export const SwapIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
  </Icon>
);
export const CarIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M5 16V11l2-5h10l2 5v5M3 16h18M5 16v3M19 16v3M5 11h14" />
    <circle cx="8" cy="14" r=".6" />
    <circle cx="16" cy="14" r=".6" />
  </Icon>
);
