<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * kelas — master kelas (X.1 .. X.15).
 * PK int(11) AI (signed), jadi $keyType='int'.
 */
class Kelas extends Model
{
    protected $table = 'kelas';
    public $timestamps = true;

    protected $fillable = [
        'nama_kelas', 'tingkat', 'tahun_ajaran',
    ];

    protected $casts = [
        'nama_kelas'   => 'string',
        'tingkat'      => 'string',
        'tahun_ajaran' => 'string',
    ];

    public function siswa(): HasMany
    {
        return $this->hasMany(Siswa::class, 'kelas_id', 'id');
    }

    public function jadwalAjaran(): HasMany
    {
        return $this->hasMany(JadwalAjaran::class, 'kelas_id', 'id');
    }

    public function jadwalPinjaman(): HasMany
    {
        return $this->hasMany(JadwalPinjaman::class, 'kelas_id', 'id');
    }
}
