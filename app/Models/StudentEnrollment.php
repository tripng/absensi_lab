<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentEnrollment extends Model
{
    protected $table = 'student_enrollments';

    protected $fillable = [
        'student_id', 'class_id', 'academic_year_id', 'status',
    ];

    protected $casts = [
        'student_id' => 'integer',
        'class_id' => 'integer',
        'academic_year_id' => 'integer',
        'status' => 'string',
    ];

    public function siswa(): BelongsTo
    {
        return $this->belongsTo(Siswa::class, 'student_id', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class, 'class_id', 'id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id', 'id');
    }
}
