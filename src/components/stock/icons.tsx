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

export const GridIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Icon>
);
export const ListIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </Icon>
);

export const CalendarIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M8.5 3v4M15.5 3v4" />
  </Icon>
);
export const GaugeIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
    <path d="m12 13 4-4" />
    <circle cx="12" cy="13.5" r="1" />
  </Icon>
);
export const FuelIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M6 20V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 15 5v15M4.5 20h12" />
    <path d="M7.5 8h6M15 10.5l2.5 1.5v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
  </Icon>
);
export const GearIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Icon>
);
export const WhatsAppIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M20 11.6a8 8 0 0 1-11.7 7.1L4 20l1.3-4.2A8 8 0 1 1 20 11.6Z" />
    <path d="M9.2 8.8c.3-.6.8-.6 1-.1l.5 1.2c.1.3 0 .5-.3.8-.2.2-.2.4 0 .7.5.9 1.3 1.6 2.2 2 .3.1.5.1.7-.1l.5-.6c.2-.3.5-.3.8-.1l1.1.6c.4.2.4.6 0 1-.6.7-1.6.9-2.5.6-2.1-.7-3.7-2.3-4.4-4.3-.2-.7 0-1.3.4-1.7Z" />
  </Icon>
);

export const FacebookIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14 8h2V5h-2.5C11 5 10 6.5 10 8.5V11H8v3h2v6h3v-6h2.2l.5-3H13V8.7c0-.5.3-.7 1-.7Z" />
  </Icon>
);
export const InstagramIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r=".6" />
  </Icon>
);
export const TikTokIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.3 2.3 1.8 3.8 4 4" />
  </Icon>
);

export const PinIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
);

export const PauseIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M9 5.5v13M15 5.5v13" />
  </Icon>
);
export const PlayIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M8 5.5v13l10.5-6.5Z" />
  </Icon>
);

export const CameraIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-1.8A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .8.4L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <circle cx="12" cy="13" r="3.2" />
  </Icon>
);
