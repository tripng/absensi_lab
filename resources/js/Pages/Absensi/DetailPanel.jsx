import { useState } from 'react';
import Mso from './Mso';
import EmployeeCard from './EmployeeCard';
import { employees as fallbackEmployees } from './data';

/**
 * Format "hari, tanggal bulan tahun" sesuai locale Indonesia,
 * selalu menampilkan tanggal/waktu saat ini (hari ini).
 */
const formatToday = () => {
  const d = new Date();
  const day = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${day}, ${date}`;
};

export default function DetailPanel({ lastScans = null }) {
  // Filter tabs reduced to two categories: Siswa and Tamu.
  // Default filter is siswa, matching the current live behavior.
  const [activeTab, setActiveTab] = useState('siswa');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Resolve the active list from live DB data (lastScans). Fall back to the
  // static data.js employees only when lastScans is unavailable/empty so the
  // panel never renders an empty state during offline dev.
  const resolveList = (list) => {
    if (!list || list.length === 0) return fallbackEmployees;
    return list;
  };

  const siswaList = resolveList(lastScans?.siswa);
  const tamuList = resolveList(lastScans?.tamu);

  const tabConfigs = [
    {
      key: 'siswa',
      label: 'Siswa',
      count: siswaList.length,
    },
    {
      key: 'tamu',
      label: 'Tamu',
      count: tamuList.length,
    },
  ];

  const activeList = activeTab === 'siswa' ? siswaList : tamuList;

  const filteredEmployees = activeList.filter((emp) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === '' ||
      (emp.name && emp.name.toLowerCase().includes(query)) ||
      (emp.empId && emp.empId.toLowerCase().includes(query)) ||
      (emp.role && emp.role.toLowerCase().includes(query));
    return matchesQuery;
  });

  return (
    <div className="xl:col-span-4 flex flex-col gap-space-md">
      {/* Container Box */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md">
        {/* Panel Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase font-bold tracking-wider mb-0.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>5 Absen Terakhir</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {formatToday()}
            </h3>
            <span className="font-body-sm text-body-sm text-outline">
              5 absen terbaru hari ini
            </span>
          </div>
        </div>

        {/* Category Filter Tabs — now only Siswa / Tamu */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1" id="filter-tabs">
          {tabConfigs.map((tab) => {
            const baseClasses =
              'tab-btn px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container font-label-md text-label-md font-semibold shrink-0 transition-all hover:bg-surface flex items-center gap-1';
            let selectedClasses = '';
            if (tab.key === 'siswa') selectedClasses = 'bg-primary text-on-primary';
            else if (tab.key === 'tamu') selectedClasses = 'bg-tertiary text-on-tertiary';

            const isActive = activeTab === tab.key;
            const cls = isActive
              ? `${baseClasses.replace('bg-surface-container-low', 'bg-primary').replace('hover:bg-surface', 'hover:bg-primary/90').replace('text-on-surface', 'text-on-primary')} ${selectedClasses.replace('bg-primary text-on-primary', '')}`
              : baseClasses;

            return (
              <button
                key={tab.key}
                type="button"
                className={cls}
                data-tab={tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Instant Search Box */}
        <div className="relative w-full">
          <Mso name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            id="employee-search"
            className="w-full h-10 pl-9 pr-9 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
            placeholder="Cari nama, nisn/nip, atau kelas..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              id="clear-search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              onClick={clearSearch}
            >
              <Mso name="close" size={16} />
            </button>
          )}
        </div>

        {/* Scrollable Employee Feed */}
        <div className="flex flex-col gap-space-sm max-h-[580px] overflow-y-auto pr-1" id="employee-list">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              Tidak ada data yang cocok.
            </div>
          ) : (
            filteredEmployees.map((emp, i) => <EmployeeCard key={`${activeTab}-${emp.empId}-${i}`} emp={emp} />)
          )}
        </div>

        {/* Panel Footer Controls */}
        <div className="pt-space-sm border-t border-transparent flex flex-col sm:flex-row items-center justify-between gap-space-sm" />
      </div>
    </div>
  );
}
