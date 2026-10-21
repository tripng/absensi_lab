<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\StudentEnrollment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StudentEnrollmentController extends Controller
{
    public const STATUSES = [
        'active', 'promoted', 'retained', 'graduated', 'transferred', 'dropped',
    ];

    public function index(): Response
    {
        return Inertia::render('StudentEnrollments/Index', [
            'enrollments' => $this->enrollmentList(),
            'academicYears' => $this->academicYearList(),
            'students' => $this->studentList(),
            'classes' => $this->classList(),
            'success' => session('success'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($validated) {
            $enrollment = StudentEnrollment::query()->create($validated);
            $this->syncStudentClass($enrollment->student_id);
        });

        return redirect()->route('student-enrollments')
            ->with('success', 'Enrollment berhasil ditambahkan.');
    }

    public function update(Request $request, StudentEnrollment $enrollment): RedirectResponse
    {
        $validated = $this->validatePayload($request, $enrollment->id);
        $previousStudentId = $enrollment->student_id;

        DB::transaction(function () use ($enrollment, $validated, $previousStudentId) {
            $enrollment->update($validated);
            $this->syncStudentClass($previousStudentId);

            if ($enrollment->student_id !== $previousStudentId) {
                $this->syncStudentClass($enrollment->student_id);
            }
        });

        return redirect()->route('student-enrollments')
            ->with('success', 'Enrollment berhasil diperbarui.');
    }

    public function destroy(StudentEnrollment $enrollment): RedirectResponse
    {
        DB::transaction(function () use ($enrollment) {
            $studentId = $enrollment->student_id;
            $enrollment->delete();
            $this->syncStudentClass($studentId);
        });

        return redirect()->route('student-enrollments')
            ->with('success', 'Enrollment berhasil dihapus.');
    }

    protected function validatePayload(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'integer',
                'exists:siswa,id',
                Rule::unique('student_enrollments', 'student_id')
                    ->where(fn ($query) => $query->where('academic_year_id', $request->integer('academic_year_id')))
                    ->ignore($ignoreId),
            ],
            'class_id' => ['required', 'integer', 'exists:kelas,id'],
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
        ]);

        $class = Kelas::query()->find($validated['class_id']);
        $academicYear = AcademicYear::query()->find($validated['academic_year_id']);

        if ((string) $class->tahun_ajaran !== (string) $academicYear->name) {
            throw ValidationException::withMessages([
                'academic_year_id' => 'Tahun ajaran kelas ('.($class->tahun_ajaran ?? '-').') tidak sesuai dengan tahun ajaran yang dipilih ('.$academicYear->name.').',
            ]);
        }

        return $validated;
    }

    protected function syncStudentClass(int $studentId): void
    {
        $enrollment = StudentEnrollment::query()
            ->where('student_id', $studentId)
            ->whereIn('status', ['active', 'promoted'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        DB::table('siswa')->where('id', $studentId)->update([
            'kelas_id' => $enrollment?->class_id,
        ]);
    }

    protected function enrollmentList(): array
    {
        return StudentEnrollment::query()
            ->with(['siswa.pengguna', 'kelas', 'academicYear'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (StudentEnrollment $enrollment) => [
                'id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'student_nama' => $enrollment->siswa?->pengguna?->nama ?? '-',
                'nisn' => $enrollment->siswa?->nisn,
                'class_id' => $enrollment->class_id,
                'class_nama' => $enrollment->kelas?->nama_kelas ?? '-',
                'academic_year_id' => $enrollment->academic_year_id,
                'academic_year_name' => $enrollment->academicYear?->name ?? '-',
                'status' => $enrollment->status,
                'created_at' => $enrollment->created_at?->format('d/m/Y H:i'),
            ])
            ->values()
            ->all();
    }

    protected function academicYearList(): array
    {
        return AcademicYear::query()
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'end_date', 'is_active'])
            ->map(fn (AcademicYear $academicYear) => [
                'id' => $academicYear->id,
                'name' => $academicYear->name,
                'start_date' => $academicYear->start_date?->format('Y-m-d'),
                'end_date' => $academicYear->end_date?->format('Y-m-d'),
                'is_active' => $academicYear->is_active,
            ])
            ->values()
            ->all();
    }

    protected function studentList(): array
    {
        return Siswa::query()
            ->with(['pengguna', 'kelas'])
            ->orderBy('id')
            ->get(['id', 'nisn', 'tahun_masuk', 'kelas_id'])
            ->map(fn (Siswa $siswa) => [
                'id' => $siswa->id,
                'nama' => $siswa->pengguna?->nama ?? '-',
                'nisn' => $siswa->nisn,
                'tahun_masuk' => $siswa->tahun_masuk,
                'kelas_id' => $siswa->kelas_id,
                'kelas_nama' => $siswa->kelas?->nama_kelas,
            ])
            ->values()
            ->all();
    }

    protected function classList(): array
    {
        return Kelas::query()
            ->orderBy('nama_kelas')
            ->get(['id', 'nama_kelas', 'tingkat', 'tahun_ajaran'])
            ->map(fn (Kelas $kelas) => [
                'id' => $kelas->id,
                'nama_kelas' => $kelas->nama_kelas,
                'tingkat' => $kelas->tingkat,
                'tahun_ajaran' => $kelas->tahun_ajaran,
            ])
            ->values()
            ->all();
    }
}
