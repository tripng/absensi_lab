import { Link, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';

/**
 * Dashboard Master Data (issue #9).
 *
 * Props dari MasterDataController::index() tanpa entity:
 *   tabs, guruList, kelasList, ruangList, mapelList, formConfig
 *
 * Halaman ini hanya pusat navigasi; CRUD dilakukan di /master-data/{entity}.
 */
const descriptions = {
  guru: 'Data pengajar, NIP, dan jabatan.',
  kelas: 'Daftar kelas, tingkat, dan tahun ajaran.',
  ruang: 'Ruangan belajar dan keterkaitan labkom.',
  mapel: 'Mata pelajaran, kelompok, dan guru pengampu.',
};

export default function MasterDataIndex({
  tabs = {},
  guruList = [],
  kelasList = [],
  ruangList = [],
  mapelList = [],
}) {
  const lists = { guru: guruList, kelas: kelasList, ruang: ruangList, mapel: mapelList };
  const success = usePage().props.success;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-space-md sm:px-space-lg lg:px-space-lg py-space-lg">
            {/* Header */}
            <div className="mb-space-lg">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Manajemen Master Data
              </h1>
              <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
                Pilih kategori data yang ingin dikelola.
              </p>
            </div>

            {/* Success flash */}
            {success && (
              <div
                role="status"
                className="mb-space-md flex items-center gap-space-xs px-space-md py-space-sm bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary/20 rounded-xl font-body-md"
              >
                <Mso name="check_circle" size={18} />
                <span>{success}</span>
              </div>
            )}

            {/* Entity cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
              {Object.entries(tabs).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/master-data/${key}`}
                  className="group flex flex-col p-space-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="p-space-sm bg-primary/10 text-primary rounded-xl">
                      <Mso name={tabIcon(key)} size={24} />
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {(lists[key] ?? []).length}
                    </span>
                  </div>
                  <h2 className="font-title-lg text-title-lg font-semibold text-on-surface">
                    {label}
                  </h2>
                  <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant flex-1">
                    {descriptions[key] ?? 'Kelola data master.'}
                  </p>
                  <span className="mt-space-md inline-flex items-center gap-space-xs font-label-md font-semibold text-primary">
                    Kelola <Mso name="arrow_forward" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function tabIcon(key) {
  const map = {
    guru: 'school',
    kelas: 'class',
    ruang: 'meeting_room',
    mapel: 'book',
  };
  return map[key] ?? 'folder';
}
