<?php

use App\Models\User;
use Database\Seeders\MasterTablesSeeder;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->artisan('db:seed', ['--class' => MasterTablesSeeder::class]);
});

function logAksesApiHeaders(): array
{
    $user = User::where('email', 'admin@absensi.com')->firstOrFail();
    $token = $user->createToken('test-scan-app')->plainTextToken;

    return [
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

it('returns health status without authentication', function () {
    $this->getJson('/api/log-akses/health')
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'service' => 'absensi_lab-log-akses-api',
        ]);
});

it('stores a batch with a valid token and seeded rfid_card', function () {
    $rfidId = DB::table('rfid_card')->value('id');
    $lokasiId = DB::table('lokasi')->value('id');
    $waktuScan = (string) now()->timestamp;

    $this->withHeaders(logAksesApiHeaders())
        ->postJson('/api/log-akses/batch', [
            'data' => [
                [
                    'rfid_id' => $rfidId,
                    'lokasi_id' => $lokasiId,
                    'jenis' => 'masuk',
                    'waktu_scan' => $waktuScan,
                    'status' => 'berhasil',
                    'keterangan' => null,
                ],
            ],
        ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'inserted' => 1,
            'duplicates' => 0,
            'total_received' => 1,
        ]);

    $this->assertDatabaseHas('log_akses', [
        'rfid_id' => $rfidId,
        'lokasi_id' => $lokasiId,
        'jenis' => 'masuk',
        'waktu_scan' => $waktuScan,
    ]);
});

it('rejects a batch with an unknown rfid_id', function () {
    $lokasiId = DB::table('lokasi')->value('id');

    $this->withHeaders(logAksesApiHeaders())
        ->postJson('/api/log-akses/batch', [
            'data' => [
                [
                    'rfid_id' => 99999,
                    'lokasi_id' => $lokasiId,
                    'jenis' => 'masuk',
                    'waktu_scan' => (string) now()->timestamp,
                    'status' => 'berhasil',
                    'keterangan' => null,
                ],
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('data.0.rfid_id');
});
