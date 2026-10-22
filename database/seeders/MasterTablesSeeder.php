<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seed data master agar `migrate:fresh --seed` menghasilkan state siap pakai
 * (kelas X.1..X.15, labkom, lokasi, guru, ruang_ajaran, mapel, user admin).
 *
 * Dipakai untuk keperluan issue #3 acceptance: "data existing (kelas X.1..X.15,
 * labkom, lokasi) tetap ada" setelah migrate:fresh --seed.
 */
class MasterTablesSeeder extends Seeder
{
    public function run(): void
    {
        // --- lokasi ---
        DB::table('lokasi')->insert([
            ['nama_lokasi' => 'Gerbang Utama', 'jenis' => 'gerbang'],
            ['nama_lokasi' => 'Labkom 1', 'jenis' => 'lab'],
            ['nama_lokasi' => 'Ruang Kelas', 'jenis' => 'kelas'],
        ]);
        $labkomLokasiId = DB::table('lokasi')->where('jenis', 'lab')->value('id');

        // --- kelas X.1 .. X.15 ---
        $kelas = [];
        foreach (range(1, 15) as $i) {
            $kelas[] = [
                'nama_kelas' => "X.{$i}",
                'tingkat' => 'X',
                'tahun_ajaran' => '2026/2027',
            ];
        }
        DB::table('kelas')->insert($kelas);

        // --- pengguna guru + link guru (1:1 via shared PK) ---
        $gurus = [
            ['nip' => '198001012005011001', 'nama' => 'Rina Sari, S.Kom.', 'jabatan' => 'Kepala Lab'],
            ['nip' => '198202022006022002', 'nama' => 'Budi Santoso, S.Pd.', 'jabatan' => 'Guru Matematika'],
            ['nip' => '198503032007033003', 'nama' => 'Dewi Lestari, S.Kom.', 'jabatan' => 'Guru Informatika'],
            ['nip' => '199004042008044004', 'nama' => 'Andi Wijaya, S.Pd.', 'jabatan' => 'Guru Fisika'],
            ['nip' => '198805052009055005', 'nama' => 'Sari Kurnia, S.Pd.', 'jabatan' => 'Guru Kimia'],
        ];
        foreach ($gurus as $g) {
            $penggunaId = DB::table('pengguna')->insertGetId([
                'tipe' => 'guru',
                'nama' => $g['nama'],
                'status_aktif' => 'aktif',
            ]);
            DB::table('guru')->insert([
                'id' => $penggunaId,
                'nip' => $g['nip'],
                'jabatan' => $g['jabatan'],
            ]);
        }

        DB::table('rfid_card')->insert([
            'uid' => 'DEV-RFID-0001',
            'pengguna_id' => DB::table('guru')->value('id'),
            'status' => 'aktif',
        ]);

        // --- labkom + ruang_ajaran ---
        DB::table('labkom')->insert([
            'lokasi_id' => $labkomLokasiId,
            'total_komputer' => 32,
            'jumlah_baris' => 8,
            'jumlah_kolom' => 4,
        ]);
        $labkomId = DB::table('labkom')->where('lokasi_id', $labkomLokasiId)->value('id');

        DB::table('ruang_ajaran')->insert([
            'labkom_id' => $labkomId,
            'nama_ruangan' => 'Labkom 1',
            'kapasitas' => 32,
        ]);

        // --- mapel (guru_id FK ke guru.id / pengguna.id) ---
        $guruIds = DB::table('guru')->pluck('id', 'nip')->all();
        $mapels = [
            ['kode' => 'PDP',  'nama' => 'Pemrograman Dasar', 'kelompok' => 'praktik',  'nip' => '198001012005011001'],
            ['kode' => 'MTK',  'nama' => 'Matematika Diskreto', 'kelompok' => 'wajib',   'nip' => '198202022006022002'],
            ['kode' => 'JKT',  'nama' => 'Jaringan Komputer', 'kelompok' => 'praktik',  'nip' => '198503032007033003'],
            ['kode' => 'FIS',  'nama' => 'Fisika', 'kelompok' => 'wajib',   'nip' => '199004042008044004'],
            ['kode' => 'KIM',  'nama' => 'Kimia', 'kelompok' => 'wajib',   'nip' => '198805052009055005'],
        ];
        $ins = [];
        foreach ($mapels as $m) {
            $ins[] = [
                'kode_mapel' => $m['kode'],
                'nama_mapel' => $m['nama'],
                'kelompok' => $m['kelompok'],
                'guru_id' => $guruIds[$m['nip']] ?? null,
            ];
        }
        DB::table('mapel')->insert($ins);

        // --- admin user (biar /management-class dapat auth login) ---
        DB::table('users')->insert([
            'name' => 'Admin Absensi',
            'email' => 'admin@absensi.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
    }
}
