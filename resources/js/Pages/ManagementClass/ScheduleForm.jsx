import { useForm } from '@inertiajs/react';
import Mso from '../Absensi/Mso';

/**
 * Form tambah / edit jadwal.
 *
 * Pemetaan UI↔DB (issue #3):
 *  - recurring PJ → D1: selector guru (guru_id → pengguna.nama). Mapel nullable (D3).
 *  - one-time  PJ → peminjam = user login (read-only); peminjam_user_id diisi server.
 *  - ruangan  → D4: selector ruang_ajaran (nama_ruangan / labkom-backed).
 *  - alasan    → keterangan (recurring baru; pinjaman sudah ada).
 *  - telp      → no_telepon (varchar 20).
 * Field name dipakai snake_case agar langsung match backend validate.
 */
export default function ScheduleForm({
  activeTab, kelasList, ruangList, guruList, mapelList = [], weekdays, editing, onCancel, onSuccess,
  currentUser,
}) {
  // initialState disesuaikan tiap tab (keyed by activeTab)
  const base = () => ({
    type: activeTab,
    kelas_id: '',
    ruang_ajaran_id: '',
    mapel_id: '',
    jumlah_siswa: '',
    no_telepon: '',
    keterangan: '',
  });

  const recurringInitial = () => ({
    ...base(),
    hari: 'senin',
    jam_mulai: '08:00',
    jam_selesai: '09:00',
    guru_id: '',
  });

  const onetimeInitial = () => ({
    ...base(),
    tanggal_mulai: '',
    tanggal_selesai: '',
  });

  const initialData = activeTab === 'recurring' ? recurringInitial() : onetimeInitial();

  // Jika mode edit, init dari schedule yang diklik.
  // Controller kini kirimkan ID mentah (kelas_id/ruang_ajaran_id/guru_id/mapel_id)
  // sehingga dropdown prefill by-ID; name-lookup tetap jadi fallback.
  Object.assign(initialData, editing
    ? {
        kelas_id: editing?.kelas_id
          ?? (kelasList.find((k) => k.nama === editing?.kelas)?.id ?? ''),
        ruang_ajaran_id: editing?.ruang_ajaran_id
          ?? (ruangList.find((r) => r.label === editing?.ruangan)?.id ?? ''),
        guru_id: editing?.guru_id
          ?? (guruList.find((g) => g.nama === editing?.pj)?.id ?? ''),
        mapel_id: editing?.mapel_id ?? '',
        jumlah_siswa: editing?.jumlah_siswa ?? '',
        no_telepon: editing?.telp ?? '',
        keterangan: editing?.keterangan ?? '',
        ...(activeTab === 'recurring'
          ? {
              hari: editing.hari ?? 'senin',
              jam_mulai: editing.jamMulai ?? '08:00',
              jam_selesai: editing.jamSelesai ?? '09:00',
            }
          : {
              tanggal_mulai: editing.tanggalMulai ?? '',
              tanggal_selesai: editing.tanggalSelesai ?? '',
            }),
      }
    : {});

  const { data, setData, post, put, processing, errors, reset } = useForm(initialData);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validasi klien (kelengkapan dasar)
    if (!data.kelas_id || !data.ruang_ajaran_id || !data.keterangan) {
      alert('Lengkapi kelas, ruangan, dan alasan terlebih dahulu.');
      return;
    }
    if (activeTab === 'recurring' && data.jam_mulai >= data.jam_selesai) {
      alert('Jam mulai harus lebih awal dari jam selesai.');
      return;
    }
    if (activeTab === 'one-time' && data.tanggal_mulai >= data.tanggal_selesai) {
      alert('Tanggal/jam selesai harus setelah tanggal/jam mulai.');
      return;
    }

    if (editing) {
      put(`/management-class/${editing.id}`, {
        preserveScroll: true,
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: () => {},
      });
    } else {
      post('/management-class', {
        preserveScroll: true,
        onSuccess: () => { reset(); onSuccess?.(); },
        onError: () => {},
      });
    }
  };

  // Render helper: field-level error
  const fe = (field) =>
    errors[field] ? (
      <span className="font-body-xs text-body-xs text-on-error-container mt-space-xxs">
        {errors[field]}
      </span>
    ) : null;

  // Render helper: non-field error (mis. time_conflict)
  const ge = (field) =>
    errors[field] ? (
      <div className="mb-space-sm flex items-start gap-space-xs p-space-sm bg-error-container/10 border border-error-container/30 rounded-xl text-on-error">
        <Mso name="error" size={18} className="mt-px shrink-0" />
        <span className="font-body-sm">{errors[field]}</span>
      </div>
    ) : null;

  return (
    <div className="mb-space-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-space-lg">
      {ge('time_conflict')}
      <div className="flex items-center justify-between mb-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {editing
            ? `Edit Jadwal ${activeTab === 'recurring' ? 'Berulang' : 'Pinjaman'}`
            : `Tambah Jadwal ${activeTab === 'recurring' ? 'Berulang' : 'Pinjaman'}`}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <Mso name="close" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Kolom kiri: identitas */}
        <div className="flex flex-col gap-space-sm">
          {/* --- Nama Penanggung Jawab --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">
              Nama Penanggung Jawab *
            </label>
            {activeTab === 'recurring' ? (
              <select
                name="guru_id"
                value={data.guru_id}
                onChange={handleChange}
                className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Pilih guru</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={currentUser || '-'}
                readOnly
                className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container text-on-surface cursor-default"
              />
            )}
            {fe('guru_id')}
          </div>

          {/* --- Kelas --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Pilihan Kelas *</label>
            <select
              name="kelas_id"
              value={data.kelas_id}
              onChange={handleChange}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            {fe('kelas_id')}
          </div>

          {/* --- Ruangan / Lab (baru — D4) --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Ruangan / Lab *</label>
            <select
              name="ruang_ajaran_id"
              value={data.ruang_ajaran_id}
              onChange={handleChange}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih ruangan</option>
              {ruangList.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            {fe('ruang_ajaran_id')}
          </div>

          {/* --- Mapel (opsional — D3) --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Mata Pelajaran (opsional)</label>
            <select
              name="mapel_id"
              value={data.mapel_id}
              onChange={handleChange}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— tidak pilih —</option>
              {mapelList.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
            {fe('mapel_id')}
          </div>

          {/* --- Alasan --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Tujuan / Alasan Pemakaian *</label>
            <textarea
              name="keterangan"
              value={data.keterangan}
              onChange={handleChange}
              placeholder="Misal: Praktikum Pemrograman Dasar"
              rows={3}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
            {fe('keterangan')}
          </div>

          {/* --- Telepon --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Nomor Telepon *</label>
            <input
              type="tel"
              name="no_telepon"
              value={data.no_telepon}
              onChange={handleChange}
              placeholder="081234567890"
              maxLength={20}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fe('no_telepon')}
          </div>

          {/* --- Jumlah Siswa --- */}
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jumlah Siswa *</label>
            <input
              type="number"
              name="jumlah_siswa"
              value={data.jumlah_siswa}
              onChange={handleChange}
              min={1}
              max={100}
              placeholder="32"
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fe('jumlah_siswa')}
          </div>
        </div>

        {/* Kolom kanan: waktu */}
        <div className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-high/40 rounded-xl p-space-sm">
            <label className="font-label-sm text-on-surface-variant mb-space-xs block flex items-center gap-space-xs">
              <Mso name={activeTab === 'recurring' ? 'calendar_today' : 'event_available'} />
              Detail Waktu
            </label>

            {activeTab === 'recurring' ? (
              <>
                <div>
                  <label className="font-label-sm text-on-surface-variant mb-space-xs block">Hari</label>
                  <select
                    name="hari"
                    value={data.hari}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {weekdays.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  {fe('hari')}
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jam Mulai</label>
                    <input
                      type="time"
                      name="jam_mulai"
                      value={data.jam_mulai}
                      onChange={handleChange}
                      className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {fe('jam_mulai')}
                  </div>
                  <div>
                    <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jam Selesai</label>
                    <input
                      type="time"
                      name="jam_selesai"
                      value={data.jam_selesai}
                      onChange={handleChange}
                      className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {fe('jam_selesai')}
                  </div>
                </div>
                <p className="font-body-xs text-body-xs text-on-surface-variant mt-space-xs">
                  Berlaku setiap minggu pada hari yang dipilih (Senin–Jumat).
                </p>
              </>
            ) : (
              <>
                <div>
                  <label className="font-label-sm text-on-surface-variant mb-space-xs block">Tanggal &amp; Jam Mulai</label>
                  <input
                    type="datetime-local"
                    name="tanggal_mulai"
                    value={data.tanggal_mulai}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {fe('tanggal_mulai')}
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant mb-space-xs block">Tanggal &amp; Jam Selesai</label>
                  <input
                    type="datetime-local"
                    name="tanggal_selesai"
                    value={data.tanggal_selesai}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {fe('tanggal_selesai')}
                </div>
                <p className="font-body-xs text-body-xs text-on-surface-variant mt-space-xs">
                  Peminjaman satu kali untuk rentang tanggal dan jam tertentu.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Form actions */}
        <div className="flex justify-end gap-space-sm mt-space-md pt-space-md border-t border-outline-variant">
          <button
            type="button"
            onClick={onCancel}
            className="px-space-md py-space-sm bg-surface-container-high text-on-surface-variant rounded-xl font-label-md font-medium hover:bg-surface-container transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={processing}
            className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs disabled:opacity-60"
          >
            <Mso name="save" /> Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
