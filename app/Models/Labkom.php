<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * labkom — komputer laboran. PK int(11) AI; labkom_id FK ke lokasi (int).
 */
class Labkom extends Model
{
    protected $table = 'labkom';

    public $timestamps = true;

    protected $fillable = [
        'lokasi_id', 'total_komputer', 'jumlah_baris', 'jumlah_kolom',
    ];

    protected $casts = [
        'lokasi_id' => 'int',
        'total_komputer' => 'int',
        'jumlah_baris' => 'int',
        'jumlah_kolom' => 'int',
    ];

    public function lokasi(): BelongsTo
    {
        // labkom.lokasi_id (int) → lokasi.id (int)
        return $this->belongsTo(Lokasi::class, 'lokasi_id', 'id');
    }

    public function ruangAjaran(): HasOne
    {
        // ruang_ajaran.labkom_id (int) → labkom.id (int)
        return $this->hasOne(RuangAjaran::class, 'labkom_id', 'id');
    }
}
