import Mso from '../Absensi/Mso';

export default function ScheduleCard({ schedule, badgeColor, weekdays, formatTime }) {
  const badgeClass = schedule.type === 'recurring' ? badgeColor.recurring : badgeColor['one-time'];
  const badgeLabel = schedule.type === 'recurring' ? 'Berulang' : 'Pinjaman';
  const icon = schedule.type === 'recurring' ? 'calendar_today' : 'event_available';
  const hariLabel = weekdays?.find((w) => w.value === schedule.hari)?.label || '-';

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-space-md hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <Mso name={icon} className="text-primary" size={20} />
          <span className={`px-2 py-0.5 rounded-full font-label-xs text-label-xs font-bold uppercase tracking-wider ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <Mso name="more_vert" size={18} />
        </div>
      </div>

      <div className="mt-space-sm grid grid-cols-1 md:grid-cols-2 gap-space-sm">
        {/* Kolom kiri: info utama */}
        <div className="flex flex-col gap-space-xs">
          <div>
            <span className="font-label-sm text-on-surface-variant">Nama PJ</span>
            <span className="font-body-md text-body-md font-medium text-on-surface block">{schedule.pj}</span>
          </div>
          <div>
            <span className="font-label-sm text-on-surface-variant">Kelas</span>
            <span className="font-body-md text-body-md text-on-surface block">{schedule.kelas}</span>
          </div>
          <div>
            <span className="font-label-sm text-on-surface-variant">Jumlah Siswa</span>
            <span className="font-body-md text-body-md text-on-surface block">{schedule.jumlahSiswa}</span>
          </div>
        </div>

        {/* Kolom kanan: waktu + alasan */}
        <div className="flex flex-col gap-space-xs">
          {schedule.type === 'recurring' ? (
            <>
              <div>
                <span className="font-label-sm text-on-surface-variant">Hari</span>
                <span className="font-body-md text-body-md text-on-surface block">{hariLabel}</span>
              </div>
              <div>
                <span className="font-label-sm text-on-surface-variant">Waktu</span>
                <span className="font-body-md text-body-md text-on-surface block">
                  {schedule.jamMulai} – {schedule.jamSelesai}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-label-sm text-on-surface-variant">Rentang Waktu</span>
                <span className="font-body-md text-body-md text-on-surface block">
                  {formatTime(schedule)}
                </span>
              </div>
            </>
          )}
          <div>
            <span className="font-label-sm text-on-surface-variant">Alasan</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block break-words">
              {schedule.alasan}
            </span>
          </div>
          <div>
            <span className="font-label-sm text-on-surface-variant">No. Telepon</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block">{schedule.telp}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
