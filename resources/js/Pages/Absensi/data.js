// Static data extracted from ../template.html
// Calendar utilities (generateCalendarDays, monthLabels, dayHeaders, calendarDays)
// are imported from calendarUtils.js to avoid Vite production build
// tree-shaking issues with shared dynamic chunks.
export { generateCalendarDays, monthLabels, dayHeaders, calendarDays } from './calendarUtils';

// monthMeta is kept for backward-compat but CalendarGrid now drives it locally.
export const monthMeta = {
  label: 'Oktober 2026',
  displayed: 'Oktober 2026',
};

// Static fallback metrics — overridden at runtime by Inertia props `stats`
// when the AbsensiController passes live data from MySQL.
export const metrics = [
  {
    key: 'total',
    label: 'Total Absensi Siswa',
    value: '148',
    sub: 'Pengguna',
    icon: 'badge',
    badge: '',
    badgeColor: 'text-tertiary',
    footer: '',
    color: 'bg-surface-container-high',
  },
  {
    key: 'ontime',
    label: 'Total Masuk',
    value: '132',
    sub: 'Pengguna',
    icon: 'verified',
    badge: '',
    badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    footer: null,
    color: 'bg-tertiary-fixed',
    iconColor: 'text-on-tertiary-fixed-variant',
    valueColor: 'text-tertiary',
  },
  {
    key: 'late',
    label: 'Total Keluar',
    value: '7',
    sub: 'Pengguna',
    icon: null,
    badge: '',
    badgeColor: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    footer: null,
    color: 'bg-secondary-fixed',
    iconColor: 'text-on-secondary-fixed-variant',
    valueColor: 'text-secondary',
  },
  {
    key: 'leave',
    label: 'Total Kartu Siswa',
    value: '18',
    sub: 'Kartu',
    icon: null,
    badge: '',
    badgeColor: 'bg-primary-fixed text-on-primary-fixed',
    footer: null,
    color: 'bg-primary-fixed',
    iconColor: 'text-on-primary-fixed',
    valueColor: 'text-primary',
  },
  {
    key: 'absent',
    label: 'Total Kartu Tamu',
    value: '6',
    sub: 'Kartu',
    icon: null,
    badge: '',
    badgeColor: 'bg-error-container text-on-error-container',
    footer: null,
    color: 'bg-error-container',
    iconColor: 'text-error-container',
    valueColor: 'text-error',
  },
];

// Selected date detail header
export const selectedDate = {
  day: 'Kamis, 24 Oktober 2026',
  recordCount: '148 catatan absensi terverifikasi',
};

// Employee records shown in the right panel (filtered by selected date)
export const employees = [
  {
    name: 'nama siswa',
    empId: 'nisn',
    role: 'X.1',
    status: 'absent',
    statusLabel: 'Keluar',
    statusPill: 'bg-error text-on-error',
    iconColor: 'text-error',
    note: '01:00 Kamis 08 Oktober 2026 PM',
    photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDc8oCl3Bp9LL4ZLva1hmCey8SsghLzEjAliPpoazyVu8DssrvOUDfMsiLNChJGorGzMh48OhuI9wSAQarhouASmUrkYXBpU78_HDFYRSVBIr6bb4I_BiGlBfnFMz_YH7XZaoPwc2xz9LQKDf8JN9XIogxzLGJwvhhHK62xShrV8e4sJFzPdH67KFQkV3uAKv4ECy4uR3Px32umjmNlM3o89OcYe-6OqCyt-hUbV8h7F0qVBNDU0yrmVw',
    alt: 'Close up professional portrait of an Indonesian male software engineer with glasses looking slightly concerned against a clean office background',
  },
  {
    name: 'nama siswa',
    empId: 'nisn',
    role: 'X.1',
    status: 'absent',
    statusLabel: 'MASUK',
    statusPill: 'bg-primary text-on-primary',
    iconColor: 'text-primary',
    note: '01:00 Kamis 08 Oktober 2026 PM',
    photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDc8oCl3Bp9LL4ZLva1hmCey8SsghLzEjAliPpoazyVu8DssrvOUDfMsiLNChJGorGzMh48OhuI9wSAQarhouASmUrkYXBpU78_HDFYRSVBIr6bb4I_BiGlBfnFMz_YH7XZaoPwc2xz9LQKDf8JN9XIogxzLGJwvhhHK62xShrV8e4sJFzPdH67KFQkV3uAKv4ECy4uR3Px32umjmNlM3o89OcYe-6OqCyt-hUbV8h7F0qVBNDU0yrmVw',
    alt: 'Close up professional portrait of an Indonesian male software engineer with glasses looking slightly concerned against a clean office background',
  },
];
