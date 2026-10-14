<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLogAksesBatch extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => 'required|array',
            'data.*.rfid_id' => 'required|integer|exists:rfid_card,id',
            'data.*.lokasi_id' => 'required|integer|exists:lokasi,id',
            'data.*.jenis' => 'required|string|in:masuk,keluar',
            'data.*.waktu_scan' => 'required|string|regex:/^[0-9]+$/',
            'data.*.status' => 'required|string',
            'data.*.keterangan' => 'nullable|string',
        ];
    }
}
