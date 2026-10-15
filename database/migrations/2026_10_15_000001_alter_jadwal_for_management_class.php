<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * DB changes untuk /management-class — issue #3.
 *
 * Jalankan SETELAH migrasi create_mata_pelajaran_jadwal (2026_10_10).
 * Menggunakan Schema::table (bukan create). down() mengembalikan kolom semula.
 *
 * Keputusan desain (lihat issue #3):
 *   D1 — recurring: guru_id dipakai sebagai PJ (selector guru). one-time:
 *        peminjam_user_id = user login (sudah ada di schema).
 *   D2 — jam_mulai/jam_selesai TIME baru; jam_ke dihapus (tidak dipakai kode).
 *        Constraint jam_mulai < jam_selesai.
 *   D3 — mapel_id recurring dibiarkan nullable (UI tidak pilih mapel; guru_id pj).
 *   D4 — ruang_ajaran_id jadwal_ajaran dibiarkan nullable (form wajib pilih).
 *        jadwal_pinjaman perlu kelas_id FK baru.
 *   D5 — middleware auth ditambah di route (bukan di migration).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ----------------------------------------------------------------
        // jadwal_ajaran (recurring): hapus jam_ke + unique jam_ke, tambah TIME
        // ----------------------------------------------------------------
        Schema::table('jadwal_ajaran', function (Blueprint $t) {
            // Hapus unique constraint lama yang melekat pada jam_ke
            $t->dropUnique('jadwal_ajaran_kelas_unik');
            $t->dropUnique('jadwal_ajaran_ruang_unik');

            // jam_ke — tidak dipakai kode manapun → drop
            $t->dropColumn('jam_ke');

            // mapel_id → nullable (D3: UI tidak pilih mapel, guru_id tetap pj)
            $t->dropForeign(['mapel_id']);
            $t->dropColumn('mapel_id');
            $t->unsignedBigInteger('mapel_id')->nullable();
            $t->foreign('mapel_id')
                ->references('id')->on('mapel')
                ->cascadeOnDelete();

            // Waktu nyata (TIME) menggantikan jam_ke
            $t->time('jam_mulai')->nullable();
            $t->time('jam_selesai')->nullable();

            // Kolom baru agar UI field terisi mappet ke DB (issue #3 tabel 4)
            $t->smallInteger('jumlah_siswa')->unsigned()->nullable();
            $t->string('no_telepon', 20)->nullable();
            $t->text('keterangan')->nullable();   // 'alasan' pakai ini
        });

        // Constraint rentan waktu valid (jam_mulai < jam_selesai)
        DB::statement(
            "ALTER TABLE jadwal_ajaran ADD CONSTRAINT jadwal_ajaran_jam_valid "
            . "CHECK (jam_mulai < jam_selesai)"
        );

        // ----------------------------------------------------------------
        // jadwal_pinjaman (one-time): tambah kelas_id + field baru
        // ----------------------------------------------------------------
        Schema::table('jadwal_pinjaman', function (Blueprint $t) {
            // kelas_id belum ada di pinjaman (issue #3 tabel 4 — gap penting)
            $t->integer('kelas_id')->nullable();
            $t->foreign('kelas_id')
                ->references('id')->on('kelas')
                ->cascadeOnDelete();

            $t->smallInteger('jumlah_siswa')->unsigned()->nullable();
            $t->string('no_telepon', 20)->nullable();
            // keterangan sudah ada — dipakai untuk 'alasan' (cukup).
        });
    }

    public function down(): void
    {
        Schema::table('jadwal_pinjaman', function (Blueprint $t) {
            $t->dropForeign(['kelas_id']);
            $t->dropColumn(['kelas_id', 'jumlah_siswa', 'no_telepon']);
        });

        Schema::table('jadwal_ajaran', function (Blueprint $t) {
            DB::statement(
                'ALTER TABLE jadwal_ajaran DROP CONSTRAINT IF EXISTS jadwal_ajaran_jam_valid'
            );
            $t->dropColumn(['keterangan', 'no_telepon', 'jumlah_siswa']);
            $t->dropColumn(['jam_mulai', 'jam_selesai']);

            // Restore mapel_id NOT NULL (semula)
            $t->dropForeign(['mapel_id']);
            $t->dropColumn('mapel_id');
            $t->unsignedBigInteger('mapel_id');
            $t->foreign('mapel_id')
                ->references('id')->on('mapel')
                ->cascadeOnDelete();

            // Restore jam_ke + unique constraints
            $t->tinyInteger('jam_ke')->unsigned();
            $t->unique(['hari', 'jam_ke', 'kelas_id', 'mapel_id'], 'jadwal_ajaran_kelas_unik');
            $t->unique(['hari', 'jam_ke', 'ruang_ajaran_id'], 'jadwal_ajaran_ruang_uniq');
        });
    }
};
