import Mso from './Mso';

export default function Topbar() {
  return (
    <header className="h-16 bg-surface-container-lowest shadow-sm flex items-center justify-between px-space-lg border-b border-outline-variant sticky top-0 z-40">
      {/* Left: page title + breadcrumbs */}
      <div className="flex items-center gap-space-md">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
          Home
        </span>
        <span className="text-outline">/</span>
        <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
          Kalender Absensi Lab Komputer
        </span>
      </div>

      {/* Right: quick actions */}
      <div className="flex items-center gap-space-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari..."
            className="h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-label-md text-label-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <Mso name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
        </div>

        <button
          type="button"
          className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
          title="Notifikasi"
        >
          <Mso name="notifications" size={20} />
        </button>

        <button
          type="button"
          className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
          title="Profil"
        >
          <Mso name="account_circle" size={22} />
        </button>
      </div>
    </header>
  );
}
