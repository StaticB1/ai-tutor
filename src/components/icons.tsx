// Line icons in the Lucide style the brand book asks for (24px grid, 2px stroke, round joins),
// drawn here so the app needs no icon package.

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const Icon = {
  sigma: (p: P) => <Svg {...p}><path d="M18 7V4H6l6 8-6 8h12v-3" /></Svg>,
  flask: (p: P) => <Svg {...p}><path d="M9 3h6M10 3v6L4.5 18.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3" /><path d="M7 15h10" /></Svg>,
  bolt: (p: P) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>,
  globe: (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>,
  landmark: (p: P) => <Svg {...p}><path d="M3 21h18M5 21V11M19 21V11M9 21V11M15 21V11M2 11l10-7 10 7z" /></Svg>,
  pen: (p: P) => <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>,
  calculator: (p: P) => <Svg {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" /></Svg>,
  cpu: (p: P) => <Svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></Svg>,
  book: (p: P) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></Svg>,
  bulb: (p: P) => <Svg {...p}><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" /></Svg>,
  speaker: (p: P) => <Svg {...p}><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></Svg>,
  stop: (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" /></Svg>,
  sun: (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>,
  moon: (p: P) => <Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>,
  monitor: (p: P) => <Svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Svg>,
  type: (p: P) => <Svg {...p}><path d="M4 7V4h16v3M9 20h6M12 4v16" /></Svg>,
  check: (p: P) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>,
  refresh: (p: P) => <Svg {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" /></Svg>,
  arrowRight: (p: P) => <Svg {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Svg>,
  arrowLeft: (p: P) => <Svg {...p}><path d="M19 12H5M11 19l-7-7 7-7" /></Svg>,
  send: (p: P) => <Svg {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></Svg>,
  keypad: (p: P) => <Svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" /></Svg>,
  shuffle: (p: P) => <Svg {...p}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></Svg>,
  search: (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>,
  trophy: (p: P) => <Svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Svg>,
  flame: (p: P) => <Svg {...p}><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1.5 2-2 3-3 3s-1-2-1-4c-3 2-6 6-6 10a7 7 0 0 0 7 7z" /></Svg>,
  chart: (p: P) => <Svg {...p}><path d="M3 3v18h18" /><path d="M8 17v-5M13 17V8M18 17v-9" /></Svg>,
  clipboard: (p: P) => <Svg {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h4" /></Svg>,
  printer: (p: P) => <Svg {...p}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></Svg>,
  close: (p: P) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>,
  chevronDown: (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>,
  info: (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Svg>,
  bulbRays: (p: P) => <Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 6a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z" /><path d="M12 1.5v1.5M4.2 4.7l1.1 1.1M19.8 4.7l-1.1 1.1M1.5 11.5H3M21 11.5h1.5" /></Svg>,
  phone: (p: P) => <Svg {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></Svg>,
  bookOpen: (p: P) => <Svg {...p}><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4H9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H3.5A1.5 1.5 0 0 1 2 16z" /><path d="M22 5.5A1.5 1.5 0 0 0 20.5 4H15a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5h6a1.5 1.5 0 0 0 1.5-1.5z" /></Svg>,
  mic: (p: P) => <Svg {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></Svg>,
  camera: (p: P) => <Svg {...p}><path d="M14.5 4h-5L7.5 6.5H4A2 2 0 0 0 2 8.5v10A2 2 0 0 0 4 20.5h16a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-3.5z" /><circle cx="12" cy="13" r="3.5" /></Svg>,
  sparkle: (p: P) => <Svg {...p}><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" fill="currentColor" stroke="none" /></Svg>,
  flag: (p: P) => <Svg {...p}><path d="M4 22V4M4 4h12l-2 4 2 4H4" /></Svg>,
  shield: (p: P) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
};

export type IconName = keyof typeof Icon;

const SUBJECT_ICONS: Record<string, IconName> = {
  Mathematics: "sigma",
  "Combined Science": "flask",
  Physics: "bolt",
  Geography: "globe",
  History: "landmark",
  "English Language": "pen",
  "Principles of Accounting": "calculator",
  "Computer Science": "cpu",
};

export function SubjectIcon({ subject, ...p }: P & { subject: string }) {
  const I = Icon[SUBJECT_ICONS[subject] ?? "book"];
  return <I {...p} />;
}
