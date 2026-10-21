<?php

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Mapel;
use App\Models\RuangAjaran;
use App\Models\User;
use Database\Seeders\MasterTablesSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->artisan('db:seed', ['--class' => MasterTablesSeeder::class]);
});

function makeMasterAdmin()
{
    return User::factory()->create([
        'email' => 'admin@absensi.test',
        'password' => Hash::make('password'),
    ]);
}

it('requires authentication to view master-data', function () {
    $this->get('/master-data')->assertRedirect('/login');
});

it('authenticated index emits master props from DB', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->get('/master-data')
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->has('tabs')
                ->has('guruList', 5)
                ->has('kelasList', 15)
                ->has('ruangList', 1)
                ->has('mapelList', 5)
                ->has('formConfig')
                ->has('formConfig.guru')
                ->has('formConfig.kelas')
                ->has('formConfig.ruang')
                ->has('formConfig.mapel');

            return $page;
        });
});

// ----------------------------------------------------------------------
// Per-entity pages
// ----------------------------------------------------------------------
it('guru page emits guruList + flash + formConfig', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->withSession(['success' => 'Guru berhasil ditambahkan.'])
        ->get('/master-data/guru')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('MasterData/Guru/Index')
            ->has('tabs')
            ->has('guruList', 5)
            ->has('formConfig.guru')
            ->where('success', 'Guru berhasil ditambahkan.'));
});

it('kelas page emits kelasList + flash + formConfig', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->withSession(['success' => 'Kelas berhasil ditambahkan.'])
        ->get('/master-data/kelas')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('MasterData/Kelas/Index')
            ->has('tabs')
            ->has('kelasList', 15)
            ->has('formConfig.kelas')
            ->where('success', 'Kelas berhasil ditambahkan.'));
});

it('ruang page emits ruangList + flash + formConfig', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->withSession(['success' => 'Ruang berhasil ditambahkan.'])
        ->get('/master-data/ruang')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('MasterData/Ruang/Index')
            ->has('tabs')
            ->has('ruangList', 1)
            ->has('formConfig.ruang')
            ->where('success', 'Ruang berhasil ditambahkan.'));
});

it('mapel page emits mapelList + flash + formConfig', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->withSession(['success' => 'Mapel berhasil ditambahkan.'])
        ->get('/master-data/mapel')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('MasterData/Mapel/Index')
            ->has('tabs')
            ->has('mapelList', 5)
            ->has('formConfig.mapel')
            ->where('success', 'Mapel berhasil ditambahkan.'));
});

// ----------------------------------------------------------------------
// Guru
// ----------------------------------------------------------------------
it('stores a guru (persists into pengguna + guru via shared PK)', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->post('/master-data/guru', [
            'nama' => 'Test Guru Baru',
            'nip' => '199901012010011006',
            'jabatan' => 'Guru Tes',
        ])
        ->assertRedirect('/master-data/guru');

    $penggunaId = DB::table('pengguna')->where('nama', 'Test Guru Baru')->value('id');
    $this->assertNotNull($penggunaId);
    $this->assertDatabaseHas('pengguna', ['id' => $penggunaId, 'tipe' => 'guru']);
    $this->assertDatabaseHas('guru', ['id' => $penggunaId, 'nip' => '199901012010011006', 'jabatan' => 'Guru Tes']);
});

it('rejects storing guru with a duplicate NIP', function () {
    $admin = makeMasterAdmin();
    $seededNip = DB::table('guru')->value('nip');

    $this->actingAs($admin)
        ->post('/master-data/guru', [
            'nama' => 'Dup Nip',
            'nip' => $seededNip,
        ])
        ->assertSessionHasErrors('nip');

    $this->assertDatabaseMissing('pengguna', ['nama' => 'Dup Nip']);
});

it('updates a guru (PUT) and persists to both tables', function () {
    $admin = makeMasterAdmin();
    $penggunaId = DB::table('pengguna')->insertGetId([
        'tipe' => 'guru', 'nama' => 'Before', 'status_aktif' => 'aktif',
    ]);
    Guru::query()->insert([
        'id' => $penggunaId, 'nip' => '199902022011022007', 'jabatan' => 'Sebelum',
    ]);

    $this->actingAs($admin)
        ->put("/master-data/guru/{$penggunaId}", [
            'nama' => 'After Edit',
            'nip' => '199902022011022007',
            'jabatan' => 'Sesudah',
        ])
        ->assertRedirect('/master-data/guru');

    $this->assertDatabaseHas('pengguna', ['id' => $penggunaId, 'nama' => 'After Edit']);
    $this->assertDatabaseHas('guru', ['id' => $penggunaId, 'jabatan' => 'Sesudah']);
});

