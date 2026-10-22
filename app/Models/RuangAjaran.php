<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * ruang_ajaran — ruangan/lab yang dapat dijadwalkan / dipinjam.
 * PK bigint unsigned ($table->id()).
 */
class RuangAjaran extends Model
{
    protected $table = 'ruang_ajaran';

    public $timestamps = true;

    protected $fillable = [
        'labkom_id', 'nama_ruangan', 'kapasitas',
    ];

    protected $casts = [
        'labkom_id' => 'int',
        'kapasitas' => 'int',
    ];

    public function labkom(): BelongsTo
    {
        return $this->belongsTo(Labkom::class, 'labkom_id', 'id');
    }

    public function jadwalAjaran(): HasMany
    {
        return $this->hasMany(JadwalAjaran::class, 'ruang_ajaran_id', 'id');
    }

    public function jadwalPinjaman(): HasMany
    {
        return $this->hasMany(JadwalPinjaman::class, 'ruang_ajaran_id', 'id');
    }
}
