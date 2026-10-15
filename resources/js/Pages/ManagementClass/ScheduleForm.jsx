import { useState } from 'react';
import Mso from '../Absensi/Mso';

export default function ScheduleForm({ activeTab, kelasList, weekdays, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    type: activeTab,
    pj: '',
    alasan: '',
    telp: '',
    jumlahSiswa: '',
    kelas: '',
    // recurring
    hari: 'senin',
    jamMulai: '08:00',
    jamSelesai: '09:00',
    // one-time
    tanggalMulai: '',
    tanggalSelesai: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.pj || !formData.kelas || !formData.alasan) {
      alert('Lengkapi nama PJ, kelas, dan alasan terlebih dahulu.');
      return;
    }
    if (activeTab === 'recurring' && formData.jamMulai >= formData.jamSelesai) {
      alert('Jam mulai harus lebih awal dari jam selesai.');
      return;
    }
    if (activeTab === 'one-time' && formData.tanggalMulai >= formData.tanggalSelesai) {
      alert('Tanggal/jam selesai harus setelah tanggal/jam mulai.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="mb-space-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-space-lg">
      <div className="flex items-center justify-between mb-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Tambah Jadwal {activeTab === 'recurring' ? 'Berulang' : 'Pinjaman'}
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
        {/* Kolom kiri */}
        <div className="flex flex-col gap-space-sm">
          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Nama Penanggung Jawab *</label>
            <input
              type="text"
              name="pj"
              value={formData.pj}
              onChange={handleChange}
              placeholder="Nama lengkap"
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Tujuan / Alasan Pemakaian *</label>
            <textarea
              name="alasan"
              value={formData.alasan}
              onChange={handleChange}
              placeholder="Misal: Praktikum Pemrograman Dasar"
              rows={3}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Nomor Telepon *</label>
            <input
              type="tel"
              name="telp"
              value={formData.telp}
              onChange={handleChange}
              placeholder="081234567890"
              pattern="[0-9]{10,15}"
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jumlah Siswa *</label>
            <input
              type="number"
              name="jumlahSiswa"
              value={formData.jumlahSiswa}
              onChange={handleChange}
              min="1"
              max="100"
              placeholder="32"
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant mb-space-xs block">Pilihan Kelas *</label>
            <select
              name="kelas"
              value={formData.kelas}
              onChange={handleChange}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih kelas</option>
              {kelasList.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kolom kanan — waktu */}
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
                    value={formData.hari}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {weekdays.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jam Mulai</label>
                    <input
                      type="time"
                      name="jamMulai"
                      value={formData.jamMulai}
                      onChange={handleChange}
                      className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-on-surface-variant mb-space-xs block">Jam Selesai</label>
                    <input
                      type="time"
                      name="jamSelesai"
                      value={formData.jamSelesai}
                      onChange={handleChange}
                      className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
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
                    name="tanggalMulai"
                    value={formData.tanggalMulai}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant mb-space-xs block">Tanggal &amp; Jam Selesai</label>
                  <input
                    type="datetime-local"
                    name="tanggalSelesai"
                    value={formData.tanggalSelesai}
                    onChange={handleChange}
                    className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="font-body-xs text-body-xs text-on-surface-variant mt-space-xs">
                  Peminjaman satu kali untuk rentang tanggal dan jam tertentu.
                </p>
              </>
            )}
          </div>
        </div>
      </form>

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
          onClick={handleSubmit}
          className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs"
        >
          <Mso name="save" /> Simpan
        </button>
      </div>
    </div>
  );
}