it('deletes a guru (cascades to pengguna via shared PK)', function () {
    $admin = makeMasterAdmin();
    $penggunaId = DB::table('pengguna')->insertGetId([
        'tipe' => 'guru', 'nama' => 'ToDelete', 'status_aktif' => 'aktif',
    ]);
    Guru::query()->insert(['id' => $penggunaId, 'nip' => '199903032012033008', 'jabatan' => 'Tmp']);

    $this->actingAs($admin)
        ->delete("/master-data/guru/{$penggunaId}")
        ->assertRedirect('/master-data/guru');

    $this->assertDatabaseMissing('guru', ['id' => $penggunaId]);
    $this->assertDatabaseMissing('pengguna', ['id' => $penggunaId]);
});

// ----------------------------------------------------------------------
// Kelas
// ----------------------------------------------------------------------
it('stores, updates, and deletes a kelas end-to-end', function () {
    $admin = makeMasterAdmin();

    // store
    $this->actingAs($admin)
        ->post('/master-data/kelas', [
            'nama_kelas' => 'XI.1', 'tingkat' => 'XI', 'tahun_ajaran' => '2027/2028',
        ])
        ->assertRedirect('/master-data/kelas');

    $kelas = Kelas::query()->where('nama_kelas', 'XI.1')->first();
    $this->assertNotNull($kelas);
    $this->assertDatabaseHas('kelas', ['id' => $kelas->id, 'tingkat' => 'XI', 'tahun_ajaran' => '2027/2028']);

    // update
    $this->actingAs($admin)
        ->put("/master-data/kelas/{$kelas->id}", [
            'nama_kelas' => 'XI.1 (edit)', 'tingkat' => 'XI', 'tahun_ajaran' => '2028/2029',
        ])
        ->assertRedirect('/master-data/kelas');

    $this->assertDatabaseHas('kelas', ['id' => $kelas->id, 'nama_kelas' => 'XI.1 (edit)']);

    // delete
    $this->actingAs($admin)
        ->delete("/master-data/kelas/{$kelas->id}")
        ->assertRedirect('/master-data/kelas');

    $this->assertDatabaseMissing('kelas', ['id' => $kelas->id]);
});

// ----------------------------------------------------------------------
// Ruangan / Lab
// ----------------------------------------------------------------------
it('stores a ruangan with and without a labkom link, then updates + deletes', function () {
    $admin = makeMasterAdmin();

    // ruang_ajaran.labkom_id unik 1:1 → buat labkom kedua agar bisa di-link.
    $lokasiId = DB::table('lokasi')->insertGetId([
        'nama_lokasi' => 'Labkom 2 Area', 'jenis' => 'lab',
    ]);
    $labkomId = DB::table('labkom')->insertGetId([
        'lokasi_id' => $lokasiId, 'total_komputer' => 20, 'jumlah_baris' => 5, 'jumlah_kolom' => 4,
    ]);

    // store with labkom
    $this->actingAs($admin)
        ->post('/master-data/ruang', [
            'nama_ruangan' => 'Labkom 2', 'kapasitas' => 24, 'labkom_id' => $labkomId,
        ])
        ->assertRedirect('/master-data/ruang');

    $ruangId = RuangAjaran::query()->where('nama_ruangan', 'Labkom 2')->value('id');
    $this->assertDatabaseHas('ruang_ajaran', ['id' => $ruangId, 'labkom_id' => $labkomId, 'kapasitas' => 24]);

    // store without labkom (nullable FK) — boleh lebih dari satu null
    $this->actingAs($admin)
        ->post('/master-data/ruang', [
            'nama_ruangan' => 'Ruang Haji', 'kapasitas' => '', 'labkom_id' => '',
        ])
        ->assertRedirect('/master-data/ruang');

    $this->assertDatabaseHas('ruang_ajaran', ['nama_ruangan' => 'Ruang Haji', 'labkom_id' => null]);

    // update
    $this->actingAs($admin)
        ->put("/master-data/ruang/{$ruangId}", [
            'nama_ruangan' => 'Labkom 2 (edit)', 'kapasitas' => 20, 'labkom_id' => $labkomId,
        ])
        ->assertRedirect('/master-data/ruang');

    $this->assertDatabaseHas('ruang_ajaran', ['id' => $ruangId, 'nama_ruangan' => 'Labkom 2 (edit)', 'kapasitas' => 20]);

    // delete
    $this->actingAs($admin)
        ->delete("/master-data/ruang/{$ruangId}")
        ->assertRedirect('/master-data/ruang');

    $this->assertDatabaseMissing('ruang_ajaran', ['id' => $ruangId]);
});

