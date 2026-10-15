# Planning Issue — Database untuk /management-class (Manajemen Jadwal Lab)

## 1. Konteks & Status Sekarang
- `/management-class` (commit `b7782c4`) masih **UI-only**: `ManagementClassController::index()` hanya `Inertia::render('ManagementClass/Index')` tanpa props; data jadwal pakai *mock state* di client (`initialSchedules`).
- Halaman ada **2 kategori**:
  1. **Jadwal Berulang** (recurring) — Senin–Jumat, berulang mingguan.
  2. **Jadwal Pinjaman** (one-time) — peminjaman satu kali dengan rentang tanggal & jam.
- Kami butuh: tampilkan, buat, edit, hapus jadwal — terhubung ke tabel master (kelas, ruang lab, guru, mapel, user).

## 2. Skema yang Sudah Ada (JANGAN dibuat ulang)
Dibuat pada commit `fdabfa3` (migrasi `2026_10_10_000001_create_mata_pelajaran_jadwal.php`). Semua sudah deployed di MySQL `absensi_lab@127.0.0.1:3306`.

| Tabel | PK | Kolom penting | Relasi |
|---|---|---|---|
| `kelas` | id int(11) | nama_kelas, tingkat, tahun_ajaran | — (isi: X.1 .. X.15) |
| `pengguna` | id int(11) | tipe (siswa/guru), nama, foto_path, status_aktif | master |
| `guru` | id int(11) | nip, jabatan | → pengguna.id (1:1) |
| `siswa` | id int(11) | nisn, kelas_id | → pengguna.id, → kelas.id |
| `labkom` | id int(11) | total_komputer, jumlah_baris, jumlah_kolom | → lokasi.id |
| `lokasi` | id int(11) | nama_lokasi, jenis (gerbang/lab/kelas/lainnya) | — |
| `ruang_ajaran` | id bigint| labkom_id (UNQ), nama_ruangan, kapasitas | → labkom.id |
| `mapel` | id bigint | kode_mapel, nama_mapel, kelompok (wajib/pilihan/praktik), guru_id | → guru.id |
| `users` | id bigint| name, email, password | Laravel auth (login) |
| `jadwal_ajaran` | id bigint | hari, jam_ke, mapel_id, ruang_ajaran_id, kelas_id, guru_id | recurring **SUDAH ADA** |
| `jadwal_pinjaman` | id bigint | mapel_id, peminjam_user_id, ruang_ajaran_id, tanggal, jam_mulai, jam_selesai, keterangan | one-time **SUDAH ADA** |

> Model Eloquent belum ada untuk kelas/guru/ruang_ajaran/mapel/pengguna (hanya `User` + `LogAkses`). Sebagx controller pakai `DB::table`. Rekomendasi: buat model + relasi sekalian.

## 3. Pemetaan UI ↔ Database
Field yang tampil / diinput di UI (lihat `InitialSchedules.jsx` + `ScheduleCard.jsx` + `ScheduleForm.jsx`):

| Field UI | recurring | one-time | Ada di tabel? |
|---|---|---|---|
| `pj` (Nama Penanggung Jawab, *free text*) | ya | ya | ❌ — tabel butuh FK |
| `kelas` (dropdown) | ya | ya | ✅ `kelas.id` (recurring ada; pinjaman **tidak ada**) |
| `hari` | ya | — | ✅ `jadwal_ajaran.hari` |
| `jamMulai`/`jamSelesai` | ya (TIME) | — |
| `tanggalMulai`/`tanggalSelesai` | — | ya (datetime) | ✅ pinjaman: `tanggal`+`jam_mulai`+`jam_selesai` |
| `jumlahSiswa` | ya | ya | ❌ butuh kolom baru |
| `alasan` | ya | ya | ❌ recurring tidak ada (pinjaman ada `keterangan`) |
| `telp` | ya | ya | ❌ butuh kolom baru |
| `ruangan`/`lab` | — | — | ❌ UI belum ada, tapi `ruang_ajaran_id` wajib — **gap penting** |

## 4. Gap Analysis (DB changes yang diperlukan)
Tabel sudah ada dan sudah relasi ke kelas/guru/labkom/ruang_ajaran/users. Namun field UI belum seluruhnya mappet, dan UI several field penting belum ada. Kebutuhan DB:

1. **Kolom baru di `jadwal_ajaran` (recurring):**
   - `jam_mulai` TIME, `jam_selesai` TIME → menggantikan/melengkapi `jam_ke`.
   - `jumlah_siswa` smallInteger
   - `no_telepon` varchar(20)
   - `keterangan` text (untuk `alasan`)
