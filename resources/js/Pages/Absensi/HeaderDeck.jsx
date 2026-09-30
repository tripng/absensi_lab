import Mso from './Mso';

export default function HeaderDeck() {
  return (
    <div className="pt-space-md pb-space-lg flex flex-col gap-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-extrabold">
              Kalender Absensi Lab Komputer
            </span>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Live Realtime
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Pilih tanggal untuk melihat detail siapa saja yang masuk presisi dan terverifikasi biometrik.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            type="button"
            id="btn-export-daily"
            className="px-space-md h-10 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all shadow-sm"
          >
            <Mso name="download" className="text-primary" />
            <span>Unduh Laporan Harian</span>
          </button>
          <button
            type="button"
            id="btn-print-summary"
            className="px-space-md h-10 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all shadow-sm"
          >
            <Mso name="print" className="text-on-surface-variant" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>
    </div>
  );
}
