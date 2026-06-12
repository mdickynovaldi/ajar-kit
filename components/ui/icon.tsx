/* AjarKit — set ikon inline gaya lucide (porting dari Ajarkit/js/ajarkit.js) */

const P =
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';

const ICONS = {
  sparkles: `<path ${P} d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z"/><path ${P} d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>`,
  home: `<path ${P} d="M3 10.5 12 3l9 7.5"/><path ${P} d="M5 9.5V21h14V9.5"/><path ${P} d="M9.5 21v-6h5v6"/>`,
  plus: `<path ${P} d="M12 5v14M5 12h14"/>`,
  files: `<path ${P} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path ${P} d="M14 3v5h5"/>`,
  user: `<circle cx="12" cy="8" r="4" ${P}/><path ${P} d="M5 21a7 7 0 0 1 14 0"/>`,
  bell: `<path ${P} d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path ${P} d="M10 20a2 2 0 0 0 4 0"/>`,
  book: `<path ${P} d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path ${P} d="M18 17H7a2 2 0 0 0-2 2"/>`,
  clipboard: `<rect x="8" y="3" width="8" height="4" rx="1" ${P}/><path ${P} d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path ${P} d="M9 13h6M9 17h4"/>`,
  list: `<path ${P} d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/>`,
  grid: `<rect x="3" y="3" width="7" height="7" rx="1.5" ${P}/><rect x="14" y="3" width="7" height="7" rx="1.5" ${P}/><rect x="3" y="14" width="7" height="7" rx="1.5" ${P}/><rect x="14" y="14" width="7" height="7" rx="1.5" ${P}/>`,
  layers: `<path ${P} d="m12 3 9 5-9 5-9-5z"/><path ${P} d="m3 13 9 5 9-5"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2" ${P}/><path ${P} d="M3 9h18M8 3v4M16 3v4"/>`,
  school: `<path ${P} d="m12 4 9 4-9 4-9-4z"/><path ${P} d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>`,
  wallet: `<path ${P} d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5"/><path ${P} d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3h-5a2 2 0 0 1 0-4h5V9"/>`,
  settings: `<circle cx="12" cy="12" r="3" ${P}/><path ${P} d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.7 1.6 1.6 0 0 0-1 1.5V22a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.2-2.7H2a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 3.4 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z"/>`,
  help: `<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7"/><path ${P} d="M12 17h.01"/>`,
  search: `<circle cx="11" cy="11" r="7" ${P}/><path ${P} d="m20 20-3.5-3.5"/>`,
  check: `<path ${P} d="M20 6 9 17l-5-5"/>`,
  checkCircle: `<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="m8.5 12 2.5 2.5 4.5-5"/>`,
  chevR: `<path ${P} d="m9 6 6 6-6 6"/>`,
  chevL: `<path ${P} d="m15 6-6 6 6 6"/>`,
  chevDown: `<path ${P} d="m6 9 6 6 6-6"/>`,
  arrowR: `<path ${P} d="M5 12h14M13 6l6 6-6 6"/>`,
  download: `<path ${P} d="M12 3v12M7 11l5 5 5-5"/><path ${P} d="M5 21h14"/>`,
  eye: `<path ${P} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3" ${P}/>`,
  edit: `<path ${P} d="M12 20h9"/><path ${P} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  refresh: `<path ${P} d="M21 12a9 9 0 1 1-2.6-6.4"/><path ${P} d="M21 4v5h-5"/>`,
  copy: `<rect x="9" y="9" width="11" height="11" rx="2" ${P}/><path ${P} d="M5 15V5a2 2 0 0 1 2-2h8"/>`,
  share: `<circle cx="18" cy="5" r="3" ${P}/><circle cx="6" cy="12" r="3" ${P}/><circle cx="18" cy="19" r="3" ${P}/><path ${P} d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>`,
  more: `<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>`,
  moon: `<path ${P} d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z"/>`,
  sun: `<circle cx="12" cy="12" r="4.2" ${P}/><path ${P} d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>`,
  google: `<path fill="#4285F4" d="M21.6 12.2c0-.6 0-1.2-.1-1.8H12v3.5h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.6l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8z"/><path fill="#EA4335" d="M12 6.4c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 8 9.4 6.4 12 6.4z"/>`,
  lock: `<rect x="4" y="10" width="16" height="11" rx="2" ${P}/><path ${P} d="M8 10V7a4 4 0 0 1 8 0v3"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2" ${P}/><path ${P} d="m3 7 9 6 9-6"/>`,
  clock: `<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="M12 7v5l3 2"/>`,
  x: `<path ${P} d="M18 6 6 18M6 6l12 12"/>`,
  zap: `<path ${P} d="M13 2 4 14h7l-1 8 9-12h-7z"/>`,
  target: `<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="5" ${P}/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>`,
  users: `<circle cx="9" cy="8" r="3.4" ${P}/><path ${P} d="M3 20a6 6 0 0 1 12 0"/><path ${P} d="M16 5.2a3.4 3.4 0 0 1 0 6.6M21 20a6 6 0 0 0-5-5.9"/>`,
  chart: `<path ${P} d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`,
  qris: `<rect x="3" y="3" width="7" height="7" rx="1" ${P}/><rect x="14" y="3" width="7" height="7" rx="1" ${P}/><rect x="3" y="14" width="7" height="7" rx="1" ${P}/><path ${P} d="M14 14h3v3M21 14v7h-7M17 21v-4"/>`,
  bank: `<path ${P} d="M3 9 12 4l9 5M4 9h16M5 9v8M19 9v8M9 9v8M15 9v8M3 21h18"/>`,
  wifi: `<path ${P} d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><path ${P} d="M12 19h.01"/>`,
  alert: `<path ${P} d="M12 3 2 20h20z"/><path ${P} d="M12 10v4M12 17h.01"/>`,
  logout: `<path ${P} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path ${P} d="M10 17 5 12l5-5M5 12h12"/>`,
  flask: `<path ${P} d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path ${P} d="M7.5 14h9"/>`,
  gift: `<rect x="3" y="8" width="18" height="4" rx="1" ${P}/><path ${P} d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path ${P} d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>`,
  // Logo AjarKit: dokumen (RPS) berlipat + garis daftar + percikan tongkat ajaib
  logo: `<path ${P} d="M5 4.2A1.2 1.2 0 0 1 6.2 3h7.1L17 6.7v8.1A1.2 1.2 0 0 1 15.8 16H6.2A1.2 1.2 0 0 1 5 14.8z"/><path ${P} d="M13 3v3.5h3.5"/><path ${P} d="M7.6 9.2h6.2M7.6 11.6h6.2M7.6 14h3.6"/><path ${P} d="M18.6 16.2l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="currentColor" stroke="none"/>`,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
  style,
}: {
  name: IconName;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ? `ak-ic ${className}` : "ak-ic"}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
