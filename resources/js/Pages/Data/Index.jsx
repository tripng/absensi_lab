import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';

export default function DataIndex({ absensi = { data: [], meta: {} } }) {
  const { data, meta } = absensi;
  const { url } = usePage();
  const params = new URLSearchParams(url.split('?')[1] || '');
  const currentPage = parseInt(params.get('page') || '1', 10);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? data.filter(
        (row) =>
          row.nama.toLowerCase().includes(filter.toLowerCase()) ||
          row.id_pengguna?.toLowerCase().includes(filter.toLowerCase()) ||
          row.lokasi.toLowerCase().includes(filter.toLowerCase())
      )
    : data;

  const renderCell = (row, key) => {
    const val = row[key];
    if (val === null || val === undefined || val === '') {
      return <span className="text-on-surface-variant">—</span>;
    }
    return <span className="text-on-surface">{val}</span>;
  };

  const statusClasses = {
    sukses: 'bg-green-100 text-green-800',
    gagal: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar navigation */}
      <Navbar />

      {/* Main content area (offset by sidebar width) */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Topbar */}
        <Topbar />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-space-md sm:px-space-lg lg:px-space-lg py-space-lg">
            {/* Page title */}
            <div className="mb-space-lg">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Data Absensi
              </h1>
              <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
                Daftar seluruh catatan absensi dari tabel log_akses.
              </p>
            </div>

            {/* Filter */}
            <div className="mb-space-md">
              <input
                type="text"
                placeholder="Cari nama, NISN/NIP, lokasi..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full max-w-sm px-space-md py-space-sm border border-outline-variant rounded-xl bg-surface-container-high text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Total info */}
            <div className="mb-space-md text-body-sm text-on-surface-variant">
              {meta.total !== undefined ? `Total: ${meta.total} catatan` : ''}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="min-w-full divide-y divide-outline-variant">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">#</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Waktu Scan</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Nama</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Tipe</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">ID (NISN/NIP)</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Kelas</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Jenis</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Status</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Lokasi</th>
                    <th className="px-space-md py-space-sm text-left font-label-md font-medium text-on-surface">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-space-md py-space-lg text-center text-on-surface-variant">
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, i) => {
                      const realNo = meta.current_page && meta.per_page
                        ? (meta.current_page - 1) * meta.per_page + i + 1
                        : i + 1;
                      const statusCls = statusClasses[row.status] || 'bg-surface-container text-on-surface-variant';
                      return (
                        <tr key={row.id}>
                          <td className="px-space-md py-space-sm font-label-sm text-on-surface-variant">{realNo}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'waktu_scan')}</td>
                          <td className="px-space-md py-space-sm font-label-sm font-medium">{row.nama}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'tipe')}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'id_pengguna')}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'kelas')}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'jenis')}</td>
                          <td className="px-space-md py-space-sm">
                            <span className={`inline-block px-space-sm rounded-full font-label-sm font-medium ${statusCls}`}>
                              {row.status || '-'}
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'lokasi')}</td>
                          <td className="px-space-md py-space-sm font-label-sm">{renderCell(row, 'keterangan')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="mt-space-lg flex justify-center gap-space-sm">
                {Array.from({ length: meta.last_page }, (_, idx) => idx + 1).map((pageNum) => {
                  const isCurrent = pageNum === currentPage;
                  return (
                    <Link
                      key={pageNum}
                      href={`/data?page=${pageNum}`}
                      className={
                        isCurrent
                          ? 'px-space-sm py-space-xs rounded bg-primary text-on-primary font-label-sm font-bold'
                          : 'px-space-sm py-space-xs rounded bg-surface-container-high text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm'
                      }
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
