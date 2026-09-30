import Mso from './Mso';
import { calendarDays, dayHeaders, monthMeta } from './data';

function CalendarCell({ day }) {
  const isWeekend = day.status === 'weekend';
  const isSpillover = day.status === 'spillover';
  const isHoliday = isWeekend || isSpillover;

  if (isHoliday) {
    const label = day.month === 'Nov' ? `${day.day} ${day.month}` : day.day;
    const isWeekendSunday = day.status === 'weekend' && day.day >= 5; // weekend coloring
    return (
      <div className="min-h-[102px] p-1.5 rounded-lg bg-surface-container-low/40 opacity-45 flex flex-col justify-between">
        <span
          className={`text-right font-label-md text-label-md ${isWeekendSunday && day.status === 'weekend' ? 'text-error/60' : 'text-outline'}`}
        >
          {label}
        </span>
        <div className="text-center font-body-sm text-body-sm text-outline">-</div>
      </div>
    );
  }

  const badgeColors = {
    hadir: 'bg-tertiary',
    late: 'bg-secondary',
    cuti: 'bg-primary',
    alpha: 'bg-error',
  };
  const labelColors = {
    hadir: 'text-tertiary',
    late: 'text-secondary',
    cuti: 'text-primary',
    alpha: 'text-error',
  };
  const labels = { hadir: 'Hadir', late: 'Late', cuti: 'Cuti', alpha: 'Alpha' };

  const baseWrapper =
    'min-h-[102px] p-2 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high cursor-pointer transition-colors flex flex-col justify-between group';
  const selectedWrapper =
    'min-h-[102px] p-2 rounded-xl bg-primary-fixed/40 shadow-md relative flex flex-col justify-between transform scale-[1.02] z-10 transition-transform';

  const wrapperClass = day.status === 'selected' ? selectedWrapper : baseWrapper;

  return (
    <div className={wrapperClass}>
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
            className={`px-1 py-0.5 rounded text-[10px] leading-none bg-surface-container-lowest font-medium flex items-center justify-between ${labelColors[key]}`}
          >
            <span>{labels[key]}</span>
            <strong>{val}</strong>
          </span>
        ))}
        {day.status === 'selected' && (
          <div className="grid grid-cols-3 gap-0.5 text-[9px] text-center font-bold">
            <span className="bg-secondary-fixed text-on-secondary-fixed-variant rounded py-0.5">
              L: 7
            </span>
            <span className="bg-primary-fixed text-on-primary-fixed rounded py-0.5">
              C: 6
            </span>
            <span className="bg-error-container text-on-error-container rounded py-0.5">
              A: 3
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarGrid() {
  return (
    <div className="xl:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      {/* Calendar Header Label & Month Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-2.5 h-7 bg-primary rounded-full" />
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Grid Kehadiran Bulanan
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
          >
            <Mso name="chevron_left" />
          </button>
          <div className="px-space-md flex items-center gap-space-xs">
            <Mso name="calendar_today" className="text-primary" />
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {monthMeta.displayed}
            </span>
          </div>
          <button
            type="button"
            aria-label="Bulan Berikutnya"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <Mso name="chevron_right" />
          </button>
        </div>

        <button
          type="button"
          id="btn-today"
          className="px-space-md h-10 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
        >
          Hari Ini
        </button>

        <div className="h-6 w-px bg-surface-container hidden sm:block" />

        {/* View mode toggle */}
        <div className="flex items-center gap-space-xs self-end xl:self-auto bg-surface-container-low p-1 rounded-lg">
          <button
            type="button"
            className="px-space-md py-1.5 rounded-lg bg-surface-container-lowest shadow-sm text-primary font-label-md text-label-md font-semibold flex items-center gap-1.5"
          >
            <Mso name="calendar_view_month" size={16} />
            <span>Bulan</span>
          </button>
          <button
            type="button"
            className="px-space-md py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors"
          >
            <Mso name="calendar_view_week" size={16} />
            <span>Minggu</span>
          </button>
          <button
            type="button"
            className="px-space-md py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors"
          >
            <Mso name="calendar_view_day" size={16} />
            <span>Hari</span>
          </button>
        </div>
      </div>

      {/* Day abbreviation header */}
      <div className="grid grid-cols-7 gap-1 text-center py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
        {dayHeaders.map((d) => {
          const isWeek = d === 'Sab';
          const isSun = d === 'Min';
          return (
            <div
              key={d}
              className={isWeek ? 'text-secondary font-bold' : isSun ? 'text-error font-bold' : ''}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* Calendar 35-cell matrix */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((d, i) => (
          <CalendarCell key={`cell-${i}-${d.day}`} day={d} />
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
