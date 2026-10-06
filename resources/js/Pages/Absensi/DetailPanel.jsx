import { useState } from 'react';
import Mso from './Mso';
import EmployeeCard from './EmployeeCard';
import { employees, selectedDate } from './data';

export default function DetailPanel() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const tabConfigs = [
    { key: 'all', label: 'Semua', count: employees.length },
    { key: 'present', label: 'Hadir', count: employees.filter((e) => e.status === 'present').length },
    { key: 'late', label: 'Terlambat', count: employees.filter((e) => e.status === 'late').length },
    { key: 'leave', label: 'Cuti / Izin', count: employees.filter((e) => e.status === 'leave').length },
    { key: 'absent', label: 'Alpha', count: employees.filter((e) => e.status === 'absent').length },
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchesTab = activeTab === 'all' || emp.status === activeTab;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = query === '' || emp.name.toLowerCase().includes(query) || emp.empId.toLowerCase().includes(query) || emp.role.toLowerCase().includes(query);
    return matchesTab && matchesQuery;
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
              <span>Detail Rekapitulasi</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {selectedDate.day}
            </h3>
            <span className="font-body-sm text-body-sm text-outline">
              {selectedDate.recordCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              title="Refresh Data"
            >
              <Mso name="refresh" />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              title="Pilihan Tampilan"
            >
              <Mso name="more_vert" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1" id="filter-tabs">
          {tabConfigs.map((tab) => {
            const baseClasses =
              'tab-btn px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container font-label-md text-label-md font-semibold shrink-0 transition-all hover:bg-surface flex items-center gap-1';
            let selectedClasses = '';
            if (tab.key === 'present') selectedClasses = 'bg-primary text-on-primary';
            else if (tab.key === 'late') selectedClasses = 'bg-secondary text-on-secondary';
            else if (tab.key === 'leave') selectedClasses = 'bg-primary text-on-primary';
            else if (tab.key === 'absent') selectedClasses = 'bg-error text-on-error';
            else selectedClasses = 'bg-primary text-on-primary';

            const isActive = activeTab === tab.key;
            const cls = isActive
              ? `${baseClasses.replace('bg-surface-container-low', 'bg-primary').replace('hover:bg-surface', 'hover:bg-primary/90').replace('text-on-surface', 'text-on-primary')} ${selectedClasses}`
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
            placeholder="Cari nama karyawan, jabatan, atau NIK..."
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
            filteredEmployees.map((emp, i) => <EmployeeCard key={i} emp={emp} />)
          )}
        </div>

        {/* Panel Footer Controls */}
        <div className="pt-space-sm border-t border-transparent flex flex-col sm:flex-row items-center justify-between gap-space-sm" />
      </div>
    </div>
  );
}
