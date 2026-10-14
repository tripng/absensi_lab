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

      </div>
    </header>
  );
}
