import { useState, useMemo, useCallback } from 'react';
import Mso from './Mso';
import { dayHeaders, monthLabels, generateCalendarDays } from './calendarUtils';

// 2 status utama dari backend: masuk & keluar.
const statusColors = {
  masuk:  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  keluar: 'bg-secondary-fixed text-on-secondary-fixed-variant',
};
const statusLabels = { masuk: 'Masuk', keluar: 'Keluar' };

function CalendarCell({ day, onClick }) {
  const isSpillover = day.status === 'spillover';

  // Spillover (hari dari bulan sebelumnya/berikutnya) tetap disable.
  // Semua hari aktif bulan ini — termasuk Sab/Minggu — dianggap hari kerja.
  if (isSpillover) {
    const label = day.month ? `${day.day} ${day.month}` : day.day;
    return (
      <div className="min-h-[102px] p-1.5 rounded-lg bg-surface-container-low/40 opacity-45 flex flex-col justify-between">
        <span className="text-right font-label-md text-label-md text-outline">
          {label}
        </span>
        <div className="text-center font-body-sm text-body-sm text-outline">-</div>
      </div>
    );
  }

  const baseWrapper =
    'min-h-[102px] p-2 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high cursor-pointer transition-colors flex flex-col justify-between group';
  const selectedWrapper =
    'min-h-[102px] p-2 rounded-xl bg-primary-fixed/40 shadow-md relative flex flex-col justify-between transform scale-[1.02] z-10 transition-transform';

  const wrapperClass = day.status === 'selected' ? selectedWrapper : baseWrapper;

  return (
    <div className={wrapperClass} onClick={() => onClick(day)}>
      {day.status === 'selected' && (
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-on-primary">
          <Mso name="check" size={10} />
        </div>
      )}
      <div className="flex justify-between items-center">
        {day.status === 'selected' ? (
          <>
            <span className="px-1.5 py-0.2 rounded bg-primary text-on-primary font-label-sm text-label-sm uppercase font-bold tracking-wider">
              Aktif
            </span>
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md font-bold">
              {day.day}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-tertiary-container" />
            <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary">
              {day.day}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {Object.entries(day.counts || {}).map(([key, val]) => (
          <span
            key={key}
            className={`px-1 py-0.5 rounded text-[10px] leading-none font-medium flex items-center justify-between ${statusColors[key] || 'text-tertiary'}`}
          >
            <span>{statusLabels[key] || key}</span>
            <strong>{val}</strong>
          </span>
        ))}
        {day.status === 'selected' && day.counts && (
          <div className="grid grid-cols-2 gap-0.5 text-[9px] text-center font-bold">
            <span className={`rounded py-0.5 ${statusColors.masuk}`}>
              M: {day.counts.masuk || 0}
            </span>
            <span className={`rounded py-0.5 ${statusColors.keluar}`}>
              K: {day.counts.keluar || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarGrid({ logAkses = [] }) {
  // State bulan & tahun yang sedang ditampilkan, plus tanggal yang dipilih.
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  // Nilai input date (format YYYY-MM-DD) — kosong berarti tidak ada pilihan kustom.
  const [customDate, setCustomDate] = useState('');

  // Regenerasi hari kalendar ketika bulan/tahun/selectedDay/logAkses berubah.
  const days = useMemo(
    () => generateCalendarDays(year, monthIndex, selectedDay, logAkses),
    [year, monthIndex, selectedDay, logAkses]
  );

  const displayed = `${monthLabels[monthIndex]} ${year}`;

  const goPrev = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear(year - 1);
    } else {
      setMonthIndex(monthIndex - 1);
    }
  };

  const goNext = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear(year + 1);
    } else {
      setMonthIndex(monthIndex + 1);
    }
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
    setSelectedDay(today.getDate());
    setCustomDate('');
  };

  // Navigasi langsung ke sebuah tanggal (mis. berapa tahun lalu).
  const goToDate = (e) => {
    const value = e.target.value; // YYYY-MM-DD
    if (!value) {
      setCustomDate('');
      return;
    }
    const [y, m, d] = value.split('-').map(Number);
    setCustomDate(value);
    setYear(y);
    setMonthIndex(m - 1); // JS monthIndex 0-based
    setSelectedDay(d);
  };

  // Semua hari aktif (termasuk Sab/Minggu) bisa dipilih; hanya spillover yang disabled.
  const handleSelectDay = useCallback((day) => {
    if (day.status === 'spillover') return;
    setSelectedDay(day.day);
  }, []);

  return (
    <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      {/* Calendar Header Label & Month Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-2.5 h-7 bg-primary rounded-full" />
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
              Grid Absensi Bulanan
            </h2>
            <p className="font-body-sm text-body-sm text-outline">
              Klik sel tanggal untuk memuat rincian staf harian di panel kanan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-xs" />
      </div>

      {/* Month & Day switcher */}
      <div className="flex items-center flex-wrap gap-space-sm">
        <div className="flex items-center bg-surface-container-low rounded-lg p-1">
          <button
            type="button"
            aria-label="Bulan Sebelumnya"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            onClick={goPrev}
          >
            <Mso name="chevron_left" />
          </button>
          <div className="px-space-md flex items-center gap-space-xs">
            <Mso name="calendar_today" className="text-primary" />
            <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
              {displayed}
            </span>
          </div>
          <button
            type="button"
            aria-label="Bulan Berikutnya"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            onClick={goNext}
          >
            <Mso name="chevron_right" />
          </button>
        </div>

        <button
          type="button"
          id="btn-today"
          className="px-space-md h-10 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
          onClick={goToToday}
        >
          Hari Ini
        </button>

        <div className="h-6 w-px bg-surface-container hidden sm:block" />

        {/* Custom date picker — pilih tanggal kapan saja */}
        <div className="relative">
          <input
            type="date"
            id="custom-date"
            className="date-picker h-10 pl-9 pr-3 pr-space-md rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none"
            value={customDate}
            onChange={goToDate}
            aria-label="Pilih tanggal"
          />
          <Mso
            name="calendar_today"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
            size={16}
          />
        </div>
      </div>

      {/* Day abbreviation header — semua hari diperlakukan sama (kerja) */}
      <div className="grid grid-cols-7 gap-1 text-center py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
        {dayHeaders.map((d) => (
          <div key={d} className="text-on-surface-variant">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar 35-cell matrix */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <CalendarCell key={`cell-${i}-${d.day}-${d.month || monthLabels[monthIndex]}`} day={d} onClick={handleSelectDay} />
        ))}
      </div>

      {/* Color Legend Footer */}
      <div className="pt-space-md bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl flex flex-wrap items-center justify-between gap-space-sm">
        <div className="font-body-sm text-body-sm text-outline flex items-center gap-1">
          <Mso name="info" />
          <span>Diperbarui otomatis tiap 60 detik</span>
        </div>
      </div>
    </div>
  );
}
