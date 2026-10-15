<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * jadwal_ajaran — recurrent schedule (Senin–Minggu). PK bigint unsigned.
 *
 * Kolom baru (issue #3 alter migration):
 *   jam_mulai/jam_selesai TIME (menggantikan jam_ke),
 *   jumlah_siswa, no_telepon, keterangan (='alasan').
 * D3: mapel_id nullable (UI tidak pilih mapel; guru_id tetap sebagai PJ).
 */
class JadwalAjaran extends Model
{
    protected $table = 'jadwal_ajaran';
    public $timestamps = true;

    protected $fillable = [
        'hari', 'jam_mulai', 'jam_selesai', 'mapel_id',
        'ruang_ajaran_id', 'kelas_id', 'guru_id',
        'jumlah_siswa', 'no_telepon', 'keterangan',
    ];

    protected $casts = [
        'jam_mulai'    => 'datetime:H:i',
        'jam_selesai'  => 'datetime:H:i',
        'jumlah_siswa' => 'integer',
    ];

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(Mapel::class, 'mapel_id', 'id');
    }

    public function ruangAjaran(): BelongsTo
    {
        return $this->belongsTo(RuangAjaran::class, 'ruang_ajaran_id', 'id');
    }

    public function kelas(): BelongsTo
    {
        // jadwal_ajaran.kelas_id (int) → kelas.id (int)
        return $this->belongsTo(Kelas::class, 'kelas_id', 'id');
    }

    public function guru(): BelongsTo
    {
        // jadwal_ajaran.guru_id (int) → guru.id (int)
        return $this->belongsTo(Guru::class, 'guru_id', 'id');
    }
}
