<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Master tables untuk absensi_lab.
 *
 * Reproduksi dari database/master_schema_restore.sql sebagai Laravel migration
 * agar `migrate:fresh` / `migrate:fresh --seed` idempotent dan acceptance issue #3
 * ("data existing tetap ada") terpenuhi. Di-deploy asli ini dijalankan manual via
 * restore SQL; migration ini membuatnya versi kontrol.
 *
 * PK guru / kelas / labkom / pengguna / siswa / lokasi = int(11) SIGNED agar
 * FK signed-int dari jadwal_ajaran / jadwal_pinjaman cocok (lihat migrasi jadwal).
 * log_akses tidak disentuh strukturnya — disamakan persis definisi lama.
 */
return new class extends Migration
{
    public function up(): void
    {
        // migrate:fresh hanya drop TABLE, bukan VIEW → drop view dulu biar idempotent
        DB::statement('DROP VIEW IF EXISTS v_scan_lookup');

        // 1. lokasi — master lokasi (gerbang/lab/kelas/lainnya)
        Schema::create('lokasi', function (Blueprint $t) {
            $t->integer('id', true);                       // int(11) SIGNED AI
            $t->text('nama_lokasi');
            $t->enum('jenis', ['gerbang', 'lab', 'kelas', 'lainnya'])
                ->default('lainnya');
            $t->timestamp('created_at')->nullable()
                ->useCurrent();
            $t->primary('id');
        });

        // 2. labkom — laboratorium komputer, opsional ke lokasi
        Schema::create('labkom', function (Blueprint $t) {
            $t->integer('id', true);
            $t->integer('lokasi_id')->nullable();
            $t->integer('total_komputer');
            $t->integer('jumlah_baris');
            $t->integer('jumlah_kolom')->nullable();
            $t->timestamp('created_at')->nullable()->useCurrent();

            $t->primary('id');
            $t->foreign('lokasi_id')
                ->references('id')->on('lokasi')
                ->nullOnDelete();
        });

        // 3. pengguna — master orang (siswa/guru)
        Schema::create('pengguna', function (Blueprint $t) {
            $t->integer('id', true);
            $t->enum('tipe', ['siswa', 'guru']);
            $t->text('nama');
            $t->text('foto_path')->nullable();
            $t->enum('status_aktif', ['aktif', 'nonaktif'])
                ->default('aktif');
            $t->timestamp('created_at')->nullable()->useCurrent();
            $t->timestamp('updated_at')->nullable()->useCurrent();

            $t->primary('id');
            $t->index('tipe');
        });

        // 4. kelas — X.1 .. X.15
        Schema::create('kelas', function (Blueprint $t) {
            $t->integer('id', true);
            $t->text('nama_kelas');
            $t->text('tingkat')->nullable();
            $t->text('tahun_ajaran')->nullable();
            $t->timestamp('created_at')->nullable()->useCurrent();
            $t->timestamp('updated_at')->nullable()->useCurrent();

            $t->primary('id');
        });

        // 5. guru — 1:1 ke pengguna.id (shared PK)
        Schema::create('guru', function (Blueprint $t) {
            $t->integer('id');                             // shared PK → pengguna.id
            $t->text('nip');
            $t->text('jabatan')->nullable();
            $t->primary('id');
            $t->unique('nip');
            $t->foreign('id')
                ->references('id')->on('pengguna')
                ->cascadeOnDelete();
        });

        // 6. siswa — 1:1 ke pengguna.id, many-to-one kelas
        Schema::create('siswa', function (Blueprint $t) {
            $t->integer('id');                             // shared PK → pengguna.id
            $t->text('nisn');
            $t->integer('tahun_masuk');
            $t->integer('kelas_id')->nullable();
            $t->primary('id');
            $t->unique('nisn');
            $t->index('kelas_id');
            $t->foreign('id')
                ->references('id')->on('pengguna')
                ->cascadeOnDelete();
            $t->foreign('kelas_id')
                ->references('id')->on('kelas')
                ->nullOnDelete();
        });

        // 7. rfid_card → pengguna
        Schema::create('rfid_card', function (Blueprint $t) {
            $t->integer('id', true);
            $t->text('uid');
            $t->integer('pengguna_id');
            $t->enum('status', ['aktif', 'hilang', 'nonaktif'])->default('aktif');
            $t->text('tanggal_terdaftar')->nullable();
            $t->timestamp('created_at')->nullable()->useCurrent();

            $t->primary('id');
            $t->unique('uid');
            $t->index('pengguna_id');
            $t->index('status');
            $t->foreign('pengguna_id')
                ->references('id')->on('pengguna')
                ->cascadeOnDelete();
        });

        // 8. log_akses — identik definisi lama (tidak ada kolom baru)
        Schema::create('log_akses', function (Blueprint $t) {
            $t->integer('id', true);
            $t->integer('rfid_id');
            $t->integer('lokasi_id');
            $t->text('jenis');                             // masuk/keluar
            $t->string('waktu_scan', 16);                  // unix-epoch numeric string
            $t->text('status');
            $t->text('keterangan')->nullable();
            $t->boolean('status_sync')->default(false);

            $t->primary('id');
            $t->index('rfid_id');
            $t->index('lokasi_id');
            $t->unique(['rfid_id', 'lokasi_id', 'waktu_scan'], 'scan_unik');
            $t->foreign('rfid_id')
                ->references('id')->on('rfid_card')
                ->cascadeOnDelete();
            $t->foreign('lokasi_id')
                ->references('id')->on('lokasi')
                ->cascadeOnDelete();
        });

        // 9. v_scan_lookup — view lookup (read-only, dipakai eksternal)
        DB::statement("CREATE VIEW v_scan_lookup AS
            SELECT
                p.id AS pengguna_id,
                p.tipe,
                p.nama,
                p.foto_path,
                p.status_aktif,
                s.kelas_id,
                k.nama_kelas,
                k.tingkat,
                s.id AS siswa_id,
                s.nisn,
                g.id AS guru_id,
                g.nip,
                g.jabatan,
                r.uid
            FROM pengguna p
            LEFT JOIN rfid_card r ON r.pengguna_id = p.id
            LEFT JOIN siswa s ON s.id = p.id
            LEFT JOIN kelas k ON k.id = s.kelas_id
            LEFT JOIN guru g ON g.id = p.id");
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS v_scan_lookup');
        Schema::dropIfExists('log_akses');
        Schema::dropIfExists('rfid_card');
        Schema::dropIfExists('siswa');
        Schema::dropIfExists('guru');
        Schema::dropIfExists('kelas');
        Schema::dropIfExists('pengguna');
        Schema::dropIfExists('labkom');
        Schema::dropIfExists('lokasi');
    }
};
