import { useState } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';
import Modal from '@/Components/Modal';

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
                                  onError: () => {},
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

/**
 * Form dinamis: render row dari formConfig[entity].
 * Pakai useForm (controlled) → prefill edit otomatis + error server real-time.
 */
function MasterDataForm({ activeTab, fields, editing, onSuccess }) {
  const initial = {};
  fields.forEach((f) => {
    initial[f.name] = editing ? (editing[f.name] ?? '') : '';
  });
  const form = useForm(initial);

  const submit = (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((f) => {
      const v = form.data[f.name];
      if (f.type === 'select') data[f.name] = v ?? '';
      else if (f.type === 'number') data[f.name] = v === '' || v === null ? '' : Number(v);
      else data[f.name] = v;
    });
    if (editing) {
      form.put(`/master-data/${activeTab}/${editing.id}`, {
        preserveScroll: true,
        onSuccess,
      });
    } else {
      form.post(`/master-data/${activeTab}`, {
        preserveScroll: true,
        onSuccess,
      });
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
      {fields.map((f) => (
        <div key={f.name} className="flex flex-col gap-space-xs">
          <label className="font-label-sm text-on-surface-variant mb-space-xs block">
            {f.label}
            {f.required ? ' *' : ''}
          </label>
          {f.type === 'select' ? (
            <select
              value={form.data[f.name] ?? ''}
              onChange={(e) => form.setData(f.name, e.target.value)}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              value={form.data[f.name] ?? ''}
              onChange={(e) => form.setData(f.name, e.target.value)}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          {form.errors?.[f.name] && (
            <span className="font-label-sm text-error mt-space-xs">{form.errors[f.name]}</span>
          )}
        </div>
      ))}

      <div className="md:col-span-2 flex justify-end gap-space-sm mt-space-md pt-space-md border-t border-outline-variant">
        <button
          type="button"
          onClick={onSuccess}
          className="px-space-md py-space-sm bg-surface-container-high text-on-surface-variant rounded-xl font-label-md font-medium hover:bg-surface-container transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={form.processing}
          className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow disabled:opacity-60"
        >
          <Mso name="save" /> Simpan
        </button>
      </div>
    </form>
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
