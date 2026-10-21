<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Labkom;
use App\Models\Mapel;
use App\Models\Pengguna;
use App\Models\RuangAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * MasterDataController — CRUD master (Guru, Kelas, Ruangan/Lab, Mapel).
 *
 * Issue #5: satu controller mengelola index (render halaman + props semua entity)
 * serta store/update/destroy per entity via route parameter {entity}.
 *
 * Catatan hubungan data:
 *  - Guru = 1:1 ke pengguna (shared PK guru.id = pengguna.id).
 *    Create: insert pengguna dulu, pakai id-nya untuk guru.
 *    Delete: hapus pengguna (FK cascadeOnDelete → guru terhapus otomatis;
 *            FK nullOnDelete pada mapel.guru_id / jadwal_ajaran.guru_id menangani dependen).
 *  - Ruang mapel/guru: FK ke labkom/guru bersifat nullable → boleh kosong.
 */
class MasterDataController extends Controller
{
    /** Entity tabs yang didukung (urutan tab di UI). */
    public const TABS = [
        'guru' => 'Guru',
        'kelas' => 'Kelas',
        'ruang' => 'Ruangan / Lab',
        'mapel' => 'Mata Pelajaran',
    ];

    /**
     * Render dashboard master data (tanpa entity) atau halaman per entity.
     * Dashboard tetap mengirim semua list agar ringkasan + test existing utuh.
     */
    public function index(?string $entity = null): Response
    {
        if ($entity === null) {
            return Inertia::render('MasterData/Index', [
                'tabs' => self::TABS,
                'guruList' => $this->guruList(),
                'kelasList' => $this->kelasList(),
                'ruangList' => $this->ruangList(),
                'mapelList' => $this->mapelList(),
                'formConfig' => $this->formConfig(),
                'success' => session('success'),
            ]);
        }

        $this->ensureEntity($entity);
        $listKey = $entity.'List';

        return Inertia::render('MasterData/'.ucfirst($entity).'/Index', [
            'tabs' => self::TABS,
            $listKey => $this->{$listKey}(),
            'formConfig' => $this->formConfig(),
            'success' => session('success'),
        ]);
    }

    public function store(Request $request, string $entity)
    {
        $this->ensureEntity($entity);
        $validated = $request->validate($this->rules($entity));
        $this->createRecord($entity, $validated);

        return redirect("/master-data/{$entity}")->with('success', ucfirst($entity).' berhasil ditambahkan.');
    }

    public function update(Request $request, string $entity, $id)
    {
        $this->ensureEntity($entity);
        $validated = $request->validate($this->rules($entity, (int) $id));
        $this->updateRecord($entity, $id, $validated);

        return redirect("/master-data/{$entity}")->with('success', ucfirst($entity).' berhasil diperbarui.');
    }

    public function destroy(Request $request, string $entity, $id)
    {
        $this->ensureEntity($entity);
        $this->deleteRecord($entity, $id);

        return redirect("/master-data/{$entity}")->with('success', ucfirst($entity).' berhasil dihapus.');
    }

    /** Abort 404 bila entity bukan tab yang didukung. */
    protected function ensureEntity(string $entity): void
    {
        if (! array_key_exists($entity, self::TABS)) {
            abort(404);
        }
    }

    // ------------------------------------------------------------------
    // List helpers (kirim ke UI sebagai props tabel).
    // ------------------------------------------------------------------
    protected function guruList(): array
    {
        return Guru::query()
            ->with('pengguna')
            ->orderBy('id')
            ->get(['id', 'nip', 'jabatan'])
            ->map(fn (Guru $g) => [
                'id' => $g->id,
                'nama' => $g->pengguna?->nama ?? '-',
                'nip' => $g->nip,
                'jabatan' => $g->jabatan,
            ])
            ->values()
            ->all();
    }

    protected function kelasList(): array
    {
        return Kelas::query()
            ->orderBy('nama_kelas')
            ->get(['id', 'nama_kelas', 'tingkat', 'tahun_ajaran'])
            ->map(fn (Kelas $k) => [
                'id' => $k->id,
                'nama_kelas' => $k->nama_kelas,
                'tingkat' => $k->tingkat,
                'tahun_ajaran' => $k->tahun_ajaran,
            ])
            ->values()
            ->all();
    }

    protected function ruangList(): array
    {
        return RuangAjaran::query()
            ->with('labkom.lokasi')
            ->orderBy('id')
            ->get(['id', 'labkom_id', 'nama_ruangan', 'kapasitas'])
            ->map(fn (RuangAjaran $r) => [
                'id' => $r->id,
                'nama_ruangan' => $r->nama_ruangan ?? 'Ruangan '.$r->id,
                'kapasitas' => $r->kapasitas,
                'labkom_id' => $r->labkom_id,
                'labkom_label' => $r->labkom?->lokasi?->nama_lokasi,
            ])
            ->values()
            ->all();
    }

