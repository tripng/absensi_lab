<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Issue #3 — gap: jadwal_pinjaman.mapel_id & jumlah_siswa didefinisikan NOT NULL
 * di migrasi master (fdabfa3), padahal controller kirim nullable
 * (D1/D3: mapel_id optional; peminjaman lab tidak selalu ada mapel;
 *  jumlah_siswa tidak diisi = kosong). Alter agar konsisten & FK-safe.
 * doctrine/dbal tidak terpasang di project ini, jadi pakai DB::statement.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE jadwal_pinjaman MODIFY COLUMN mapel_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE jadwal_pinjaman MODIFY COLUMN jumlah_siswa SMALLINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE jadwal_pinjaman MODIFY COLUMN mapel_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE jadwal_pinjaman MODIFY COLUMN jumlah_siswa SMALLINT UNSIGNED NOT NULL');
    }
};
