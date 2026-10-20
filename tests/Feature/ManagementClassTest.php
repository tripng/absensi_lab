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
        'email' => 'admin@absensi.test',
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
            'type' => 'recurring',
            'hari' => 'senin',
            'jam_mulai' => '08:00',
            'jam_selesai' => '09:00',
        ])
        ->assertSessionHasErrors(['kelas_id', 'ruang_ajaran_id']);
});

it('store recurring persists to jadwal_ajaran', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $guruId = Guru::query()->first()->id;
    $ruangId = RuangAjaran::query()->first()->id;

    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'recurring',
            'kelas_id' => $kelasId,
            'guru_id' => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => '',
            'hari' => 'selasa',
            'jam_mulai' => '10:00',
            'jam_selesai' => '11:30',
            'jumlah_siswa' => 30,
            'no_telepon' => '081234567890',
            'keterangan' => 'E2E recurring',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_ajaran', [
        'kelas_id' => $kelasId,
        'guru_id' => $guruId,
        'ruang_ajaran_id' => $ruangId,
        'hari' => 'selasa',
        'keterangan' => 'E2E recurring',
    ]);
});

it('store one-time persists to jadwal_pinjaman with peminjam = logged user', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.2')->value('id');
    $ruangId = RuangAjaran::query()->first()->id;
    $mapelId = Mapel::query()->first()->id;

    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'one-time',
            'kelas_id' => $kelasId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => $mapelId,
            'tanggal_mulai' => '2026-10-28T09:00',
            'tanggal_selesai' => '2026-10-28T12:00',
            'jumlah_siswa' => 28,
            'no_telepon' => '081987654321',
            'keterangan' => 'E2E pinjaman',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_pinjaman', [
        'peminjam_user_id' => $admin->id,
        'kelas_id' => $kelasId,
        'ruang_ajaran_id' => $ruangId,
        'tanggal' => '2026-10-28',
        'jam_mulai' => '09:00:00',
        'jam_selesai' => '12:00:00',
        'keterangan' => 'E2E pinjaman',
    ]);
});

it('deletes recurring and one-time schedules', function () {
    $admin = makeAdmin();
    $this->actingAs($admin);

    $kelasId = Kelas::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');
    $mapelId = Mapel::query()->value('id');

    $rec = JadwalAjaran::create([
        'hari' => 'senin', 'jam_mulai' => '08:00', 'jam_selesai' => '09:00',
        'kelas_id' => $kelasId,
    ]);
    $this->delete('/management-class/'.$rec->id.'?type=recurring')
        ->assertRedirect('/management-class');
    $this->assertDatabaseMissing('jadwal_ajaran', ['id' => $rec->id]);

    $pin = JadwalPinjaman::create([
        'mapel_id' => $mapelId,
        'peminjam_user_id' => $admin->id,
        'ruang_ajaran_id' => $ruangId,
        'kelas_id' => $kelasId,
        'tanggal' => '2026-11-01',
        'jam_mulai' => '09:00:00',
        'jam_selesai' => '10:00:00',
    ]);
    $this->delete('/management-class/'.$pin->id.'?type=one-time')
        ->assertRedirect('/management-class');
    $this->assertDatabaseMissing('jadwal_pinjaman', ['id' => $pin->id]);
});

