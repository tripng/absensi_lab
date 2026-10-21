<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $t) {
            $t->integer('id', true);
            $t->string('name', 20)->unique();
            $t->date('start_date');
            $t->date('end_date');
            $t->boolean('is_active')->default(false);
            $t->timestamps();

            $t->primary('id');
        });

        Schema::create('student_enrollments', function (Blueprint $t) {
            $t->integer('id', true);
            $t->integer('student_id');
            $t->integer('class_id');
            $t->integer('academic_year_id');
            $t->string('status', 20)->default('active');
            $t->timestamps();

            $t->primary('id');
            $t->unique(['student_id', 'academic_year_id']);
            $t->index('class_id');
            $t->index('academic_year_id');
            $t->foreign('student_id')
                ->references('id')->on('siswa')
                ->cascadeOnDelete();
            $t->foreign('class_id')
                ->references('id')->on('kelas')
                ->cascadeOnDelete();
            $t->foreign('academic_year_id')
                ->references('id')->on('academic_years')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_enrollments');
        Schema::dropIfExists('academic_years');
    }
};
