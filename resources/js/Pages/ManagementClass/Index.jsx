import { useState } from 'react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';
import ScheduleForm from './ScheduleForm';
import ScheduleCard from './ScheduleCard';

// Kelas X1–X15 untuk dropdown
const kelasList = Array.from({ length: 15 }, (_, i) => `X${i + 1}`);

// Hari kerja Senin–Jumat
const weekdays = [
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
];

// Data dummy awal (mock state)
const initialSchedules = [
  {
    id: 'mock-1',
    type: 'recurring',
    pj: 'Rina Sari, S.Kom.',
    kelas: 'X.1',
    hari: 'senin',
    jamMulai: '08:00',
    jamSelesai: '09:30',
    jumlahSiswa: 32,
    alasan: 'Praktikum Pemrograman Dasar',
    telp: '081234567890',
  },
  {
    id: 'mock-2',
    type: 'recurring',
    pj: 'Budi Santoso, S.Pd.',
    kelas: 'X.3',
    hari: 'rabu',
    jamMulai: '10:00',
    jamSelesai: '11:30',
    jumlahSiswa: 28,
    alasan: 'Praktikum Jaringan Komputer',
    telp: '081345678901',
  },
  {
    id: 'mock-3',
    type: 'one-time',
    pj: 'Dewi Lestari, S.Kom.',
    kelas: 'X.5',
    tanggalMulai: '2026-10-20T09:00',
    tanggalSelesai: '2026-10-20T12:00',
    jumlahSiswa: 25,
    alasan: 'Ujian Tengah Semester Ganjil',
    telp: '081456789012',
  },
  {
    id: 'mock-4',
    type: 'one-time',
    pj: 'Andi Wijaya, S.Pd.',
    kelas: 'X.7',
    tanggalMulai: '2026-10-22T13:00',
    tanggalSelesai: '2026-10-22T15:00',
    jumlahSiswa: 30,
    alasan: 'Kompetisi Robotik Antar-Sekolah',
    telp: '081567890123',
  },
];

const badgeColor = {
  recurring: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'one-time': 'bg-secondary-fixed text-on-secondary-fixed-variant',
};

export default function ManagementClassIndex() {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [activeTab, setActiveTab] = useState('recurring');
  const [showForm, setShowForm] = useState(false);

  const formatTimeDisplay = (s) => {
    if (s.type === 'recurring') {
      const dayLabel = weekdays.find((w) => w.value === s.hari)?.label || s.hari;
      return `${dayLabel}, ${s.jamMulai}–${s.jamSelesai}`;
    }
    const dMulai = new Date(s.tanggalMulai);
    const dSelesai = new Date(s.tanggalSelesai);
    const fmt = (d) => d.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return `${fmt(dMulai)} – ${fmt(dSelesai)}`;
  };

  const handleAdd = (formData) => {
    const newSchedule = {
      id: `sched-${Date.now()}`,
      ...formData,
    };
    setSchedules([newSchedule, ...schedules]);
    setShowForm(false);
  };

  const activeSchedules = schedules.filter((s) => s.type === activeTab);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-space-md sm:px-space-lg lg:px-space-lg py-space-lg">
            {/* Page title */}
            <div className="mb-space-lg">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Manajemen Jadwal Lab
              </h1>
              <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
                Kelola jadwal pemakaian laboratorium komputer — jadwal berulang (Senin–Jumat) atau pinjaman satu kali.
              </p>
            </div>

            {/* Tab navigation */}
            <div className="mb-space-md flex gap-space-xs p-1 bg-surface-container-high rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('recurring'); setShowForm(false); }}
                className={`flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-lg font-label-md font-semibold transition-all ${
                  activeTab === 'recurring'
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Mso name="calendar_today" /> Jadwal Berulang
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('one-time'); setShowForm(false); }}
                className={`flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-lg font-label-md font-semibold transition-all ${
                  activeTab === 'one-time'
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Mso name="event_available" /> Jadwal Pinjaman
              </button>
            </div>

            {/* Add button + form */}
            {!showForm && (
              <div className="mb-space-md">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow"
                >
                  <Mso name="add" /> Tambah Jadwal
                </button>
              </div>
            )}

            {showForm && (
              <ScheduleForm
                key={activeTab}
                activeTab={activeTab}
                kelasList={kelasList}
                weekdays={weekdays}
                onCancel={() => setShowForm(false)}
                onSubmit={handleAdd}
              />
            )}

            {/* Schedule list */}
            <div className="space-y-space-sm">
              {activeSchedules.length === 0 ? (
                <div className="py-space-xl text-center text-on-surface-variant">
                  <Mso name="inbox_empty" size={40} className="mx-auto mb-space-sm text-outline" />
                  <p className="font-body-md">Belum ada jadwal {activeTab === 'recurring' ? 'berulang' : 'pinjaman'}.</p>
                </div>
              ) : (
                activeSchedules.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    badgeColor={badgeColor}
                    weekdays={weekdays}
                    formatTime={formatTimeDisplay}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
