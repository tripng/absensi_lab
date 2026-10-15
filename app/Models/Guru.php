<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * guru — 1:1 ke pengguna (shared PK, id = pengguna.id, bukan auto-increment).
 * PK int(11) signed → $keyType='int', $incrementing=false.
 */
class Guru extends Model
{
    protected $table = 'guru';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'id', 'nip', 'jabatan',
    ];

    public function pengguna(): BelongsTo
    {
        // Shared-PK: guru.id → pengguna.id
        return $this->belongsTo(Pengguna::class, 'id');
    }

    public function mapel(): HasMany
    {
        return $this->hasMany(Mapel::class, 'guru_id', 'id');
    }

    public function jadwalAjaran(): HasMany
    {
        return $this->hasMany(JadwalAjaran::class, 'guru_id', 'id');
    }
}
