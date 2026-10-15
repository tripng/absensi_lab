<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * jadwal_pinjaman — one-time borrowing schedule. PK bigint unsigned.
 *
 * Kolom baru (issue #3 alter migration):
 *   kelas_id (FK ke kelas) — sebelumnya tidak ada di pinjaman.
 *   jumlah_siswa, no_telepon.
 *   keterangan sudah ada → dipakai untuk 'alasan'.
 */
class JadwalPinjaman extends Model
{
    protected $table = 'jadwal_pinjaman';
    public $timestamps = true;

    protected $fillable = [
        'mapel_id', 'peminjam_user_id', 'ruang_ajaran_id', 'kelas_id',
        'tanggal', 'jam_mulai', 'jam_selesai', 'keterangan',
        'jumlah_siswa', 'no_telepon',
    ];

    protected $casts = [
        'tanggal'      => 'date',
        'jam_mulai'    => 'datetime:H:i',
        'jam_selesai'  => 'datetime:H:i',
        'jumlah_siswa' => 'integer',
    ];

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(Mapel::class, 'mapel_id', 'id');
    }

    public function peminjam(): BelongsTo
    {
        return $this->belongsTo(User::class, 'peminjam_user_id', 'id');
    }

    public function ruangAjaran(): BelongsTo
    {
        return $this->belongsTo(RuangAjaran::class, 'ruang_ajaran_id', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class, 'kelas_id', 'id');
    }
}
