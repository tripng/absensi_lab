<?php

use App\Models\User;
use Database\Seeders\MasterTablesSeeder;
use Database\Seeders\StudentEnrollmentSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->artisan('db:seed', ['--class' => MasterTablesSeeder::class]);
    $this->artisan('db:seed', ['--class' => StudentEnrollmentSeeder::class]);
});

function makeEnrollmentAdmin()
{
    return User::factory()->create([
        'email' => 'admin+enrollment@absensi.test',
        'password' => Hash::make('password'),
    ]);
}

function enrollmentStudentId(string $nisn): int
{
    return (int) DB::table('siswa')->where('nisn', $nisn)->value('id');
}

function enrollmentClassId(string $namaKelas, string $tahunAjaran): int
{
    return (int) DB::table('kelas')
        ->where('nama_kelas', $namaKelas)
        ->where('tahun_ajaran', $tahunAjaran)
        ->value('id');
}

function enrollmentYearId(string $name): int
{
    return (int) DB::table('academic_years')->where('name', $name)->value('id');
}

it('requires authentication to view student enrollments', function () {
    $this->get('/student-enrollments')->assertRedirect('/login');
});

it('index emits enrollment props from DB and success flash', function () {
    $admin = makeEnrollmentAdmin();

    $this->actingAs($admin)
        ->withSession(['success' => 'Enrollment berhasil ditambahkan.'])
        ->get('/student-enrollments')
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->where('success', 'Enrollment berhasil ditambahkan.')
                ->has('enrollments', 3)
                ->has('academicYears', 2)
                ->has('students', 2)
                ->has('classes', 16)
                ->has('enrollments.0.student_nama')
                ->has('enrollments.0.class_nama')
                ->has('enrollments.0.academic_year_name')
                ->has('enrollments.0.status');

            return $page;
        });
});

it('stores a valid enrollment and syncs siswa kelas_id', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0067654321');
    $classId = enrollmentClassId('XI.1', '2027/2028');
    $yearId = enrollmentYearId('2027/2028');

    $this->actingAs($admin)
        ->post('/student-enrollments', [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'active',
        ])
        ->assertRedirect('/student-enrollments')
        ->assertSessionHas('success');

    $this->assertDatabaseHas('student_enrollments', [
        'student_id' => $studentId,
        'class_id' => $classId,
        'academic_year_id' => $yearId,
        'status' => 'active',
    ]);
    $this->assertDatabaseHas('siswa', ['id' => $studentId, 'kelas_id' => $classId]);
});

it('rejects an invalid enrollment status', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0067654321');
    $classId = enrollmentClassId('XI.1', '2027/2028');
    $yearId = enrollmentYearId('2027/2028');

    $this->actingAs($admin)
        ->post('/student-enrollments', [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'invalid-status',
        ])
        ->assertSessionHasErrors('status');

    $this->assertDatabaseMissing('student_enrollments', [
        'student_id' => $studentId,
        'academic_year_id' => $yearId,
    ]);
});

it('rejects a duplicate student and academic year enrollment', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0061234567');
    $classId = enrollmentClassId('X.1', '2026/2027');
    $yearId = enrollmentYearId('2026/2027');

    $this->actingAs($admin)
        ->post('/student-enrollments', [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'active',
        ])
        ->assertSessionHasErrors('student_id');

    expect(DB::table('student_enrollments')->count())->toBe(3);
});

it('rejects invalid foreign keys', function () {
    $admin = makeEnrollmentAdmin();

    $this->actingAs($admin)
        ->post('/student-enrollments', [
            'student_id' => 999999,
            'class_id' => 999999,
            'academic_year_id' => 999999,
            'status' => 'active',
        ])
        ->assertSessionHasErrors(['student_id', 'class_id', 'academic_year_id']);

    expect(DB::table('student_enrollments')->count())->toBe(3);
});

it('updates enrollment status and syncs siswa kelas_id', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0067654321');
    $classId = enrollmentClassId('X.1', '2026/2027');
    $yearId = enrollmentYearId('2026/2027');
    $enrollmentId = (int) DB::table('student_enrollments')
        ->where('student_id', $studentId)
        ->where('academic_year_id', $yearId)
        ->value('id');

    $this->assertDatabaseHas('siswa', ['id' => $studentId, 'kelas_id' => $classId]);

    $this->actingAs($admin)
        ->put("/student-enrollments/{$enrollmentId}", [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'graduated',
        ])
        ->assertRedirect('/student-enrollments')
        ->assertSessionHas('success');

    $this->assertDatabaseHas('student_enrollments', ['id' => $enrollmentId, 'status' => 'graduated']);
    $this->assertDatabaseHas('siswa', ['id' => $studentId, 'kelas_id' => null]);

    $this->actingAs($admin)
        ->put("/student-enrollments/{$enrollmentId}", [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'active',
        ])
        ->assertRedirect('/student-enrollments');

    $this->assertDatabaseHas('siswa', ['id' => $studentId, 'kelas_id' => $classId]);
});

it('rejects a class and academic year mismatch', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0067654321');
    $classId = enrollmentClassId('X.1', '2026/2027');
    $yearId = enrollmentYearId('2027/2028');

    $this->actingAs($admin)
        ->post('/student-enrollments', [
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'active',
        ])
        ->assertSessionHasErrors('academic_year_id');

    $this->assertDatabaseMissing('student_enrollments', [
        'student_id' => $studentId,
        'academic_year_id' => $yearId,
    ]);
});

it('destroys an enrollment and recomputes siswa kelas_id', function () {
    $admin = makeEnrollmentAdmin();
    $studentId = enrollmentStudentId('0067654321');
    $yearId = enrollmentYearId('2026/2027');
    $enrollmentId = (int) DB::table('student_enrollments')
        ->where('student_id', $studentId)
        ->where('academic_year_id', $yearId)
        ->value('id');

    $this->actingAs($admin)
        ->delete("/student-enrollments/{$enrollmentId}")
        ->assertRedirect('/student-enrollments')
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('student_enrollments', ['id' => $enrollmentId]);
    $this->assertDatabaseHas('siswa', ['id' => $studentId, 'kelas_id' => null]);
});
