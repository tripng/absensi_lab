<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

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
        $endDate   = $request->query('end_date');
        $kelas     = $request->query('kelas');

        // Validasi format tanggal sederhana (YYYY-MM-DD).
        $startTs = null;
        $endTs   = null;
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
        $page    = max(1, (int) $request->query('page', 1));
        $offset  = ($page - 1) * $perPage;

        $total = $query->count();

        $rows = $query->limit($perPage)->offset($offset)->get()->map(function ($row) {
            $ts = $row->waktu_scan ? (int) $row->waktu_scan : null;
            $moment = $ts ? Carbon::createFromTimestamp($ts, 'Asia/Jakarta') : null;

            $idLabel = $row->tipe === 'siswa' ? ($row->nisn ?? '') : ($row->nip ?? '');

            return [
                'id'          => (int) $row->id,
                'waktu_scan'  => $moment ? $moment->format('Y-m-d H:i:s') : '-',
                'tanggal'     => $moment ? $moment->format('Y-m-d') : '-',
                'jam'         => $moment ? $moment->format('H:i') : '-',
                'nama'        => $row->nama ?? '-',
                'tipe'        => $row->tipe ?? '-',
                'id_pengguna' => $idLabel ?: '-',
                'kelas'       => ($row->nama_kelas ?? ($row->tingkat ?? '-')),
                'jenis'       => $row->jenis ?? '-',
                'status'      => $row->status ?? '-',
            ];
        })->values();

        $data = [
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => (int) $total,
                'last_page'    => (int) ceil($total / $perPage),
                'from'         => $total > 0 ? min($total, ($page - 1) * $perPage + 1) : 0,
                'to'           => min($total, $page * $perPage),
            ],
            'filters' => [
                'start_date' => $startDate ?? '',
                'end_date'   => $endDate ?? '',
                'kelas'      => $kelas ?? '',
            ],
            'kelasList' => $kelasList,
        ];

        return Inertia::render('Data/Index', [
            'absensi' => $data,
        ]);
    }
}
