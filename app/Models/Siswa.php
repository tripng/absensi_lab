<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * siswa — 1:1 ke pengguna (shared PK), many-to-one kelas.
 * PK int(11) signed (shared) → $keyType='int', $incrementing=false.
 */
class Siswa extends Model
{
    protected $table = 'siswa';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'id', 'nisn', 'tahun_masuk', 'kelas_id',
    ];

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id');
    }

    public function kelas(): BelongsTo
    {
        // siswa.kelas_id (int) → kelas.id (int)
        return $this->belongsTo(Kelas::class, 'kelas_id', 'id');
    }
}
