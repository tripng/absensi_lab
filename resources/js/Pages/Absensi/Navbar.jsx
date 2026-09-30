import Mso from './Mso';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'Absensi', icon: 'calendar_today', active: true },
  { label: 'Laporan', icon: 'list_alt', active: false },
  { label: 'Staf', icon: 'group', active: false },
  { label: 'Pengaturan', icon: 'settings', active: false },
];

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 h-screen w-64 bg-surface-container-lowest shadow-lg flex flex-col z-50">
      {/* Brand */}
      <div className="p-space-md border-b border-outline-variant flex items-center gap-space-sm">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary">
          <Mso name="computer" size={20} />
        </div>
        <span className="font-headline-md text-headline-md font-extrabold text-on-surface">
          AbsensiLab
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-space-md overflow-y-auto">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`mx-space-md mb-space-sm flex items-center gap-space-sm px-space-md py-space-sm rounded-xl transition-all cursor-pointer ${
              item.active
                ? 'bg-primary-fixed shadow text-primary font-label-md font-extrabold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-md font-medium'
            }`}
          >
            <Mso name={item.icon} className={item.active ? 'text-primary' : 'text-on-surface-variant'} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer / User */}
      <div className="p-space-md border-t border-outline-variant flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
          <span className="font-label-sm text-label-sm font-bold">T</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md font-extrabold text-on-surface">Trip Nguyen</span>
          <span className="font-body-sm text-body-sm text-outline">Admin</span>
        </div>
      </div>
    </nav>
  );
}
