import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';
import ScheduleForm from './ScheduleForm';
import ScheduleCard from './ScheduleCard';

// Hari kerja Senin–Jumat
const weekdays = [
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
];

const badgeColor = {
  recurring: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'one-time': 'bg-secondary-fixed text-on-secondary-fixed-variant',
};

/**
 * Props dari ManagementClassController::index():
 *   kelasList, ruangList, guruList, recurring, pinjaman
 * Data mapping (issue #3 tabel 4-5):
 *   recurring.pj  = guru.pengguna.nama   | pinjaman.pj = users.name (peminjam)
 *   recurring.alasan  = jadwal_ajaran.keterangan
 *   recurring.telp    = jadwal_ajaran.no_telepon
 *   recurring.ruangan = ruang_ajaran (nama_ruangan / labkom)
 */
export default function ManagementClassIndex({
  kelasList, ruangList, guruList, recurring = [], pinjaman = [],
}) {
  const [activeTab, setActiveTab] = useState('recurring');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { auth } = usePage().props;

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

  // POST → 302 redirect ke index; Inertia ikut & server kirim props terbaru.
  const handleAdd = (formData) => {
    router.post('/management-class', formData, {
      preserveScroll: true,
      onSuccess: () => setShowForm(false),
    });
  };

  const handleEdit = (schedule) => {
    setEditing(schedule);
    setShowForm(true);
  };

  const handleDelete = (schedule) => {
    if (!confirm('Hapus jadwal ini?')) return;
    router.delete(`/management-class/${schedule.id}`, {
      data: { type: schedule.type },
      preserveScroll: true,
    });
  };

  const activeSchedules = activeTab === 'recurring' ? recurring : pinjaman;

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
                onClick={() => { setActiveTab('recurring'); setShowForm(false); setEditing(null); }}
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
                onClick={() => { setActiveTab('one-time'); setShowForm(false); setEditing(null); }}
                className={`flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-lg font-label-md font-semibold transition-all ${
                  activeTab === 'one-time'
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Mso name="event_available" /> Jadwal Pinjaman
              </button>
            </div>

            {/* Add button */}
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

            {/* Form */}
            {showForm && (
              <ScheduleForm
                key={activeTab}
                activeTab={activeTab}
                kelasList={kelasList}
                ruangList={ruangList}
                guruList={guruList}
                weekdays={weekdays}
                editing={editing}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                onSuccess={() => { setShowForm(false); setEditing(null); }}
                currentUser={auth?.user?.name}
              />
            )}

            {/* Schedule list */}
            <div className="space-y-space-sm">
              {activeSchedules.length === 0 ? (
                <div className="py-space-xl text-center text-on-surface-variant">
                  <Mso name="inbox_empty" size={40} className="mx-auto mb-space-sm text-outline" />
                  <p className="font-body-md">
                    Belum ada jadwal {activeTab === 'recurring' ? 'berulang' : 'pinjaman'}.
                  </p>
                </div>
              ) : (
                activeSchedules.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    badgeColor={badgeColor}
                    weekdays={weekdays}
                    formatTime={formatTimeDisplay}
                    onEdit={() => handleEdit(s)}
                    onDelete={() => handleDelete(s)}
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
