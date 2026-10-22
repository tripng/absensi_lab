<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * lokasi — lokasi master (gerbang/lab/kelas/lainnya). PK int(11) AI.
 */
class Lokasi extends Model
{
    protected $table = 'lokasi';

    public $timestamps = true;

    protected $fillable = [
        'nama_lokasi', 'jenis',
    ];

    public function labkom(): HasOne
    {
        return $this->hasOne(Labkom::class, 'lokasi_id', 'id');
    }
}
