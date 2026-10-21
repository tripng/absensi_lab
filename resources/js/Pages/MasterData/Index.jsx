import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';
import Modal from '@/Components/Modal';
import MasterDataForm from '@/Components/MasterDataForm';

/**
 * Master Data CRUD page (issue #5).
 *
 * Props dari MasterDataController::index():
 *   tabs, guruList, kelasList, ruangList, mapelList, formConfig
 *
 * UI:
 *  - Tab-switch antar entity (Guru/Kelas/Ruang/Mapel)
 *  - Tabel daftar di tiap tab dengan aksi Edit | Hapus
 *  - Modal form yang dirender secara data-driven dari formConfig[entity]
 *
 * Nama field di form pakai snake_case agar langsung match validation backend.
 */
// Kolom tabel per entity (key harus match field name atau label yang ada di list props).
const columnsFor = {
  guru: [
    { label: 'Nama', key: 'nama' },
    { label: 'NIP', key: 'nip' },
    { label: 'Jabatan', key: 'jabatan' },
  ],
  kelas: [
    { label: 'Nama Kelas', key: 'nama_kelas' },
    { label: 'Tingkat', key: 'tingkat' },
    { label: 'Tahun Ajaran', key: 'tahun_ajaran' },
  ],
  ruang: [
    { label: 'Nama Ruangan', key: 'nama_ruangan' },
    { label: 'Kapasitas', key: 'kapasitas' },
    { label: 'Labkom', key: 'labkom_label' },
  ],
  mapel: [
    { label: 'Kode', key: 'kode_mapel' },
    { label: 'Nama', key: 'nama_mapel' },
    { label: 'Kelompok', key: 'kelompok' },
    { label: 'Guru', key: 'guru_nama' },
  ],
};

export default function MasterDataIndex({
  tabs, guruList = [], kelasList = [], ruangList = [], mapelList = [],
  formConfig = {},
}) {
  const [activeTab, setActiveTab] = useState('guru');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const lists = { guru: guruList, kelas: kelasList, ruang: ruangList, mapel: mapelList };
  const current = lists[activeTab] ?? [];
  const fields = formConfig[activeTab] ?? [];
  const success = usePage().props.success;

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setShowModal(true);
  };
  const closeForm = () => {
    setShowModal(false);
    setEditing(null);
  };

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
                Kelola data dasar Guru, Kelas, Ruangan/Lab, dan Mata Pelajaran.
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-space-md flex gap-space-xs p-1 bg-surface-container-high rounded-xl">
              {Object.entries(tabs).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-lg font-label-md font-semibold transition-all ${
                    activeTab === key
                      ? 'bg-primary text-on-primary shadow'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <Mso name={tabIcon(key)} />
                  {label}
                </button>
              ))}
            </div>

            {/* Add button */}
            <div className="mb-space-md flex justify-between items-center">
              <button
                type="button"
                onClick={openCreate}
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow"
              >
                <Mso name="add" /> Tambah {tabs[activeTab]}
              </button>
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

            {/* Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              {current.length === 0 ? (
                <div className="py-space-xl text-center text-on-surface-variant">
                  <Mso name="inbox" size={40} className="mx-auto mb-space-sm text-outline" />
                  <p className="font-body-md">Belum ada data {tabs[activeTab]}.</p>
                </div>
              ) : (
                <table className="w-full text-left font-body-md">
                  <thead className="bg-surface-container-high text-on-surface-variant">
                    <tr>
                      {columnsFor[activeTab].map((c) => (
                        <th key={c.key} className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {current.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container transition-colors">
                        {columnsFor[activeTab].map((c) => (
                          <td key={c.key} className="px-space-md py-space-sm text-on-surface">
                            {row[c.key] ?? '-'}
                          </td>
                        ))}
                        <td className="px-space-md py-space-sm text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Mso name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus ${tabs[activeTab]} ini?`)) {
                                router.delete(`/master-data/${activeTab}/${row.id}`, {
                                  preserveScroll: true,
                                  onError: (errors) => {
                                    const message = Object.values(errors ?? {}).join('\n');
                                    alert(message || 'Gagal menghapus data.');
                                  },
                                });
                              }
                            }}
                            className="p-space-xs text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Mso name="delete" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal form (data-driven) */}
      <Modal show={showModal} maxWidth="lg" onClose={closeForm}>
        <div className="p-space-lg bg-surface-container-lowest">
          <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {editing ? `Edit ${tabs[activeTab]}` : `Tambah ${tabs[activeTab]}`}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <Mso name="close" />
            </button>
          </div>

          {/* key dipaksa remount tiap ganti edit/tab → useForm init data segar */}
          <MasterDataForm
            key={`${activeTab}-${editing ? editing.id : 'new'}`}
            activeTab={activeTab}
            fields={fields}
            editing={editing}
            onSuccess={closeForm}
          />
        </div>
      </Modal>
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
