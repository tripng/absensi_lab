<?php

use App\Models\Guru;
use App\Models\JadwalAjaran;
use App\Models\JadwalPinjaman;
use App\Models\Kelas;
use App\Models\Mapel;
use App\Models\RuangAjaran;
use App\Models\User;
use Database\Seeders\MasterTablesSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->artisan('db:seed', ['--class' => MasterTablesSeeder::class]);
});

function makeAdmin()
{
    return User::factory()->create([
        'email'    => 'admin@absensi.test',
        'password' => Hash::make('password'),
    ]);
}

it('requires authentication to view management-class', function () {
    $this->get('/management-class')->assertRedirect('/login');
});

it('authenticated index emits real master props from DB', function () {
    $admin = makeAdmin();
    $this->actingAs($admin)
        ->get('/management-class')
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->has('kelasList', 15)
                 ->has('ruangList', 1)
                 ->has('guruList')
                 ->has('recurring')
                 ->has('pinjaman');

            return $page;
        });
});

it('cannot store recurring without required FK (kelas_id, ruang_ajaran_id)', function () {
    $admin = makeAdmin();
    $this->actingAs($admin)
        ->post('/management-class', [
            'type'          => 'recurring',
            'hari'          => 'senin',
            'jam_mulai'     => '08:00',
            'jam_selesai'   => '09:00',
        ])
        ->assertSessionHasErrors(['kelas_id', 'ruang_ajaran_id']);
});

it('store recurring persists to jadwal_ajaran', function () {
    $admin = makeAdmin();
    $kelasId  = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $guruId   = Guru::query()->first()->id;
    $ruangId  = RuangAjaran::query()->first()->id;

    $this->actingAs($admin)
        ->post('/management-class', [
            'type'            => 'recurring',
            'kelas_id'        => $kelasId,
            'guru_id'         => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id'        => '',
            'hari'            => 'selasa',
            'jam_mulai'       => '10:00',
            'jam_selesai'     => '11:30',
            'jumlah_siswa'    => 30,
            'no_telepon'      => '081234567890',
            'keterangan'      => 'E2E recurring',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_ajaran', [
        'kelas_id'        => $kelasId,
        'guru_id'         => $guruId,
        'ruang_ajaran_id' => $ruangId,
        'hari'            => 'selasa',
        'keterangan'      => 'E2E recurring',
    ]);
});

it('store one-time persists to jadwal_pinjaman with peminjam = logged user', function () {
    $admin = makeAdmin();
    $kelasId  = Kelas::query()->where('nama_kelas', 'X.2')->value('id');
    $ruangId  = RuangAjaran::query()->first()->id;
    $mapelId  = Mapel::query()->first()->id;

    $this->actingAs($admin)
        ->post('/management-class', [
            'type'             => 'one-time',
            'kelas_id'         => $kelasId,
            'ruang_ajaran_id'  => $ruangId,
            'mapel_id'         => $mapelId,
            'tanggal_mulai'    => '2026-10-28T09:00',
            'tanggal_selesai'  => '2026-10-28T12:00',
            'jumlah_siswa'     => 28,
            'no_telepon'       => '081987654321',
            'keterangan'       => 'E2E pinjaman',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_pinjaman', [
        'peminjam_user_id' => $admin->id,
        'kelas_id'         => $kelasId,
        'ruang_ajaran_id'  => $ruangId,
        'tanggal'          => '2026-10-28',
        'jam_mulai'        => '09:00:00',
        'jam_selesai'      => '12:00:00',
        'keterangan'       => 'E2E pinjaman',
    ]);
});

it('deletes recurring and one-time schedules', function () {
    $admin = makeAdmin();
    $this->actingAs($admin);

    $kelasId  = Kelas::query()->value('id');
    $ruangId  = RuangAjaran::query()->value('id');
    $mapelId  = Mapel::query()->value('id');

    $rec = JadwalAjaran::create([
        'hari' => 'senin', 'jam_mulai' => '08:00', 'jam_selesai' => '09:00',
        'kelas_id' => $kelasId,
    ]);
    $this->delete('/management-class/' . $rec->id . '?type=recurring')
        ->assertRedirect('/management-class');
    $this->assertDatabaseMissing('jadwal_ajaran', ['id' => $rec->id]);

    $pin = JadwalPinjaman::create([
        'mapel_id'         => $mapelId,
        'peminjam_user_id' => $admin->id,
        'ruang_ajaran_id'  => $ruangId,
        'kelas_id'         => $kelasId,
        'tanggal'          => '2026-11-01',
        'jam_mulai'        => '09:00:00',
        'jam_selesai'      => '10:00:00',
    ]);
    $this->delete('/management-class/' . $pin->id . '?type=one-time')
        ->assertRedirect('/management-class');
    $this->assertDatabaseMissing('jadwal_pinjaman', ['id' => $pin->id]);
});