it('index emits raw FK ids and mapelList so edit prefill is by-ID', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $ruangId = RuangAjaran::query()->value('id');
    $guruId = Guru::query()->value('id');
    $mapelId = Mapel::query()->value('id');

    JadwalAjaran::query()->insert([
        'hari' => 'selasa', 'jam_mulai' => '10:00:00', 'jam_selesai' => '11:30:00',
        'kelas_id' => $kelasId, 'guru_id' => $guruId, 'ruang_ajaran_id' => $ruangId,
        'mapel_id' => $mapelId, 'jumlah_siswa' => 30, 'no_telepon' => '081234567890',
        'keterangan' => 'recurring raw',
    ]);
    JadwalPinjaman::query()->insert([
        'mapel_id' => $mapelId, 'peminjam_user_id' => $admin->id,
        'ruang_ajaran_id' => $ruangId, 'kelas_id' => $kelasId,
        'tanggal' => '2026-10-28', 'jam_mulai' => '09:00:00', 'jam_selesai' => '12:00:00',
        'jumlah_siswa' => 28, 'no_telepon' => '081987654321', 'keterangan' => 'pinjaman raw',
    ]);

    $this->actingAs($admin)
        ->get('/management-class')
        ->assertOk()
        ->assertInertia(function ($page) use ($kelasId, $ruangId, $guruId, $mapelId) {
            $page->has('mapelList')
                ->has('recurring', 1)
                ->has('pinjaman', 1)
                ->has('recurring.0.kelas_id')
                ->has('recurring.0.ruang_ajaran_id')
                ->has('recurring.0.guru_id')
                ->has('recurring.0.mapel_id')
                ->has('pinjaman.0.kelas_id')
                ->has('pinjaman.0.ruang_ajaran_id')
                ->has('pinjaman.0.mapel_id')
                ->where('recurring.0.kelas_id', fn ($v) => $v == $kelasId)
                ->where('recurring.0.guru_id', fn ($v) => $v == $guruId)
                ->where('recurring.0.ruang_ajaran_id', fn ($v) => $v == $ruangId)
                ->where('recurring.0.mapel_id', fn ($v) => $v == $mapelId)
                ->where('pinjaman.0.kelas_id', fn ($v) => $v == $kelasId)
                ->where('pinjaman.0.ruang_ajaran_id', fn ($v) => $v == $ruangId)
                ->where('pinjaman.0.mapel_id', fn ($v) => $v == $mapelId);

            return $page;
        });
});

it('edits a recurring schedule end-to-end (PUT updates DB + round-trip shows new values)', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $guruId = Guru::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');

    $rec = JadwalAjaran::query()->insertGetId([
        'hari' => 'senin', 'jam_mulai' => '08:00:00', 'jam_selesai' => '09:00:00',
        'kelas_id' => $kelasId, 'guru_id' => $guruId, 'ruang_ajaran_id' => $ruangId,
    ]);

    $this->actingAs($admin)
        ->put('/management-class/'.$rec, [
            'type' => 'recurring',
            'kelas_id' => $kelasId,
            'guru_id' => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => '',
            'hari' => 'selasa',
            'jam_mulai' => '10:00',
            'jam_selesai' => '11:30',
            'jumlah_siswa' => 32,
            'no_telepon' => '08111111111',
            'keterangan' => 'updated via PUT',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_ajaran', [
        'id' => $rec,
        'hari' => 'selasa',
        'jam_mulai' => '10:00:00',
        'jam_selesai' => '11:30:00',
        'jumlah_siswa' => 32,
        'keterangan' => 'updated via PUT',
    ]);

    // Round-trip: index must surface the updated recurring entry.
    $this->actingAs($admin)
        ->get('/management-class')
        ->assertInertia(fn ($page) => $page->has('recurring', 1));
});

it('edits a one-time schedule end-to-end (PUT updates DB)', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.2')->value('id');
    $ruangId = RuangAjaran::query()->value('id');
    $mapelId = Mapel::query()->value('id');

    $pin = JadwalPinjaman::query()->insertGetId([
        'mapel_id' => $mapelId,
        'peminjam_user_id' => $admin->id,
        'ruang_ajaran_id' => $ruangId,
        'kelas_id' => $kelasId,
        'tanggal' => '2026-10-28',
        'jam_mulai' => '09:00:00',
        'jam_selesai' => '10:00:00',
    ]);

    $this->actingAs($admin)
        ->put('/management-class/'.$pin, [
            'type' => 'one-time',
            'kelas_id' => $kelasId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => $mapelId,
            'tanggal_mulai' => '2026-10-28T09:30',
            'tanggal_selesai' => '2026-10-28T11:00',
            'jumlah_siswa' => 22,
            'no_telepon' => '08222222222',
            'keterangan' => 'updated via PUT one-time',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_pinjaman', [
        'id' => $pin,
        'tanggal' => '2026-10-28',
        'jam_mulai' => '09:30:00',
        'jam_selesai' => '11:00:00',
        'jumlah_siswa' => 22,
        'keterangan' => 'updated via PUT one-time',
    ]);
});

