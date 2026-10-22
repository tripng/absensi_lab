<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DataController extends Controller
{
    /**
     * Tampilkan seluruh data absensi dari tabel log_akses.
     * Join ke rfid_card, pengguna, v_scan_lookup
     * agar kolom nama, nisn/nip, tipe, dan nama_kelas lengkap.
     * Dukung filter rentang tanggal (start_date sampai end_date) dan kelas.
     */
    public function index(Request $request)
    {
        $db = DB::connection('mysql');

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $kelas = $request->query('kelas');

        // Validasi format tanggal sederhana (YYYY-MM-DD).
        $startTs = null;
        $endTs = null;
        if ($startDate) {
            $d = \DateTime::createFromFormat('Y-m-d', $startDate);
            if ($d && $d->format('Y-m-d') === $startDate) {
                $startTs = $d->setTime(0, 0, 0)->getTimestamp();
            }
        }
        if ($endDate) {
            $d = \DateTime::createFromFormat('Y-m-d', $endDate);
            if ($d && $d->format('Y-m-d') === $endDate) {
                $endTs = $d->setTime(23, 59, 59)->getTimestamp();
            }
        }

        $query = $db->table('log_akses as la')
            ->selectRaw('
                la.id,
                la.jenis,
                la.waktu_scan,
                la.status,
                p.tipe,
                p.nama as nama,
                v.nisn,
                v.nip,
                v.nama_kelas,
                v.tingkat
            ')
            ->join('rfid_card as r', 'r.id', '=', 'la.rfid_id')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->leftJoin('v_scan_lookup as v', 'v.uid', '=', 'r.uid')
            ->where('la.waktu_scan', 'REGEXP', '^[0-9]+$')
            ->orderByRaw('CAST(la.waktu_scan AS UNSIGNED) DESC');

        // Filter rentang tanggal berdasarkan waktu_scan (unix epoch).
        if ($startTs) {
            $query->whereRaw('CAST(la.waktu_scan AS UNSIGNED) >= ?', [$startTs]);
        }
        if ($endTs) {
            $query->whereRaw('CAST(la.waktu_scan AS UNSIGNED) <= ?', [$endTs]);
        }

        // Filter kelas (hanya berlaku untuk siswa yang punya nama_kelas).
        if ($kelas) {
            $query->where('v.nama_kelas', $kelas);
        }

        // Daftar kelas unik untuk dropdown (hanya siswa yang punya nama_kelas).
        $kelasList = $db->table('v_scan_lookup')
            ->whereNotNull('nama_kelas')
            ->where('nama_kelas', '!=', '')
            ->distinct()
            ->pluck('nama_kelas')
            ->sort()
            ->values()
            ->all();

        $perPage = 25;
        $page = max(1, (int) $request->query('page', 1));
        $offset = ($page - 1) * $perPage;

        $total = $query->count();

        $rows = $query->limit($perPage)->offset($offset)->get()->map(function ($row) {
            $ts = $row->waktu_scan ? (int) $row->waktu_scan : null;
            $moment = $ts ? Carbon::createFromTimestamp($ts, 'Asia/Jakarta') : null;

            $idLabel = $row->tipe === 'siswa' ? ($row->nisn ?? '') : ($row->nip ?? '');

            return [
                'id' => (int) $row->id,
                'waktu_scan' => $moment ? $moment->format('Y-m-d H:i:s') : '-',
                'tanggal' => $moment ? $moment->format('Y-m-d') : '-',
                'jam' => $moment ? $moment->format('H:i') : '-',
                'nama' => $row->nama ?? '-',
                'tipe' => $row->tipe ?? '-',
                'id_pengguna' => $idLabel ?: '-',
                'kelas' => ($row->nama_kelas ?? ($row->tingkat ?? '-')),
                'jenis' => $row->jenis ?? '-',
                'status' => $row->status ?? '-',
            ];
        })->values();

        $data = [
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => (int) $total,
                'last_page' => (int) ceil($total / $perPage),
                'from' => $total > 0 ? min($total, ($page - 1) * $perPage + 1) : 0,
                'to' => min($total, $page * $perPage),
            ],
            'filters' => [
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
                'kelas' => $kelas ?? '',
            ],
            'kelasList' => $kelasList,
        ];

        return Inertia::render('Data/Index', [
            'absensi' => $data,
        ]);
    }

    /**
     * Export daftar hadir (absensi) kelas tertentu ke format Excel (.xlsx).
     *
     * Aturan:
     *  - Parameter kelas wajib; jika kosong kirim error Inertia.
     *  - Rentang tanggal diambil dari filter (start_date/end_date);
     *    jika tidak ada gunakan seluruh bulan berjalan.
     *  - Grid per tanggal:
     *      '.' = hadir (ada scan masuk)
     *      'a' = alfa   (tidak ada scan sama sekali)
     *    Kolom sakit/izin tetap ada (rekap) namun selalu 0 karena
     *    sistem belum memiliki sumber data izin/sakit.
     */
    public function export(Request $request)
    {
        $db = DB::connection('mysql');

        $kelas = $request->query('kelas');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if (! $kelas) {
            // Kembalikan ke halaman data dengan error sederhana.
            return redirect('/data')->withErrors(['kelas' => 'Pilih kelas terlebih dahulu untuk export.']);
        }

        // Tentukan rentang tanggal.
        if ($startDate && $endDate) {
            $dari = \DateTime::createFromFormat('Y-m-d', $startDate);
            $sampai = \DateTime::createFromFormat('Y-m-d', $endDate);
        } else {
            // Default: seluruh bulan ini.
            $tz = new \DateTimeZone('Asia/Jakarta');
            $now = new \DateTime('now', $tz);
            $dari = \DateTime::createFromFormat('Y-m-d H:i:s', $now->format('Y-m-01 00:00:00'), $tz);
            $sampai = \DateTime::createFromFormat('Y-m-d H:i:s', $now->format('Y-m-t 23:59:59'), $tz);
        }

        $startTs = $dari ? $dari->getTimestamp() : null;
        $endTs = $sampai ? $sampai->getTimestamp() : null;

        // Semua siswa aktif kelas X (sorted by nama).
        $siswa = $db->table('v_scan_lookup')
            ->where('tipe', 'siswa')
            ->where('status_aktif', 'aktif')
            ->where('nama_kelas', $kelas)
            ->orderBy('nama')
            ->get(['uid', 'nisn', 'nama', 'nama_kelas', 'tingkat']);

        $totalSiswa = $siswa->count();

        // Scan absensi pada rentang tanggal (jenis 'masuk').
        // Group: uid => set tanggal (d-m-Y string) yang pernah scan.
        $scanRaw = $db->table('log_akses as la')
            ->selectRaw('r.uid, la.jenis, FROM_UNIXTIME(CAST(la.waktu_scan AS UNSIGNED), "%Y-%m-%d") as tgl')
            ->join('rfid_card as r', 'r.id', '=', 'la.rfid_id')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->leftJoin('v_scan_lookup as v', 'v.uid', '=', 'r.uid')
            ->where('la.waktu_scan', 'REGEXP', '^[0-9]+$')
            ->where('v.nama_kelas', $kelas)
            ->when($startTs, fn ($q) => $q->whereRaw('CAST(la.waktu_scan AS UNSIGNED) >= ?', [$startTs]))
            ->when($endTs, fn ($q) => $q->whereRaw('CAST(la.waktu_scan AS UNSIGNED) <= ?', [$endTs]))
            ->where('la.jenis', 'masuk')
            ->get();

        // Map: uid => [ set 'd-m-Y' hadir ]
        $hadirMap = [];
        foreach ($scanRaw as $row) {
            if (! isset($hadirMap[$row->uid])) {
                $hadirMap[$row->uid] = [];
            }
            $hadirMap[$row->uid][$row->tgl] = true;
        }

        // Bangun list tanggal (kloning agar $dari/$sampai tidak dimutasi display).
        $endInclusive = (clone $sampai)->modify('+1 day');
        $period = new \DatePeriod($dari, new \DateInterval('P1D'), $endInclusive);
        $dates = [];
        foreach ($period as $dt) {
            $dates[] = $dt;
        }

        // Spreadsheet
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Absensi '.$kelas);

        // Tanggal 1-31 mulai kolom E (index 5)
        $colStart = 5;
        $colLetter = function ($idx) {
            $letters = '';
            while ($idx > 0) {
                $mod = ($idx - 1) % 26;
                $letters = chr(65 + $mod).$letters;
                $idx = intval(($idx - $mod) / 26);
            }

            return $letters;
        };

        // --- Header (baris 1-6) ---
        // Row 1: Judul
        $sheet->setCellValue('A1', 'DAFTAR HADIR SISWA KELAS '.$kelas);
        $lastCol = Coordinate::stringFromColumnIndex($colStart + count($dates) + 4);
        $sheet->mergeCells('A1:'.$lastCol.'1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Row 2: periode
        $sheet->setCellValue('A2', 'Periode: '.$dari->format('d/m/Y').' - '.$sampai->format('d/m/Y'));
        $sheet->mergeCells('A2:AN2');

        // Row 3: Kelas
        $sheet->setCellValue('C3', 'Kelas');
        $sheet->setCellValue('D3', $kelas);
        $sheet->setCellValue('H3', 'Jumlah');
        $sheet->setCellValue('I3', $totalSiswa.' orang');

        // Row 3: Wali Kelas (kolom kosong)
        $sheet->setCellValue('K3', 'Wali Kelas');
        $sheet->setCellValue('L3', '');

        // Row 4: Gender (kosong)
        $sheet->setCellValue('H4', 'Laki-Laki');
        $sheet->setCellValue('I4', '');
        $sheet->setCellValue('K4', 'Perempuan');
        $sheet->setCellValue('L4', '');

        // --- Table header (row 5) ---
        $sheet->setCellValue('A5', 'No.');
        $sheet->setCellValue('B5', 'NISN');
        $sheet->setCellValue('C5', 'Nama');
        $sheet->setCellValue('D5', 'L/P');

        foreach ($dates as $i => $dt) {
            $cl = $colLetter($colStart + $i);
            $sheet->getCell($cl.'5')->setValue((int) $dt->format('j'));
        }

        // Rekap di sebelah kanan tanggal
        $rekapStart = $colStart + count($dates);

        // Merge "Rekap" label
        $sheet->getCell($colLetter($rekapStart).'5')->setValue('Rekap');
        $sheet->mergeCells($colLetter($rekapStart).'5:'.$colLetter($rekapStart).'6');

        // --- Student rows (mulai row 6) ---
        foreach ($siswa as $i => $s) {
            $rowNum = 6 + $i;
            $no = $i + 1;
            $nisn = $s->nisn ?? '';
            $nama = $s->nama ?? '-';

            $sheet->setCellValue('A'.$rowNum, $no);
            $sheet->setCellValue('B'.$rowNum, $nisn);
            $sheet->setCellValue('C'.$rowNum, $nama);
            $sheet->setCellValue('D'.$rowNum, ''); // L/P kosong

            $hadirCount = 0;
            $alfaCount = 0;
            // sakit/izin = 0 (tidak ada sumber data di sistem ini)
            $sakitCount = 0;
            $izinCount = 0;

            foreach ($dates as $j => $dt) {
                $cl = $colLetter($colStart + $j);
                $tglKey = $dt->format('Y-m-d');

                if (isset($hadirMap[$s->uid][$tglKey])) {
                    $sheet->getCell($cl.$rowNum)->setValue('.');
                    $hadirCount++;
                } else {
                    // Tidak ada scan pada tanggal ini = alfa.
                    $sheet->getCell($cl.$rowNum)->setValue('a');
                    $alfaCount++;
                }
            }

            // Rekap kolom: Hadir, Sakit, Izin, Alfa
            $sheet->getCell($colLetter($rekapStart + 1).$rowNum)->setValue($hadirCount);
            $sheet->getCell($colLetter($rekapStart + 2).$rowNum)->setValue($sakitCount);
            $sheet->getCell($colLetter($rekapStart + 3).$rowNum)->setValue($izinCount);
            $sheet->getCell($colLetter($rekapStart + 4).$rowNum)->setValue($alfaCount);
        }

        // --- Rekap kolom header (row 5) ---
        $sheet->getCell($colLetter($rekapStart + 1).'5')->setValue('Hadir');
        $sheet->getCell($colLetter($rekapStart + 2).'5')->setValue('Sakit');
        $sheet->getCell($colLetter($rekapStart + 3).'5')->setValue('Izin');
        $sheet->getCell($colLetter($rekapStart + 4).'5')->setValue('Alfa');

        // Gaya header kolom tanggal
        $sheet->getStyle($colLetter($colStart).'5:'.$colLetter($colStart + count($dates) - 1).'5')
            ->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE5B4']],
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

        // Gaya header tabel (A5:D5)
        $sheet->getStyle('A5:D5')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE5B4']],
            'font' => ['bold' => true],
        ]);

        // Warna sel rekap header (Hadir=Biru, Sakit=Merah, Izin=Kuning, Alfa=Abu)
        $sheet->getStyle($colLetter($rekapStart + 1).'5')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'font' => ['color' => ['rgb' => 'FFFFFF'], 'bold' => true],
        ]);
        $sheet->getStyle($colLetter($rekapStart + 2).'5')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ED7D31']],
            'font' => ['color' => ['rgb' => 'FFFFFF'], 'bold' => true],
        ]);
        $sheet->getStyle($colLetter($rekapStart + 3).'5')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '70AD47']],
            'font' => ['color' => ['rgb' => 'FFFFFF'], 'bold' => true],
        ]);
        $sheet->getStyle($colLetter($rekapStart + 4).'5')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFEB3B']],
            'font' => ['color' => ['rgb' => '000000'], 'bold' => true],
        ]);

        // Auto size kolom
        $sheet->getColumnDimension('A')->setWidth(5);
        $sheet->getColumnDimension('B')->setWidth(15);
        $sheet->getColumnDimension('C')->setWidth(35);
        $sheet->getColumnDimension('D')->setWidth(5);
        for ($i = 0; $i < count($dates); $i++) {
            $sheet->getColumnDimensionByColumn($colStart + $i)->setWidth(4);
        }

        // --- Output download ---
        $writer = new Xlsx($spreadsheet);
        $fileName = 'absensi_'.$kelas.'_'.$dari->format('Ymd').'_'.$sampai->format('Ymd').'.xlsx';

        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'Content-Length' => strlen($content),
        ]);
    }
}
