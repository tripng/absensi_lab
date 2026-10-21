import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Navbar from '../../Absensi/Navbar';
import Topbar from '../../Absensi/Topbar';
import Mso from '../../Absensi/Mso';
import Modal from '@/Components/Modal';
import MasterDataForm from '@/Components/MasterDataForm';

const entity = 'guru';
const label = 'Guru';
const columns = [
  { label: 'Nama', key: 'nama' },
  { label: 'NIP', key: 'nip' },
  { label: 'Jabatan', key: 'jabatan' },
];

export default function GuruIndex({ guruList = [], formConfig = {} }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const fields = formConfig[entity] ?? [];
  const { success, search: initialSearch = '' } = usePage().props;
  const [query, setQuery] = useState(initialSearch);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    router.get('/master-data/guru', value === '' ? {} : { search: value }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

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
            <div className="mb-space-lg">
              <Link
                href="/master-data"
                className="inline-flex items-center gap-space-xs mb-space-sm font-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                <Mso name="arrow_back" size={18} /> Master Data
              </Link>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Data {label}
              </h1>
              <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
                Kelola data pengajar, NIP, dan jabatan.
              </p>
            </div>

            <div className="mb-space-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
              <div className="relative w-full sm:max-w-sm">
                <Mso
                  name="search"
                  size={18}
                  className="absolute left-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="text"
                  id="guru-search"
                  name="search"
                  value={query}
                  onChange={handleSearch}
                  placeholder="Cari nama atau NIP..."
                  className="w-full pl-10 pr-space-sm py-space-sm border border-outline-variant rounded-xl bg-surface-container-high text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow"
              >
                <Mso name="add" /> Tambah {label}
              </button>
            </div>

            {success && (
              <div
                role="status"
                className="mb-space-md flex items-center gap-space-xs px-space-md py-space-sm bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary/20 rounded-xl font-body-md"
              >
                <Mso name="check_circle" size={18} />
                <span>{success}</span>
              </div>
            )}

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              {guruList.length === 0 ? (
                <div className="py-space-xl text-center text-on-surface-variant">
                  <Mso name="inbox" size={40} className="mx-auto mb-space-sm text-outline" />
                  <p className="font-body-md">Belum ada data {label}.</p>
                </div>
              ) : (
                <table className="w-full text-left font-body-md">
                  <thead className="bg-surface-container-high text-on-surface-variant">
                    <tr>
                      {columns.map((c) => (
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
                    {guruList.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container transition-colors">
                        {columns.map((c) => (
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
                              if (confirm(`Hapus ${label} ini?`)) {
                                router.delete(`/master-data/${entity}/${row.id}`, {
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

      <Modal show={showModal} maxWidth="lg" onClose={closeForm}>
        <div className="p-space-lg bg-surface-container-lowest">
          <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {editing ? `Edit ${label}` : `Tambah ${label}`}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <Mso name="close" />
            </button>
          </div>

          <MasterDataForm
            key={editing ? `edit-${editing.id}` : 'new'}
            activeTab={entity}
            fields={fields}
            editing={editing}
            onSuccess={closeForm}
          />
        </div>
      </Modal>
    </div>
  );
}
