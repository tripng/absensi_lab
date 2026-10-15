import Mso from '../Absensi/Mso';

/**
 * schedule shape (dari ManagementClassController index props):
 *   recurring: { id, type:'recurring', pj, kelas, hari, jamMulai, jamSelesai,
 *                jumlahSiswa, alasan, telp, ruangan, mapel }
 *   one-time : { id, type:'one-time', pj, kelas, tanggalMulai, tanggalSelesai,
 *                jumlahSiswa, alasan, telp, ruangan, mapel }
 */
export default function ScheduleCard({ schedule, badgeColor, weekdays, formatTime, onEdit, onDelete }) {
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
          {schedule.ruangan && (
            <span className="font-label-xs text-on-surface-variant">
              <Mso name="location_on" size={14} className="inline mr-0.5" />{schedule.ruangan}
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            title="Edit"
          >
            <Mso name="edit" size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-space-xs text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-colors"
            title="Hapus"
          >
            <Mso name="delete" size={16} />
          </button>
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
          {schedule.mapel && (
            <div>
              <span className="font-label-sm text-on-surface-variant">Mapel</span>
              <span className="font-body-md text-body-md text-on-surface block">{schedule.mapel}</span>
            </div>
          )}
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
            <div>
              <span className="font-label-sm text-on-surface-variant">Rentang Waktu</span>
              <span className="font-body-md text-body-md text-on-surface block">
                {formatTime(schedule)}
              </span>
            </div>
          )}{' '}
          <div>
            <span className="font-label-sm text-on-surface-variant">Alasan</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block break-words">
              {schedule.alasan}
            </span>
          </div>
          <div>
            <span className="font-label-sm text-on-surface-variant">No. Telepon</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block">
              {schedule.telp}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
