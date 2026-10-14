<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class AbsensiController extends Controller
{
    /**
     * Base directory (absolute) for student/guest photo assets.
     * Photos are named <nisn>.jpg (siswa) or <nip>.jpg (guru) in
     * resources/img/photos/.
     */
    private function photoDir(): string
    {
        // base_path() resolves to the project root reliably; using __DIR__
        // here would climb too far past the project root.
        return base_path('resources/img/photos');
    }

    /**
     * Resolve the photo URL for a user row.
     *
     * Uses the existing foto_path when present; otherwise looks for a file
     * named <nisn>.jpg / <nip>.jpg in resources/img/photos/. Falls back to a
     * generated ui-avatars.com placeholder when no file exists so the UI never
     * shows a broken image.
     */
    private function resolvePhoto($row): string
    {
        // If the DB already carries a foto_path (e.g. an uploaded avatar), use it.
        $fotoPath = $row->foto_path ?? null;
        if ($fotoPath && (File::exists(public_path($fotoPath))
            || filter_var($fotoPath, FILTER_VALIDATE_URL))) {
            return asset($fotoPath);
        }

        // Pick the lookup key: nisn for siswa, nip for guru/tamu.
        $id = null;
        if (!empty($row->nisn)) {
            $id = $row->nisn;
        } elseif (!empty($row->nip)) {
            $id = $row->nip;
        }

        if ($id) {
            $file = $this->photoDir() . '/' . $id . '.jpg';
            if (File::exists($file)) {
                // Serve through the public/ symlink so the PHP built-in
                // server (and any web server) can reach resources/img/photos/.
                return asset('img/photos/' . $id . '.jpg');
            }
        }

        // Final fallback — generated avatar from the person's name.
        $name = $row->nama ?? 'U';
        return 'https://ui-avatars.com/api/?background=4f46e5&color=fff&name='
            . urlencode($name);
    }

    /**
     * Fetch the 5 most recent scan records for a given pengguna.tipe.
     *
     * Uses the v_scan_lookup view which already joins log_akses ->
     * rfid_card -> pengguna -> siswa/guru, exposing nisn/nip + nama_kelas.
     * Returns up to 5 rows shaped for the DetailPanel employee cards.
     */
    private function lastScansByType(string $tipe, int $limit = 5): array
    {
        // waktu_scan is a unix-epoch stored as TEXT; cast to integer
        // so ordering is chronological rather than lexicographic.
        $rows = DB::connection('mysql')->table('log_akses as la')
            ->select([
                'la.id',
                'la.rfid_id',
                'la.lokasi_id',
                'la.jenis',
                'la.waktu_scan',
                'la.status',
                'la.keterangan',
                'p.tipe',
                'p.nama',
                'p.foto_path',
                'v.nisn',
                'v.nip',
                'v.nama_kelas',
                'v.tingkat',
                'r.uid',
                'l.nama_lokasi',
            ])
            ->join('rfid_card as r', 'r.id', '=', 'la.rfid_id')
            ->join('v_scan_lookup as v', 'v.uid', '=', 'r.uid')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->join('lokasi as l', 'l.id', '=', 'la.lokasi_id')
            ->where('p.tipe', $tipe)
            ->where('la.waktu_scan', 'REGEXP', '^[0-9]+$')
            ->orderByRaw('CAST(la.waktu_scan AS UNSIGNED) DESC')
            ->limit($limit)
            ->get();

        // Normalise each row into the shape DetailPanel expects.
        return $rows->map(function ($row) {
            $ts = $row->waktu_scan ? (int) $row->waktu_scan : null;
            $moment = $ts ? \Carbon\Carbon::createFromTimestamp($ts, 'Asia/Jakarta') : null;

            // jenis: masuk => Hadir (present), keluar => Keluar (absent)
            $isMasuk = ($row->jenis ?? '') === 'masuk';

            // empId: nisn for siswa, nip for tamu (keeps the card "no." meaningful)
            $empId = $row->nisn ?? '';
            if ($empId === '' && !empty($row->nip)) {
                $empId = $row->nip;
            }

            // role: class for siswa, jabatan/tingkat for guru
            $role = '—';
            if ($row->tipe === 'siswa') {
                $role = $row->nama_kelas ?? 'Siswa';
            } else {
                $role = 'Tamu';
            }

            return [
                'name'        => $row->nama ?? 'Tanpa Nama',
                'empId'       => $empId,
                'role'        => $role,
                'status'      => $isMasuk ? 'present' : 'absent',
                'statusLabel' => $isMasuk ? 'MASUK' : 'KELUAR',
                'statusPill'  => $isMasuk
                    ? 'bg-primary text-on-primary'
                    : 'bg-error text-on-error',
                'iconColor'   => $isMasuk
                    ? 'text-primary'
                    : 'text-error',
                'note'        => $moment
                    ? $moment->format('H:i, ') . $moment->translatedFormat('l, d M Y')
                    : '-',
                'photo'       => $this->resolvePhoto($row),
                'alt'         => $row->nama ?? 'Foto pengguna',
            ];
        })->values()->all();
    }

    public function index()
    {
        $db = DB::connection('mysql');

        // 1. Total Absensi — log_akses row count for siswa tipe, only 'masuk' status
        $totalAbsensi = (int) $db->table('log_akses as la')
            ->join('rfid_card as r', 'r.id', '=', 'la.rfid_id')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->where('p.tipe', 'siswa')
            ->where('la.jenis', 'masuk')
            ->count();

        // 2. Total Masuk — log_akses with jenis='masuk' only (all tipe)
        $totalMasuk = (int) $db->table('log_akses')->where('jenis', 'masuk')->count();

        // 3. Total Keluar — log_akses with jenis='keluar'
        $totalKeluar = (int) $db->table('log_akses')->where('jenis', 'keluar')->count();

        // 4. Total Kartu Siswa — rfid_card belong to siswa tipe only
        $totalKartuSiswa = (int) $db->table('rfid_card as r')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->where('p.tipe', 'siswa')
            ->count();

        // 5. Total Kartu Tamu — rfid_card that are NOT siswa (i.e. guru)
        $totalKartuTamu = (int) $db->table('rfid_card as r')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->where('p.tipe', '!=', 'siswa')
            ->count();

        // 6. Log akses per tanggal — dari kolom waktu_scan (unix-epoch sebagai
        //    text), kelompokkan per hari, hitung jumlah masuk & keluar.
        $logAkses = $db->table('log_akses')
            ->selectRaw("FROM_UNIXTIME(CAST(waktu_scan AS UNSIGNED)) AS ts, jenis")
            ->whereNotNull('waktu_scan')
            ->where('waktu_scan', 'REGEXP', '^[0-9]+$')
            ->get()
            ->map(function ($row) {
                $date = $row->ts ? date('Y-m-d', (int) strtotime($row->ts)) : null;
                return [
                    'date'  => $date,
                    'jenis' => $row->jenis,
                ];
            })
            ->groupBy('date')
            ->map(function ($group) {
                $masuk = $group->where('jenis', 'masuk')->count();
                $keluar = $group->where('jenis', 'keluar')->count();
                return [
                    'date'  => $group->first()['date'],
                    'masuk' => (int) $masuk,
                    'keluar'=> (int) $keluar,
                ];
            })
            ->values()
            ->all();

        // 7. Last 5 scans per type — drives the DetailPanel list.
        //    Default filter is siswa; tamu is the alternate tab.
        $lastScans = [
            'siswa' => $this->lastScansByType('siswa', 5),
            'tamu'  => $this->lastScansByType('guru', 5),
        ];

        return Inertia::render('Absensi/Index', [
            'stats'      => [
                'total_absensi'     => $totalAbsensi,
                'total_masuk'       => $totalMasuk,
                'total_keluar'      => $totalKeluar,
                'total_kartu_siswa' => $totalKartuSiswa,
                'total_kartu_tamu'  => $totalKartuTamu,
            ],
            'logAkses'  => $logAkses,
            'lastScans' => $lastScans,
        ]);
    }
}
