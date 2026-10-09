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
     * Join ke rfid_card, pengguna, v_scan_lookup, dan lokasi
     * agar kolom nama, nisn/nip, tipe, dan nama_lokasi lengkap.
     */
    public function index(Request $request)
    {
        $db = DB::connection('mysql');

        $query = $db->table('log_akses as la')
            ->selectRaw('
                la.id,
                la.jenis,
                la.waktu_scan,
                la.status,
                la.keterangan,
                p.tipe,
                p.nama as nama,
                v.nisn,
                v.nip,
                v.nama_kelas,
                v.tingkat,
                l.nama_lokasi
            ')
            ->join('rfid_card as r', 'r.id', '=', 'la.rfid_id')
            ->join('pengguna as p', 'p.id', '=', 'r.pengguna_id')
            ->leftJoin('v_scan_lookup as v', 'v.uid', '=', 'r.uid')
            ->join('lokasi as l', 'l.id', '=', 'la.lokasi_id')
            ->where('la.waktu_scan', 'REGEXP', '^[0-9]+$')
            ->orderByRaw('CAST(la.waktu_scan AS UNSIGNED) DESC');

        // Pagination manual (Inertia-friendly)
        $perPage = 25;
        $page = max(1, (int) $request->query('page', 1));
        $offset = ($page - 1) * $perPage;

        $total = $query->count();

        $rows = $query->limit($perPage)->offset($offset)->get()->map(function ($row) {
            $ts = $row->waktu_scan ? (int) $row->waktu_scan : null;
            $moment = $ts ? Carbon::createFromTimestamp($ts, 'Asia/Jakarta') : null;

            $idLabel = $row->tipe === 'siswa' ? $row->nisn : $row->nip;

            return [
                'id'          => (int) $row->id,
                'waktu_scan'  => $moment ? $moment->format('Y-m-d H:i:s') : '-',
                'tanggal'     => $moment ? $moment->format('Y-m-d') : '-',
                'jam'         => $moment ? $moment->format('H:i') : '-',
                'nama'        => $row->nama ?? '-',
                'tipe'        => $row->tipe ?? '-',
                'id_pengguna' => $idLabel ?: '-',
                'kelas'       => $row->nama_kelas ?? ($row->tingkat ?? '-'),
                'jenis'       => $row->jenis ?? '-',
                'status'      => $row->status ?? '-',
                'lokasi'      => $row->nama_lokasi ?? '-',
                'keterangan'  => $row->keterangan ?? '-',
            ];
        })->values();

        $data = [
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => (int) $total,
                'last_page'    => (int) ceil($total / $perPage),
            ],
        ];

        return Inertia::render('Data/Index', [
            'absensi' => $data,
        ]);
    }
}
