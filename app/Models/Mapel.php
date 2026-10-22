<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * mapel — master mata pelajaran. PK bigint unsigned ($table->id()).
 */
class Mapel extends Model
{
    protected $table = 'mapel';

    public $timestamps = true;

    protected $fillable = [
        'kode_mapel', 'nama_mapel', 'kelompok', 'guru_id',
    ];

    protected $casts = [
        'guru_id' => 'int',
    ];

    public function guru(): BelongsTo
    {
        // mapel.guru_id (int) → guru.id (int)
        return $this->belongsTo(Guru::class, 'guru_id', 'id');
    }

    public function jadwalAjaran(): HasMany
    {
        return $this->hasMany(JadwalAjaran::class, 'mapel_id', 'id');
    }

    public function jadwalPinjaman(): HasMany
    {
        return $this->hasMany(JadwalPinjaman::class, 'mapel_id', 'id');
    }
}
