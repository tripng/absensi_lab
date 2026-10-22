<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Skema manajemen mata pelajaran + jadwal.
     *
     * Catatan: tabel log_akses tidak disentuh — sudah dipakai oleh API eksternal.
     * FK ke tabel master (guru / kelas / labkom) memakai tipe `integer` (signed)
     * karena kolom PK-nya adalah int(11) SIGNED (bukan bigint unsigned).
     */
    public function up(): void
    {
        // ------------------------------------------------------------------
        // 1. mapel: master mata pelajaran
        // ------------------------------------------------------------------
        Schema::create('mapel', function (Blueprint $t) {
            $t->id();
            // Kode unik mapel, contoh: IPA, MTK, PKN, FIS, KIM
            $t->string('kode_mapel', 20)->unique();
            $t->text('nama_mapel');
            // Kelompok mapel untuk filtering / report
            $t->enum('kelompok', ['wajib', 'pilihan', 'praktik'])->default('wajib');
            // Guru pemilik mapel (opsional — boleh null jika belum terpakir)
            $t->integer('guru_id')->nullable();
            $t->foreign('guru_id')
                ->references('id')->on('guru')
                ->nullOnDelete();
            $t->timestamps();
        });

        // ------------------------------------------------------------------
        // 2. ruang_ajaran: ruangan/lab yang dapat dijadwalkan / dipinjam
        // ------------------------------------------------------------------
        Schema::create('ruang_ajaran', function (Blueprint $t) {
            $t->id();
            // Opsional — kait ke labkom bila ini komputer laboran
            $t->integer('labkom_id')->nullable();
            $t->foreign('labkom_id')
                ->references('id')->on('labkom')
                ->nullOnDelete();
            $t->unique('labkom_id');
            // Untuk ruangan manual yang belum termapsulkan ke labkom
            $t->text('nama_ruangan')->nullable();
            $t->unsignedSmallInteger('kapasitas')->nullable();
            $t->timestamps();
        });

        // ------------------------------------------------------------------
        // 3. jadwal_ajaran: pola jadual berulang (Sen — Min)
        // ------------------------------------------------------------------
        Schema::create('jadwal_ajaran', function (Blueprint $t) {
            $t->id();
            $t->enum('hari', [
                'senin', 'selasa', 'rabu', 'kamis',
                'jumat', 'sabtu', 'minggu',
            ]);
            // Jam ke berapa (asumsi sistem 1–12)
            $t->tinyInteger('jam_ke')->unsigned();
            $t->unsignedBigInteger('mapel_id');
            $t->foreign('mapel_id')
                ->references('id')->on('mapel')
                ->cascadeOnDelete();
            $t->unsignedBigInteger('ruang_ajaran_id')->nullable();
            $t->foreign('ruang_ajaran_id')
                ->references('id')->on('ruang_ajaran')
                ->nullOnDelete();
            $t->integer('kelas_id');
            $t->foreign('kelas_id')
                ->references('id')->on('kelas')
                ->cascadeOnDelete();
            // Guru override (jika berbeda guru pemilik mapel). Null = pakai guru di mapel.
            $t->integer('guru_id')->nullable();
            $t->foreign('guru_id')
                ->references('id')->on('guru')
                ->nullOnDelete();
            $t->timestamps();

            // Cegah satu kelas dapat dua mapel di slot (hari, jam) yang sama
            $t->unique(
                ['hari', 'jam_ke', 'kelas_id', 'mapel_id'],
                'jadwal_ajaran_kelas_unik'
            );
            // Cegah satu ruang dipakai dua kelas di slot yang sama
            $t->unique(
                ['hari', 'jam_ke', 'ruang_ajaran_id'],
                'jadwal_ajaran_ruang_unik'
            );
        });

        // ------------------------------------------------------------------
        // 4. jadwal_pinjaman: peminjaman satuan (praktikum / event khusus)
        // ------------------------------------------------------------------
        Schema::create('jadwal_pinjaman', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('mapel_id');
            $t->foreign('mapel_id')
                ->references('id')->on('mapel')
                ->cascadeOnDelete();
            // Peminjam = user yang login via Laravel auth (users.id = bigint unsigned)
            $t->foreignId('peminjam_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $t->unsignedBigInteger('ruang_ajaran_id');
            $t->foreign('ruang_ajaran_id')
                ->references('id')->on('ruang_ajaran')
                ->cascadeOnDelete();
            $t->date('tanggal');
            $t->time('jam_mulai');
            $t->time('jam_selesai');
            $t->text('keterangan')->nullable();
            $t->timestamps();

            // Index untuk deteksi bentrokan ruang pada tanggal yang sama
            $t->index(
                ['ruang_ajaran_id', 'tanggal', 'jam_mulai', 'jam_selesai'],
                'jadwal_pinjaman_ruang_bentrokon'
            );
            // Index untuk filter per peminjam
            $t->index(['peminjam_user_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal_pinjaman');
        Schema::dropIfExists('jadwal_ajaran');
        Schema::dropIfExists('ruang_ajaran');
        Schema::dropIfExists('mapel');
    }
};
