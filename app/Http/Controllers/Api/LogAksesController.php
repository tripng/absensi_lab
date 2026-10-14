<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLogAksesBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LogAksesController extends Controller
{
    /**
     * Health check endpoint.
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'service' => 'absensi_lab-log-akses-api',
        ]);
    }

    /**
     * Store batch of log_akses records.
     *
     * Request body:
     * {
     *   "data": [
     *     {
     *       "rfid_id": 1,
     *       "lokasi_id": 1,
     *       "jenis": "masuk",
     *       "waktu_scan": "1700000000",
     *       "status": "berhasil",
     *       "keterangan": null
     *     },
     *     ...
     *   ]
     * }
     *
     * Deduplication strategy (two layers):
     * 1. Pre-check: query semua kombinasi (rfid_id, lokasi_id, waktu_scan) yang sudah ada
     *    di DB untuk seluruh batch, lalu filter dilakukan di PHP.
     *    Record yang sudah ada dikategorikan sebagai "duplicate" dan tidak dimasukkan.
     * 2. Database-level: unique key `unik_scan` (rfid_id, lokasi_id, waktu_scan)
     *    sebagai safety net — insertOrIgnore() akan melewatkan record yang sudah ada.
     *
     * Response melaporkan:
     *   - inserted: jumlah record benar-benar baru yang dimasukkan
     *   - duplicates: jumlah record yang sudah ada (dilewati)
     *   - total_received: jumlah record yang dikirim
     */
    public function storeBatch(StoreLogAksesBatch $request): JsonResponse
    {
        $data = $request->validated()['data'];
        $total = count($data);

        if ($total === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Empty batch — no records to insert.',
                'inserted' => 0,
                'duplicates' => 0,
            ], 422);
        }

        // Pre-check duplicates: fetch existing combos (rfid_id, lokasi_id, waktu_scan)
        // yang ada di database untuk seluruh batch sekaligus.
        // Kita query dengan wherIn di masing-masing column, lalu cek kombinasi di PHP.
        $rfidIds = array_column($data, 'rfid_id');
        $lokasiIds = array_column($data, 'lokasi_id');
        $waktuScans = array_column($data, 'waktu_scan');

        // Fetch existing combos untuk scope yang relevan
        $existingCombos = DB::table('log_akses')
            ->select('rfid_id', 'lokasi_id', 'waktu_scan')
            ->whereIn('rfid_id', $rfidIds)
            ->whereIn('lokasi_id', $lokasiIds)
            ->whereIn('waktu_scan', $waktuScans)
            ->get()
            ->map(fn ($row) => "{$row->rfid_id}|{$row->lokasi_id}|{$row->waktu_scan}")
            ->toArray();

        $existingSet = array_flip($existingCombos); // nilai = key, untuk O(1) lookup

        // Separate records into new vs duplicate
        $newRecords = [];
        $duplicateCount = 0;

        foreach ($data as $item) {
            $key = "{$item['rfid_id']}|{$item['lokasi_id']}|{$item['waktu_scan']}";

            if (isset($existingSet[$key])) {
                $duplicateCount++;
            } else {
                $newRecords[] = [
                    'rfid_id' => $item['rfid_id'],
                    'lokasi_id' => $item['lokasi_id'],
                    'jenis' => $item['jenis'],
                    'waktu_scan' => $item['waktu_scan'],
                    'status' => $item['status'],
                    'keterangan' => $item['keterangan'] ?? null,
                    'status_sync' => 0,
                ];
            }
        }

        // Bulk insert — insertOrIgnore as safety net (covers race conditions)
        $inserted = 0;
        if (!empty($newRecords)) {
            $inserted = DB::table('log_akses')->insertOrIgnore($newRecords);
        }

        Log::info('LogAkses batch insert', [
            'total_received' => $total,
            'inserted' => $inserted,
            'duplicates' => $duplicateCount,
            'source_ip' => request()->ip(),
        ]);

        if ($inserted === $total) {
            $message = 'All records inserted successfully.';
        } elseif ($inserted > 0) {
            $skipped = $total - $inserted;
            $message = "$inserted of $total records inserted; $skipped duplicates skipped.";
        } else {
            $message = 'All records were duplicates; nothing inserted.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'inserted' => $inserted,
            'duplicates' => $duplicateCount,
            'total_received' => $total,
        ]);
    }
}