it('stores a ruangan with invalid labkom_id fails validation', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->post('/master-data/ruang', [
            'nama_ruangan' => 'Bad Labkom', 'kapasitas' => '', 'labkom_id' => 9999,
        ])
        ->assertSessionHasErrors('labkom_id');

    $this->assertDatabaseMissing('ruang_ajaran', ['nama_ruangan' => 'Bad Labkom']);
});

// ----------------------------------------------------------------------
// Mata Pelajaran
// ----------------------------------------------------------------------
it('stores, updates, and deletes a mapel end-to-end', function () {
    $admin = makeMasterAdmin();
    $guruId = Guru::query()->value('id');

    // store
    $this->actingAs($admin)
        ->post('/master-data/mapel', [
            'kode_mapel' => 'WEB1', 'nama_mapel' => 'Web Dasar', 'kelompok' => 'praktik', 'guru_id' => $guruId,
        ])
        ->assertRedirect('/master-data/mapel');

    $mapel = Mapel::query()->where('kode_mapel', 'WEB1')->first();
    $this->assertNotNull($mapel);
    $this->assertDatabaseHas('mapel', ['id' => $mapel->id, 'nama_mapel' => 'Web Dasar', 'kelompok' => 'praktik', 'guru_id' => $guruId]);

    // store without guru (nullable FK)
    $this->actingAs($admin)
        ->post('/master-data/mapel', [
            'kode_mapel' => 'WEB2', 'nama_mapel' => 'Web Lanjut', 'kelompok' => 'wajib', 'guru_id' => '',
        ])
        ->assertRedirect('/master-data/mapel');

    $this->assertDatabaseHas('mapel', ['kode_mapel' => 'WEB2', 'guru_id' => null]);

    // update
    $this->actingAs($admin)
        ->put("/master-data/mapel/{$mapel->id}", [
            'kode_mapel' => 'WEB1X', 'nama_mapel' => 'Web Dasar (edit)', 'kelompok' => 'wajib', 'guru_id' => $guruId,
        ])
        ->assertRedirect('/master-data/mapel');

    $this->assertDatabaseHas('mapel', ['id' => $mapel->id, 'kode_mapel' => 'WEB1X', 'kelompok' => 'wajib']);

    // delete
    $this->actingAs($admin)
        ->delete("/master-data/mapel/{$mapel->id}")
        ->assertRedirect('/master-data/mapel');

    $this->assertDatabaseMissing('mapel', ['id' => $mapel->id]);
});

it('rejects storing mapel with a duplicate kode_mapel', function () {
    $admin = makeMasterAdmin();
    $existing = Mapel::query()->value('kode_mapel');

    $this->actingAs($admin)
        ->post('/master-data/mapel', [
            'kode_mapel' => $existing, 'nama_mapel' => 'Duplikat', 'kelompok' => 'wajib', 'guru_id' => '',
        ])
        ->assertSessionHasErrors('kode_mapel');

    $this->assertDatabaseMissing('mapel', ['nama_mapel' => 'Duplikat']);
});

it('index round-trips a stored mapel through props after create', function () {
    $admin = makeMasterAdmin();
    $this->actingAs($admin)
        ->post('/master-data/mapel', [
            'kode_mapel' => 'RT1', 'nama_mapel' => 'Round Trip', 'kelompok' => 'wajib', 'guru_id' => '',
        ])
        ->assertRedirect('/master-data/mapel');

    $this->actingAs($admin)
        ->get('/master-data')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('mapelList', 6));
});

it('allows editing a seeded mapel without flagging its own kode as duplicate', function () {
    $admin = makeMasterAdmin();
    $mapel = Mapel::query()->first();
    $this->assertNotNull($mapel);

    $this->actingAs($admin)
        ->put("/master-data/mapel/{$mapel->id}", [
            'kode_mapel' => $mapel->kode_mapel,
            'nama_mapel' => 'Nama Diubah',
            'kelompok' => $mapel->kelompok,
        ])
        ->assertRedirect('/master-data/mapel');

    $this->assertDatabaseHas('mapel', ['id' => $mapel->id, 'nama_mapel' => 'Nama Diubah']);
});
