// Utility functions for CalendarGrid — separated from static data to avoid
// Vite production build tree-shaking issues when dynamic + shared modules
// get inlined. Keeping calendar generation logic in its own file ensures
// CalendarGrid imports it as a proper module dependency.

// Nama hari Indonesia (Sen -> Minggu), Minggu di akhir untuk alignment grid 7 kolom.
export const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Month names — index 0-based dipakai new Date(year, monthIndex).
export const monthLabels = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Hitung jumlah hari pada sebuah bulan.
 */
function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Bangun lookup Map dari data log_akses yang dikirim backend.
 * logAkses: array of { date: 'YYYY-MM-DD', masuk: Number, keluar: Number }
 * Hasil: Map 'YYYY-MM-DD' -> { masuk, keluar }
 */
function buildLogLookup(logAkses = []) {
  const map = new Map();
  for (const entry of logAkses) {
    if (!entry || !entry.date) continue;
    const prev = map.get(entry.date);
    if (prev) {
      prev.masuk += entry.masuk || 0;
      prev.keluar += entry.keluar || 0;
    } else {
      map.set(entry.date, { masuk: entry.masuk || 0, keluar: entry.keluar || 0 });
    }
  }
  return map;
}

/**
 * Format tanggal ke 'YYYY-MM-DD' pakai leading zero agar cocok dengan key di lookup.
 */
function padDate(year, monthIndex, day) {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Hasilkan array 35 sel kalendar (5 minggu x 7 hari) untuk sebuah
 * bulan/tahun. Logika:
 *  - spillover: hari dari bulan sebelumnya/berikutnya (grid awal/akhir kosong)
 *  - selected: default ke hari ini jika di bulan yang sama,
 *    atau null jika kalendar dipindah ke bulan lain
 *  - status tiap hari aktif didapat dari data log_akses (kolom waktu_scan):
 *      * 'masuk'  — ada setidaknya satu scan masuk pada tanggal itu
 *      * 'keluar' — tidak ada scan masuk tapi ada scan keluar
 *      * 'present' — hari aktif tanpa data log (hari kerja normal)
 *
 * @param {number} year
 * @param {number} monthIndex 0-based
 * @param {number|null} selectedDay tanggal yang dipilih (default hari ini jika di bulan ini)
 * @param {Array<{date:string,masuk:number,keluar:number}>} logAkses data dari backend
 */
export function generateCalendarDays(year, monthIndex, selectedDay = null, logAkses = []) {
  const first = new Date(year, monthIndex, 1);
  const firstDay = first.getDay();
  const total = daysInMonth(year, monthIndex);
  const logLookup = buildLogLookup(logAkses);

  const days = [];

  // spillover awal (hari kosong sebelum tanggal 1)
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevTotal = daysInMonth(prevYear, prevMonth);
  const leadingBlanks = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = leadingBlanks; i > 0; i--) {
    const d = prevTotal - i + 1;
    days.push({ day: d, month: monthLabels[prevMonth].slice(0, 3), status: 'spillover' });
  }

  // hari aktif bulan ini — semua hari (termasuk Sab/Minggu) dianggap hari kerja
  for (let d = 1; d <= total; d++) {
    const key = padDate(year, monthIndex, d);
    const log = logLookup.get(key);

    let status = 'present';
    let counts = undefined;
    if (log) {
      // 2 status utama: masuk dan keluar, ditentukan dari kolom jenis
      if (log.masuk > 0) {
        status = 'masuk';
        counts = { masuk: log.masuk, keluar: log.keluar };
      } else if (log.keluar > 0) {
        status = 'keluar';
        counts = { keluar: log.keluar };
      }
    }

    days.push({ day: d, status, counts });
  }

  // spillover akhir (melengkapi hingga 35 sel)
  let trailing = 35 - days.length;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  for (let d = 1; d <= trailing; d++) {
    days.push({ day: d, month: monthLabels[nextMonth].slice(0, 3), status: 'spillover' });
  }

  // mark selected day: default hari ini jika di bulan ini, else null
  const today = new Date();
  let sel = selectedDay;
  if (sel == null) {
    if (today.getMonth() === monthIndex && today.getFullYear() === year) {
      sel = today.getDate();
    } else {
      sel = null;
    }
  }
  if (sel != null) {
    const idx = days.findIndex(
      (x) => x.status !== 'weekend' && x.status !== 'spillover' && x.day === sel
    );
    if (idx >= 0) days[idx].status = 'selected';
  }

  return days;
}

// Backward-compat static calendarDays — data demo sampai Oktober 2024 dihapus;
// kini generateCalendarDays memakai parameter default [].
export const calendarDays = generateCalendarDays(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), []);