    protected function mapelList(): array
    {
        return Mapel::query()
            ->with('guru.pengguna')
            ->orderBy('nama_mapel')
            ->get(['id', 'kode_mapel', 'nama_mapel', 'kelompok', 'guru_id'])
            ->map(fn (Mapel $m) => [
                'id' => $m->id,
                'kode_mapel' => $m->kode_mapel,
                'nama_mapel' => $m->nama_mapel,
                'kelompok' => $m->kelompok,
                'guru_id' => $m->guru_id,
                'guru_nama' => $m->guru?->pengguna?->nama,
            ])
            ->values()
            ->all();
    }

    protected function labkomList(): array
    {
        return Labkom::query()
            ->with('lokasi')
            ->orderBy('id')
            ->get(['id', 'lokasi_id', 'total_komputer'])
            ->map(fn (Labkom $l) => [
                'id' => $l->id,
                'label' => $l->lokasi?->nama_lokasi ?? ('Labkom '.$l->id),
            ])
            ->values()
            ->all();
    }

    // ------------------------------------------------------------------
    // Form config — UI me-render input secara data-driven.
    // ------------------------------------------------------------------
    protected function formConfig(): array
    {
        $labkomOpts = array_map(fn ($l) => ['value' => $l['id'], 'label' => $l['label']], $this->labkomList());
        array_unshift($labkomOpts, ['value' => '', 'label' => '- ruangan manual (tanpa labkom) -']);

        $guruOpts = array_map(fn ($g) => ['value' => $g['id'], 'label' => $g['nama']], $this->guruList());
        array_unshift($guruOpts, ['value' => '', 'label' => '- tidak pilih -']);

        return [
            'guru' => [
                ['name' => 'nama',      'label' => 'Nama Lengkap', 'type' => 'text',   'required' => true],
                ['name' => 'nip',       'label' => 'NIP',          'type' => 'text',   'required' => true, 'unique' => 'guru.nip'],
                ['name' => 'jabatan',   'label' => 'Jabatan',      'type' => 'text'],
            ],
            'kelas' => [
                ['name' => 'nama_kelas',    'label' => 'Nama Kelas',     'type' => 'text', 'required' => true],
                ['name' => 'tingkat',       'label' => 'Tingkat',        'type' => 'text'],
                ['name' => 'tahun_ajaran',  'label' => 'Tahun Ajaran',   'type' => 'text'],
            ],
            'ruang' => [
                ['name' => 'nama_ruangan', 'label' => 'Nama Ruangan', 'type' => 'text', 'required' => true],
                ['name' => 'kapasitas',    'label' => 'Kapasitas',    'type' => 'number'],
                ['name' => 'labkom_id',    'label' => 'Labkom',       'type' => 'select', 'nullable' => true, 'options' => $labkomOpts],
            ],
            'mapel' => [
                ['name' => 'kode_mapel',  'label' => 'Kode Mapel',  'type' => 'text',   'required' => true, 'unique' => 'mapel.kode_mapel'],
                ['name' => 'nama_mapel',  'label' => 'Nama Mapel',  'type' => 'text',   'required' => true],
                ['name' => 'kelompok',    'label' => 'Kelompok',    'type' => 'select', 'options' => [
                    ['value' => '',        'label' => '- pilih kelompok -'],
                    ['value' => 'wajib',    'label' => 'Wajib'],
                    ['value' => 'pilihan',  'label' => 'Pilihan'],
                    ['value' => 'praktik',  'label' => 'Praktik'],
                ]],
                ['name' => 'guru_id',     'label' => 'Guru (opsional)', 'type' => 'select', 'nullable' => true, 'options' => $guruOpts],
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Validation rules per entity (unique di‑ignore saat edit).
    // ------------------------------------------------------------------
    protected function rules(string $entity, ?int $id = null): array
    {
        return match ($entity) {
            'guru' => [
                'nama' => ['required', 'string', 'max:255'],
                'nip' => ['required', 'string', 'max:50', Rule::unique('guru', 'nip')->ignore($id)],
                'jabatan' => ['nullable', 'string', 'max:255'],
            ],
            'kelas' => [
                'nama_kelas' => ['required', 'string', 'max:255'],
                'tingkat' => ['nullable', 'string', 'max:50'],
                'tahun_ajaran' => ['nullable', 'string', 'max:50'],
            ],
            'ruang' => [
                'nama_ruangan' => ['required', 'string', 'max:255'],
                'kapasitas' => ['nullable', 'integer', 'min:1'],
                'labkom_id' => ['nullable', 'integer', 'exists:labkom,id'],
            ],
            'mapel' => [
                'kode_mapel' => ['required', 'string', 'max:20', Rule::unique('mapel', 'kode_mapel')->ignore($id)],
                'nama_mapel' => ['required', 'string', 'max:255'],
                'kelompok' => ['nullable', 'in:wajib,pilihan,praktik'],
                'guru_id' => ['nullable', 'integer', 'exists:guru,id'],
            ],
            default => [],
        };
    }

    // ------------------------------------------------------------------
    // Persisten­ce per entity (wrapped dalam transaction).
    // ------------------------------------------------------------------
    protected function createRecord(string $entity, array $v): void
    {
        DB::transaction(function () use ($entity, $v) {
            match ($entity) {
                'guru' => (function () use ($v) {
                    $penggunaId = Pengguna::query()->insertGetId([
                        'tipe' => 'guru',
                        'nama' => $v['nama'],
                        'status_aktif' => 'aktif',
                    ]);
                    Guru::query()->insert([
                        'id' => $penggunaId,
                        'nip' => $v['nip'],
                        'jabatan' => $v['jabatan'] ?? null,
                    ]);
                })(),
                'kelas' => Kelas::query()->create([
                    'nama_kelas' => $v['nama_kelas'],
                    'tingkat' => $v['tingkat'] ?? null,
                    'tahun_ajaran' => $v['tahun_ajaran'] ?? null,
                ]),
                'ruang' => RuangAjaran::query()->create([
                    'labkom_id' => empty($v['labkom_id']) ? null : (int) $v['labkom_id'],
                    'nama_ruangan' => $v['nama_ruangan'],
                    'kapasitas' => empty($v['kapasitas']) ? null : (int) $v['kapasitas'],
                ]),
                'mapel' => Mapel::query()->create([
                    'kode_mapel' => $v['kode_mapel'],
                    'nama_mapel' => $v['nama_mapel'],
                    'kelompok' => in_array($v['kelompok'] ?? null, ['wajib', 'pilihan', 'praktik']) ? $v['kelompok'] : 'wajib',
                    'guru_id' => empty($v['guru_id']) ? null : (int) $v['guru_id'],
                ]),
            };
        });
    }

    protected function updateRecord(string $entity, $id, array $v): void
    {
        DB::transaction(function () use ($entity, $id, $v) {
            match ($entity) {
                'guru' => (function () use ($id, $v) {
                    DB::table('pengguna')->where('id', $id)->update(['nama' => $v['nama']]);
                    Guru::query()->where('id', $id)->update([
                        'nip' => $v['nip'],
                        'jabatan' => $v['jabatan'] ?? null,
                    ]);
                })(),
                'kelas' => Kelas::query()->where('id', $id)->update([
                    'nama_kelas' => $v['nama_kelas'],
                    'tingkat' => $v['tingkat'] ?? null,
                    'tahun_ajaran' => $v['tahun_ajaran'] ?? null,
                ]),
                'ruang' => RuangAjaran::query()->where('id', $id)->update([
                    'labkom_id' => empty($v['labkom_id']) ? null : (int) $v['labkom_id'],
                    'nama_ruangan' => $v['nama_ruangan'],
                    'kapasitas' => empty($v['kapasitas']) ? null : (int) $v['kapasitas'],
                ]),
                'mapel' => Mapel::query()->where('id', $id)->update([
                    'kode_mapel' => $v['kode_mapel'],
                    'nama_mapel' => $v['nama_mapel'],
                    'kelompok' => in_array($v['kelompok'] ?? null, ['wajib', 'pilihan', 'praktik']) ? $v['kelompok'] : 'wajib',
                    'guru_id' => empty($v['guru_id']) ? null : (int) $v['guru_id'],
                ]),
            };
        });
    }

    protected function deleteRecord(string $entity, $id): void
    {
        DB::transaction(function () use ($entity, $id) {
            match ($entity) {
                // Hapus pengguna → FK cascadeOnDelete mengapus baris guru;
                // FK nullOnDelete pada mapel.guru_id / jadwal_ajaran.guru_id
                // menangani dependen yang ada.
                'guru' => DB::table('pengguna')->where('id', $id)->delete(),
                'kelas' => Kelas::query()->where('id', $id)->delete(),
                'ruang' => RuangAjaran::query()->where('id', $id)->delete(),
                'mapel' => Mapel::query()->where('id', $id)->delete(),
            };
        });
    }
}