it('deletes one-time via request body type (as Inertia UI sends)', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');
    $mapelId = Mapel::query()->value('id');

    $pin = JadwalPinjaman::query()->insertGetId([
        'mapel_id' => $mapelId,
        'peminjam_user_id' => $admin->id,
        'ruang_ajaran_id' => $ruangId,
        'kelas_id' => $kelasId,
        'tanggal' => '2026-11-05',
        'jam_mulai' => '09:00:00',
        'jam_selesai' => '10:00:00',
    ]);

    // type dikirim lewat BODY (bukan query) — mereka ini bug sebelumnya.
    $this->actingAs($admin)
        ->delete('/management-class/'.$pin, ['type' => 'one-time'])
        ->assertRedirect('/management-class');

    $this->assertDatabaseMissing('jadwal_pinjaman', ['id' => $pin]);
});

it('rejects recurring save when time conflicts on same ruangan/kelas', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $guruId = Guru::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');

    // Jadwal pertama: 10:00–11:30
    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'recurring',
            'kelas_id' => $kelasId,
            'guru_id' => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'hari' => 'selasa',
            'jam_mulai' => '10:00',
            'jam_selesai' => '11:30',
            'keterangan' => 'initial',
            'no_telepon' => '08100000000',
        ])
        ->assertRedirect('/management-class');
    $this->assertDatabaseHas('jadwal_ajaran', ['keterangan' => 'initial']);

    // Jadwal kedua: 10:30–12:00 → tumpang tindih di ruangan/kelas yang sama.
    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'recurring',
            'kelas_id' => $kelasId,
            'guru_id' => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'hari' => 'selasa',
            'jam_mulai' => '10:30',
            'jam_selesai' => '12:00',
            'keterangan' => 'should fail',
            'no_telepon' => '08100000000',
        ])
        ->assertSessionHasErrors('time_conflict');

    $this->assertDatabaseMissing('jadwal_ajaran', ['keterangan' => 'should fail']);
});

it('rejects one-time save when time conflicts on same ruangan/kelas', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');
    $mapelId = Mapel::query()->value('id');

    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'one-time',
            'kelas_id' => $kelasId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => $mapelId,
            'tanggal_mulai' => '2026-10-28T09:00',
            'tanggal_selesai' => '2026-10-28T10:00',
            'keterangan' => 'initial',
            'no_telepon' => '08100000000',
        ])
        ->assertRedirect('/management-class');

    // 09:30–10:30 bentrok dengan 09:00–10:00 pada ruangan yang sama.
    $this->actingAs($admin)
        ->post('/management-class', [
            'type' => 'one-time',
            'kelas_id' => $kelasId,
            'ruang_ajaran_id' => $ruangId,
            'mapel_id' => $mapelId,
            'tanggal_mulai' => '2026-10-28T09:30',
            'tanggal_selesai' => '2026-10-28T10:30',
            'keterangan' => 'should fail',
            'no_telepon' => '08100000000',
        ])
        ->assertSessionHasErrors('time_conflict');

    $this->assertDatabaseMissing('jadwal_pinjaman', ['keterangan' => 'should fail']);
});

it('edit (PUT) does not flag a conflict with itself', function () {
    $admin = makeAdmin();
    $kelasId = Kelas::query()->where('nama_kelas', 'X.1')->value('id');
    $guruId = Guru::query()->value('id');
    $ruangId = RuangAjaran::query()->value('id');

    $rec = JadwalAjaran::query()->insertGetId([
        'hari' => 'senin', 'jam_mulai' => '08:00:00', 'jam_selesai' => '09:00:00',
        'kelas_id' => $kelasId, 'guru_id' => $guruId, 'ruang_ajaran_id' => $ruangId,
    ]);

    $this->actingAs($admin)
        ->put('/management-class/'.$rec, [
            'type' => 'recurring',
            'kelas_id' => $kelasId,
            'guru_id' => $guruId,
            'ruang_ajaran_id' => $ruangId,
            'hari' => 'senin',
            'jam_mulai' => '08:00',
            'jam_selesai' => '09:00',
            'keterangan' => 'self edit ok',
            'no_telepon' => '08100000000',
        ])
        ->assertRedirect('/management-class');

    $this->assertDatabaseHas('jadwal_ajaran', ['id' => $rec, 'keterangan' => 'self edit ok']);
});
