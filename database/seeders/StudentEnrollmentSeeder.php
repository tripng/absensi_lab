<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StudentEnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $years = [
            ['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true],
            ['name' => '2027/2028', 'start_date' => '2027-07-01', 'end_date' => '2028-06-30', 'is_active' => false],
        ];

        foreach ($years as $year) {
            DB::table('academic_years')->updateOrInsert(
                ['name' => $year['name']],
                [...$year, 'updated_at' => now(), 'created_at' => now()],
            );
        }

        $year2026 = DB::table('academic_years')->where('name', '2026/2027')->value('id');
        $year2027 = DB::table('academic_years')->where('name', '2027/2028')->value('id');

        $kelasX1 = $this->ensureClass('X.1', 'X', '2026/2027');
        $kelasXI1 = $this->ensureClass('XI.1', 'XI', '2027/2028');

        $ahmadId = $this->ensureStudent('0061234567', 'Ahmad Fauzi', 2026);
        $sitiId = $this->ensureStudent('0067654321', 'Siti Nurhaliza', 2026);

        $this->ensureEnrollment($ahmadId, $kelasX1, $year2026, 'promoted');
        $this->ensureEnrollment($ahmadId, $kelasXI1, $year2027, 'active');
        $this->ensureEnrollment($sitiId, $kelasX1, $year2026, 'active');

        DB::table('siswa')->where('id', $ahmadId)->update(['kelas_id' => $kelasXI1]);
        DB::table('siswa')->where('id', $sitiId)->update(['kelas_id' => $kelasX1]);
    }

    protected function ensureClass(string $namaKelas, string $tingkat, string $tahunAjaran): int
    {
        $existing = DB::table('kelas')
            ->where('nama_kelas', $namaKelas)
            ->where('tahun_ajaran', $tahunAjaran)
            ->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return (int) DB::table('kelas')->insertGetId([
            'nama_kelas' => $namaKelas,
            'tingkat' => $tingkat,
            'tahun_ajaran' => $tahunAjaran,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function ensureStudent(string $nisn, string $nama, int $tahunMasuk): int
    {
        $existing = DB::table('siswa')->where('nisn', $nisn)->first();

        if ($existing) {
            DB::table('pengguna')->where('id', $existing->id)->update([
                'tipe' => 'siswa',
                'nama' => $nama,
                'status_aktif' => 'aktif',
                'updated_at' => now(),
            ]);

            return (int) $existing->id;
        }

        $penggunaId = (int) DB::table('pengguna')->insertGetId([
            'tipe' => 'siswa',
            'nama' => $nama,
            'status_aktif' => 'aktif',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('siswa')->insert([
            'id' => $penggunaId,
            'nisn' => $nisn,
            'tahun_masuk' => $tahunMasuk,
            'kelas_id' => null,
        ]);

        return $penggunaId;
    }

    protected function ensureEnrollment(int $studentId, int $classId, int $academicYearId, string $status): void
    {
        DB::table('student_enrollments')->updateOrInsert(
            ['student_id' => $studentId, 'academic_year_id' => $academicYearId],
            [
                'class_id' => $classId,
                'status' => $status,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}