2. **Kolom baru di `jadwal_pinjaman` (one-time):**
   - `kelas_id` → kelas.id (card tampilkan kelas, tapi tabel belum punya FK ini)
   - `jumlah_siswa` smallInteger
   - `no_telepon` varchar(20)
   - `keterangan` sudah ada — dipakai untuk `alasan` (cukup)
3. **Form harus menambahkan pemilihan ruangan/lab** (pilih dari `ruang_ajaran`, value = `ruang_ajaran.id`). Tanpa ini `ruang_ajaran_id` tidak terpenuhi → ini *Manajemen Jadwal Lab*, jadi pilih lab saat booking.

## 5. Migration Baru (satu file)
Nama: `2026_10_15_000001_alter_jadwal_for_management_class.php` — gunakan `Schema::table` (bukan `create`), urutan `down()` kembalikan kolom.

**Jalankan setelah memutuskan D1–D4 di bawah.**

## 6. Keputusan Desain (flag ke junior dev)
- **D1 — Perekan `PJ` ke FK, bukan free text:**
  - recurring → `guru_id` (dropdown guru, tampilkan `pengguna.nama`).
  - one-time → `peminjam_user_id` = user yang login (peminjam). Tampilkan `users.name`.
  - Ganti input bebas `pj` dengan *selector*. (Jika tetap mau free text, tambah kolom `penanggung_jawab` text — tapi `guru_id`/`peminjam_user_id` jadi tidak terpakai.)
- **D2 — Model waktu recurring:** tambah `jam_mulai`/`jam_selesai` TIME; putuskan `jam_ke`: tidak dipakai kode manapun → **bisa di-drop** (atau dibiarkan nullable). Tambah constraint `jam_mulai < jam_selesai`.
- **D3 — `mapel` pada recurring:** UI tidak pilih mapel. Opsi A (rekomendasi): `mapel_id` jadil **nullable**, `guru_id` tetap dipakai sebagai PJ. Opsi B: tambahkan picker mapel di form.
- **D4 — Ruang/lab:** form wajib pilih `ruang_ajaran` (label = nama labkom-backed atau `nama_ruangan`). Ini "lab" yang dibooking. List diprops dari controller.
- **D5 — Auth route:** `/management-class` saat ini **tanpa middleware auth**. `peminjam_user_id` butuh user login → tambahkan middleware `auth` pada route ini.

## 7. Controller / Endpoint (ringkas, untuk referensi supaya tabel dipakai)
- `ManagementClassController::index()`: kirim props →
  - `kelasList` (dari tabel `kelas`), `ruangList` (dari `ruang_ajaran`, join `labkom`), `guruList` (dari `guru`+`pengguna`), dan
  - `recurring` = koleksi `jadwal_ajaran` join kelas/guru/ruang_ajaran; `pinjaman` = koleksi `jadwal_pinjaman` join kelas/users/ruang_ajaran/mapel.
- Endpoint create/update/delete (pilih salah satu): di `ManagementClassController` atau `ScheduleController` baru. Validasi: `kelas_id`, `ruang_ajaran_id` wajib ada; `jam_mulai < jam_selesai`; `tanggalMulai < tanggalSelesai`.

## 8. Frontend (catatan supaya DB dipakai benar)
- Ganti `kelasList` hardcoded `X1..X15` → dari props tabel `kelas`.
- Tambahkan dropdown `ruang_ajaran`; hapus input bebas `pj`, ganti selector `guru`/login-user.
- `ScheduleCard` tampilkan nama relasi (join di props), jangan query per-row (hindari N+1).
- Tab `recurring`/`one-time` → masing-masing tuliskan ke `jadwal_ajaran` / `jadwal_pinjaman`.

## 9. Acceptance / Verifikasi
- `php artisan migrate:fresh --seed` bersih di MySQL (`absensi_lab@127.0.0.1:3306`); data existing (kelas X.1..X.15, labkom, lokasi) tetap ada.
- Halaman `/management-class` listing data **riil** dari `jadwal_ajaran` + `jadwal_pinjaman`.
- Simpan jadwal → masuk ke tabel yang tepat; dropdown `kelas` & `ruang` terisi dari DB.
- FK integrity terjaga (tidak bisa simpan kelas/lab/guru tak valid).

## 10. Out of Scope
`log_akses`, `v_scan_lookup`, alur absensi — tidak disentuh. `jadwal_*` schema struktural dasar tidak diganti (hanya alter kolom).
