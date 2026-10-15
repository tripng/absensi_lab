<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * pengguna — master orang (siswa/guru). PK int(11) AI (signed).
 */
class Pengguna extends Model
{
    protected $table = 'pengguna';
    public $timestamps = true;

    protected $fillable = [
        'tipe', 'nama', 'foto_path', 'status_aktif',
    ];

    protected $casts = [
        'tipe'         => 'string',
        'nama'         => 'string',
        'foto_path'    => 'string',
        'status_aktif' => 'string',
    ];

    public function guru(): HasOne
    {
        // Shared-PK: guru.id == pengguna.id
        return $this->hasOne(Guru::class, 'id', 'id');
    }

    public function siswa(): HasOne
    {
        // Shared-PK: siswa.id == pengguna.id
        return $this->hasOne(Siswa::class, 'id', 'id');
    }
}
