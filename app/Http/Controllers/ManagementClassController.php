<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\JadwalAjaran;
use App\Models\JadwalPinjaman;
use App\Models\Kelas;
use App\Models\Guru;
use App\Models\RuangAjaran;
use App\Models\Mapel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ManagementClassController extends Controller
{
    /**
     * Props master: kelas, ruang, guru + koleksi jadwal (recurring/one-time).
     * Join relasi di sisi server supaya React tidak query per-row (N+1).
     */
    public function index(): Response
    {
        $kelasList = Kelas::query()
            ->orderBy('id')
            ->get(['id', 'nama_kelas'])
            ->map(fn ($k) => ['id' => $k->id, 'nama' => $k->nama_kelas]);

        $ruangList = RuangAjaran::query()
            ->with('labkom.lokasi')
            ->orderBy('id')
            ->get(['id', 'labkom_id', 'nama_ruangan'])
            ->map(fn ($r) => [
                'id'    => $r->id,
                'label' => $r->nama_ruangan
                    ?? (($r->labkom->lokasi->nama_lokasi ?? 'Ruang') . ' ' . ($r->labkom->lokasi->id ?? '')),
            ]);

        $guruList = Guru::query()
            ->with('pengguna')
            ->orderBy('id')
            ->get(['id', 'nip'])
            ->map(fn ($g) => [
                'id'   => $g->id,
                'nama' => $g->pengguna->nama ?? 'Guru',
            ]);

        $recurring = JadwalAjaran::query()
            ->with(['kelas:id,nama_kelas', 'guru.pengguna', 'ruangAjaran.labkom.lokasi', 'mapel'])
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->get()
            ->map(function (JadwalAjaran $j) {
                return [
                    'id'            => $j->id,
                    'type'          => 'recurring',
                    'pj'            => $j->guru?->pengguna?->nama ?? '-',
                    'kelas'         => $j->kelas?->nama_kelas ?? '-',
                    'hari'          => $j->hari,
                    'jamMulai'      => $j->jam_mulai ? $j->jam_mulai->format('H:i') : null,
                    'jamSelesai'    => $j->jam_selesai ? $j->jam_selesai->format('H:i') : null,
                    'jumlahSiswa'   => $j->jumlah_siswa,
                    'alasan'        => $j->keterangan,
                    'telp'          => $j->no_telepon,
                    'ruangan'       => $j->ruangAjaran?->nama_ruangan
                        ?? $j->ruangAjaran?->labkom?->lokasi?->nama_lokasi,
                    'mapel'         => $j->mapel?->nama_mapel,
                ];
            });

        $pinjaman = JadwalPinjaman::query()
            ->with(['kelas:id,nama_kelas', 'peminjam', 'ruangAjaran.labkom.lokasi', 'mapel'])
            ->orderBy('tanggal')
            ->orderBy('jam_mulai')
            ->get()
            ->map(function (JadwalPinjaman $p) {
                $mulai = $p->tanggal?->toDateString() . 'T' . $p->jam_mulai?->format('H:i');
                $selesai = $p->tanggal?->toDateString() . 'T' . $p->jam_selesai?->format('H:i');
                return [
                    'id'            => $p->id,
                    'type'          => 'one-time',
                    'pj'            => $p->peminjam?->name ?? '-',
                    'kelas'         => $p->kelas?->nama_kelas ?? '-',
                    'tanggalMulai'  => $mulai,
                    'tanggalSelesai'=> $selesai,
                    'jumlahSiswa'   => $p->jumlah_siswa,
                    'alasan'        => $p->keterangan,
                    'telp'          => $p->no_telepon,
                    'ruangan'       => $p->ruangAjaran?->nama_ruangan
                        ?? $p->ruangAjaran?->labkom?->lokasi?->nama_lokasi,
                    'mapel'         => $p->mapel?->nama_mapel,
                ];
            });

        return Inertia::render('ManagementClass/Index', [
            'kelasList'  => $kelasList,
            'ruangList'  => $ruangList,
            'guruList'   => $guruList,
            'recurring'  => $recurring,
            'pinjaman'   => $pinjaman,
        ]);
    }

    /**
     * Simpan jadwal (recurring ke jadwal_ajaran, one-time ke jadwal_pinjaman).
     * D1: recurring PJ = guru_id; one-time peminjam = user login.
     */
    public function store(Request $request)
    {
        $validated = $this->validateSchedule($request);
        $type = $validated['type'];

        if ($type === 'recurring') {
            JadwalAjaran::create([
                'hari'           => $validated['hari'],
                'jam_mulai'      => $validated['jam_mulai'],
                'jam_selesai'    => $validated['jam_selesai'],
                'kelas_id'       => $validated['kelas_id'],
                'guru_id'        => $validated['guru_id'],
                'ruang_ajaran_id'=> $validated['ruang_ajaran_id'],
                'mapel_id'       => $validated['mapel_id'] ?? null,
                'jumlah_siswa'   => $validated['jumlah_siswa'] ?? null,
                'no_telepon'     => $validated['no_telepon'] ?? null,
                'keterangan'     => $validated['keterangan'] ?? null,
            ]);
        } else {
            $tanggal = $this->onlyDate($validated['tanggal_mulai']);
            $jamMulai = $this->onlyTime($validated['tanggal_mulai']);
            $jamSelesai = $this->onlyTime($validated['tanggal_selesai']);

            JadwalPinjaman::create([
                'mapel_id'        => $validated['mapel_id'] ?? null,
                'peminjam_user_id'=> $request->user()->id,
                'ruang_ajaran_id' => $validated['ruang_ajaran_id'],
                'kelas_id'        => $validated['kelas_id'],
                'tanggal'         => $tanggal,
                'jam_mulai'       => $jamMulai,
                'jam_selesai'     => $jamSelesai,
                'jumlah_siswa'    => $validated['jumlah_siswa'] ?? null,
                'no_telepon'      => $validated['no_telepon'] ?? null,
                'keterangan'      => $validated['keterangan'] ?? null,
            ]);
        }

        return redirect()->route('management-class');
    }

    /**
     * Update jadwal berdasarkan id + type (dikirim frontend).
     */
    public function update(Request $request, $schedule)
    {
        $validated = $this->validateSchedule($request);
        $type = $validated['type'];

        if ($type === 'recurring') {
            $model = JadwalAjaran::findOrFail($schedule);
            $model->update([
                'hari'            => $validated['hari'],
                'jam_mulai'       => $validated['jam_mulai'],
                'jam_selesai'     => $validated['jam_selesai'],
                'kelas_id'        => $validated['kelas_id'],
                'guru_id'         => $validated['guru_id'],
                'ruang_ajaran_id' => $validated['ruang_ajaran_id'],
                'mapel_id'        => $validated['mapel_id'] ?? null,
                'jumlah_siswa'    => $validated['jumlah_siswa'] ?? null,
                'no_telepon'      => $validated['no_telepon'] ?? null,
                'keterangan'      => $validated['keterangan'] ?? null,
            ]);
        } else {
            $model = JadwalPinjaman::findOrFail($schedule);
            $model->update([
                'mapel_id'        => $validated['mapel_id'] ?? null,
                'ruang_ajaran_id' => $validated['ruang_ajaran_id'],
                'kelas_id'        => $validated['kelas_id'],
                'tanggal'         => $this->onlyDate($validated['tanggal_mulai']),
                'jam_mulai'       => $this->onlyTime($validated['tanggal_mulai']),
                'jam_selesai'     => $this->onlyTime($validated['tanggal_selesai']),
                'jumlah_siswa'    => $validated['jumlah_siswa'] ?? null,
                'no_telepon'      => $validated['no_telepon'] ?? null,
                'keterangan'      => $validated['keterangan'] ?? null,
            ]);
        }

        return redirect()->route('management-class');
    }

    /**
     * Hapus jadwal. Frontend kirim `type` query param.
     */
    public function destroy(Request $request, $schedule)
    {
        $type = $request->query('type', 'recurring') === 'one-time'
            ? 'one-time' : 'recurring';

        if ($type === 'one-time') {
            JadwalPinjaman::where('id', $schedule)->delete();
        } else {
            JadwalAjaran::where('id', $schedule)->delete();
        }

        return redirect()->route('management-class');
    }

    /**
     * Validasi bersama recurring + one-time.
     * D3: recurring mapel_id nullable; D4: ruang + kelas wajib; waktu valid.
     */
    protected function validateSchedule(Request $request): array
    {
        $rules = [
            'type'            => ['required', Rule::in(['recurring', 'one-time'])],
            'kelas_id'        => ['required', 'integer', 'exists:kelas,id'],
            'ruang_ajaran_id' => ['required', 'integer', 'exists:ruang_ajaran,id'],
            'guru_id'         => ['nullable', 'integer', 'exists:guru,id'],
            'mapel_id'        => ['nullable', 'integer', 'exists:mapel,id'],
            'jumlah_siswa'    => ['nullable', 'integer', 'min:1', 'max:100'],
            'no_telepon'      => ['nullable', 'string', 'max:20'],
            'keterangan'      => ['nullable', 'string'],
            // recurring
            'hari'         => ['nullable', 'in:senin,selasa,rabu,kamis,jumat,sabtu,minggu'],
            'jam_mulai'    => ['nullable', 'date_format:H:i'],
            'jam_selesai'  => ['nullable', 'date_format:H:i', 'after:jam_mulai'],
            // one-time
            'tanggal_mulai'  => ['nullable', 'date_format:Y-m-d\TH:i'],
            'tanggal_selesai'=> ['nullable', 'date_format:Y-m-d\TH:i', 'after:tanggal_mulai'],
        ];

        return $request->validate($rules);
    }

    /** Extrai tanggal (Y-m-d) dari datetime-local value. */
    protected function onlyDate(?string $dt): ?string
    {
        return $dt ? substr($dt, 0, 10) : null;
    }

    /** Extrai jam (H:i) dari datetime-local value. */
    protected function onlyTime(?string $dt): ?string
    {
        return $dt ? substr($dt, 11, 5) : null;
    }
}
