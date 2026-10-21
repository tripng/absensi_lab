# plan.md — Enrollment History untuk Siswa (`siswa` ↔ `kelas` per tahun ajaran)

> Scope: **bisa dibaca, jangan ubah file**. Deliverable = file `plan.md` ini saja. Setiap tugas di bawah boleh di-commit satu per satu **setelah** hijau pada §6 *Tugas verifikasi* dan melewati lint AGENT.md (jalankan `./vendor/bin/pint` dulu, lalu commit).

## Ringkasan fakta eksisting (dibaca langsung, bukan rekayangan)
- DB: MySQL `absensi_lab` @ `127.0.0.1:3306`, user `absensi` (lihat `.env`).
- `php artisan migrate:fresh --seed` → `DatabaseSeeder` → `MasterTablesSeeder` (lokasi, kelas X.1–X.15, labkom, guru, ruang_ajaran, mapel, user admin). **Tidak ada `siswa` di-seed** — student masuk lewat kiosk RFID eksternal (`master_schema_restore.sql:2`, `"dari presensi_rfid.db → MySQL"`).
- `siswa` (`id`→`pengguna`, `nisn`, `tahun_masuk`, **`kelas_id`→kelas.id nullable / `ON DELETE SET NULL`**) — hanya **satu kelas saat ini**, tidak ada riwayat. Model `Siswa.php` ada (belongsTo `kelas`/`pengguna`).
- `kelas` (`id`, `nama_kelas`, `tingkat`, `tahun_ajaran` **TEXT bebas, bukan FK**).
- `v_scan_lookup` view + `AbsensiController` membaca `siswa.kelas_id` untuk kelas aktif → kolom ini **jangan dihapus/di‑alter**.
- Tidak ada tabel/model/controller/UI untuk `academic_years`, `student_enrollments`, atau manajemen siswa.
- Auth = tabel `users` / model `User` (Breeze). Route penting pakai `Route::middleware('auth')->group(...)` (`routes/web.php:25,37,50`).
- `MasterDataTest` pola: `beforeEach` → `artisan('db:seed', ['--class' => MasterTablesSeeder::class])`; login via `User::factory()->create(['email'=>'admin@absensi.test'])` + `actingAs($admin)`.
- AGENT.md rule 2: *"Jangan ubah skema database — jangan tambah, modifikasi, atau hapus migration yang sudah ada. Ingin skema baru? buat migration baru, jangan edit yang lama."* → **migration baru DI PERBOLEHKAN**; migration existing tidak disentuh.

### Mapping: contoh schema (user) ↔ skema eksisting
| Tabel contoh user | Eksisting? | Keputusan |
|---|---|---|
| `students(id, nis, name)` | ada `siswa(id, nisn, …) + pengguna(nama)` | **Reuse `siswa` + `pengguna`** (`nisn` ≠ `nis`). Jangan buat `students`. |
| `classes(grade, number, name, academic_year_id)` | ada `kelas(nama_kelas, tingkat, tahun_ajaran)` | **Reuse `kelas`**; `tahun_ajaran` tetap TEXT, tidak di‑alter. |
| `academic_years(name, start, end, is_active)` | **tidak ada** | **CREATE** table baru. |
| `student_enrollments(student_id, class_id, academic_year_id, status)` | **tidak ada** | **CREATE** table baru. |

---

## 1. Tujuan
Menambahkan kemampuan **riwayat penempatan kelas siswa per tahun ajaran** dengan membuat tabel `academic_years` + `student_enrollments` (migration baru) serta halaman manajemen Inertia `/student-enrollments` untuk mencatat perubahan kelas / promosi (active → promoted → retained → graduated/transferred/dropped), **tanpa menambah dependency**, **tanpa mengubah migrasi atau tabel yang ada** — hanya menambah tabel baru dan menyelaraskan `siswa.kelas_id` (kelas‑saat‑ini) sebagai propagasi dari enrollment aktif. Contoh schema user disesuaikan ke tabel `siswa`/`kelas` yang sudah ada (lihat tabel mapping).

## 2. Keputusan yang dikunci
| # | Pertukaran | Keputusan | Alasan |
|---|------------|-----------|--------|
| D1 | "jangan ubah skema" vs "buat DB enrollment" | **Migration baru** untuk 2 tabel; migration existing tidak disentuh | AGENT.md rule 2: skema baru → migration baru. |
| D2 | PK / tipe kolom FK | `integer('id', true)` = **int(11) SIGNED AI**; FK `integer` signed — konsisten konvensi master‑tables migration | FK ke `siswa.id`/`kelas.id` (int(11) signed) tak akan mismatch. |
| D3 | `status` | `VARCHAR(20)` default `'active'`; nilai: `active, promoted, retained, graduated, transferred, dropped` (sama persis contoh user) | Ikut spek. |
| D4 | Integritas 1‑siswa‑1‑kelas‑per‑tahun | `UNIQUE(student_id, academic_year_id)` diterapkan | Ikut spek. |
| D5 | `siswa.kelas_id` (kelas aktif) — **Jawaban user: YES** | Controller **sync**: set `siswa.kelas_id = class_id` dari enrollment terbaru bertipe `active` (atau `promoted`); bila tak ada lagi enrollment aktif, set `NULL`. Dilakukan di‑aplikasi, bukan schema; `v_scan_lookup`/Absensi tetap konsisten. | Kolom ini dipakai query absensi → jangan dibiarkan rusak. |
| D6 | Konsistensi `kelas.tahun_ajaran` ↔ `academic_years.name` | Validasi **aplikasi** (controller): `kelas.tahun_ajaran` harus sama dengan `academic_years.name` pada store/update. Tidak paksa FK | `kelas.tahun_ajaran` TEXT, tidak boleh di‑alter. |
| D7 | Status `retained` (tinggal) | **Manual** — controller tidak otomatis generate enrollment tahun berikutnya. **(Jawaban user: manual)** | Hindari logika otomatisasi belum dimintai. |
| D8 | Student lookup di form | Dropdown `siswa` yang sudah ada (join `pengguna.nama` + `siswa.nisn`/`tahun_masuk`). **Tidak ada CRUD siswa** (kiosk eksternal). Butuh sample seed student agar UI dapat dipakai lokal. **(Jawaban user: hanya pilih existing)** | Konsisten sumber data RFID kiosk. |
| D9 | Flash `success` | Ikut pola master-data/login: `MasterDataController` (referensi) dan `Login.jsx` memakai `'success' => session('success')` / `'status' => session('status')`; enrollment controller `index()` kirim `'success' => session('success')`, page render banner hijau. | Konsisten dengan pola yang ada. |
| D10 | Halaman | **Page terpisah** `StudentEnrollments/Index.jsx` + route `/student-enrollments`, **bukan** tab baru di master-data | Lingkup terisolasi; master-data sudah final. |
| D11 | Navbar link | **Tidak** menyentuh layout; link ke `/student-enrollments` dibuatkan bila ada tugas terpisah — luar siklus ini. |
| D8b | `kelas` unique per tahun | **Tidak** menambah UNIQUE. `tahun_ajaran` beda → baris `kelas` berbeda. **(Jawaban user: tidak perlu unique)** | Tetap valid karena FK ke `kelas.id`. |

## 3. File yang boleh diubah / dibuat
**Baru (NEW):**
- `database/migrations/2026_10_20_000001_create_academic_years_and_student_enrollments_table.php`
- `app/Models/AcademicYear.php`
- `app/Models/StudentEnrollment.php`
- `app/Http/Controllers/StudentEnrollmentController.php`
- `resources/js/Pages/StudentEnrollments/Index.jsx`
- `database/seeders/StudentEnrollmentSeeder.php`
- `tests/Feature/StudentEnrollmentTest.php`
- `tests/verify-enrollment.mjs` (Playwright; jalankan setelah `php artisan serve --port=8000`)

**Diedit (hanya yang tercantum di sini):**
- `routes/web.php` — tambah grup `Route::middleware('auth')` untuk `/student-enrollments` (index/post/put/delete), pola sama `master-data`.
- `database/seeders/DatabaseSeeder.php` — panggil `StudentEnrollmentSeeder` (hanya +1 baris).

## 4. File yang TIDAK boleh diubah
- Migrasi ada: `2026_10_09_000001_create_master_tables.php`, `2026_10_10_*`, `2026_10_15_*`, `0001_*`, `2026_10_08_*`.
- `database/master_schema_restore.sql`
- `database/seeders/MasterTablesSeeder.php` (buat seeder baru, jangan echo)
- `app/Models/Siswa.php`, `Kelas.php`, `Guru.php`, `Pengguna.php`, `User.php`, `RuangAjaran.php`, `Mapel.php`, `Labkom.php`, `Lokasi.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `resources/js/Pages/MasterData/*`, `ManagementClass/*`, `Absensi/*`, `Auth/*`
- `routes/auth.php`
- `composer.json`, `package.json`, `AGENT.md`
- `vite.config.js`, `tailwind.config.js`, `resources/views/app.blade.php`, `resources/css/app.css`
- `public/build/*`, `vendor/*`, `node_modules/*`

## 5. Tugas atomik (5 tugas; masing‑masih satu commit)
| # | Commit | Lingkup file | Deskripsi |
|---|--------|--------------|-----------|
| 1 | `feat(enrollment): add academic_years + student_enrollments schema + models` | migration baru, `AcademicYear.php`, `StudentEnrollment.php` | 2 tabel (PK int(11) signed AI); FK `student_id→siswa`, `class_id→kelas`, `academic_year_id→academic_years`; `status` enum default `active`; `UNIQUE(student_id, academic_year_id)`; timestamps. Model: `$fillable`, `$casts`, relasi belongTo. |
| 2 | `feat(enrollment): StudentEnrollmentController + /student-enrollments CRUD UI` | `StudentEnrollmentController.php`, `Pages/StudentEnrollments/Index.jsx`, `routes/web.php` | Guest → redirect `/login`. `index`: prop `enrollments` (join nama siswa + kelas + year, urut `created_at` desc) + `academicYears` + `students`; flash `success`. `store`: validasi `student_id|class_id|academic_year_id|status` + D6 (konsistensi tahun ajaran) + D5 (sync `siswa.kelas_id` bila `active`). `update`/`destroy` serupa; destroy forbidden bila ada enrollment aktif lain (politik hapus — lihat Q terbuka). UI: tabel riwayat, filter per siswa, modal create/edit, flash banner (D9). |
| 3 | `feat(enrollment): seed academic_years + sample student + history` | `StudentEnrollmentSeeder.php` (NEW), `DatabaseSeeder.php` (edit) | 2 academic_years (`2026/2027` aktif, `2027/2028`); 2 sample siswa (pengguna tipe siswa + siswa nisn/tahun_masuk/kelas_id); ≥2 enrollment (mis. siswa A: kelas X.1 / 2026/2027 *promoted*). Jalankan `php artisan db:seed --class=StudentEnrollmentSeeder`. |
| 4 | `test(enrollment): Pest feature tests for StudentEnrollmentController` | `tests/Feature/StudentEnrollmentTest.php` (NEW) | Mirror `MasterDataTest`: `beforeEach` seed `MasterTablesSeeder` + `StudentEnrollmentSeeder`; `makeMasterAdmin()` via `User::factory()`. Asersi: (a) guest → 302 `/login`; (b) `assertInertia has('success'/'enrollments'/'academicYears'/'students')`; (c) store valid; (d) status invalid → 422 errors; (e) duplicate student+year → gagal; (f) FK invalid → gagal; (g) update status (promote/graduate) + `siswa.kelas_id` sync terukur; (h) destroy; (i) `assertDatabaseHas('student_enrollments')`. |
| 5 | `test(enrollment): Playwright e2e verify script` | `tests/verify-enrollment.mjs` (NEW) | Headless chromium: login → buka `/student-enrollments` → assert tabel riwayat seed terlihat → buat enrollment → assert flash "berhasil" → isi kosong → assert error → filter per siswa → history persisten. Target `http://127.0.0.1:8000` (butuh `php artisan serve --port=8000` + `npm run dev`). |

## 6. Tugas verifikasi (perintah persis — jalankan berurutan)
```bash
# Pre-flight
php artisan config:clear

# 1. Format PHP (harus 0 diff)
./vendor/bin/pint --test        # cek dulu
./vendor/bin/pint               # apply (sebelum commit)

# 2. Frontend build
npm run build                   # → public/build/

# 3. Pest backend (setelah task 1–4 selesai)
php artisan test --filter=StudentEnrollmentTest   # hijau, >=9 test
php artisan test                # full suite hijau (regression)

# 4. Seed data contoh (untuk dev/UI)
php artisan db:seed --class=StudentEnrollmentSeeder

# 5. UI end-to-end (setelah task 5 selesai)
php artisan serve --port=8000 &          # background
npm run dev &                            # Vite :5173 (refresh:true → HMR iframe, dev-only)
node tests/verify-enrollment.mjs         # EXPECTED: OVERALL: PASS; flash ✅; field-id ✅; history ✅
# lalu: hentikan server & vite

# 6. Konfirmasi tidak ada migration existing yang berubah
git status --porcelain database/migrations/    # hanya migration BARU
```
**Output yang diantisipasikan:** `StudentEnrollmentTest: >=9 passed`; `npm run build: built in ~2.8s`; `verify-enrollment.mjs: OVERALL PASS`.

### Yang **TIDAK** bisa diverifikasi otomatis (jujur, per AGENT.md rule 5)
- Live kiosk RFID / data historis student pre‑enrollment → **TIDAK DIJALANKAN** (sistem eksternal `presensi_rfid.db`; tidak dapat diprovisi di lingkungan dev). Hanya sample seed yang dapat diuji.
- **Tidak ada ESLint/Prettier** (AGENT.md:30) → JS/TS error hanya terlihat pada `npm run build`.
- Vite dev `refresh: true` → HMR iframe `srcdoc` menyaring klik di `npm run dev` (**dev‑only**, hilang di build production). Bukan bug enrollment; dibiarkan.

## 7. Di luar cakupan
- **CRUD siswa terpisah / `StudentController`** — ditiadakan (user: hanya pilih existing). Luar siklus ini.
- **Link navigasi Navbar/Topbar** ke `/student-enrollments` — tidak disentuh (lihat D11).
- **Modifikasi `kelas.tahuan_ajaran`** (TEXT→FK) — melanggar aturan skema. Substitusi: validasi app-level (D6) + tidak‑unique (D8b).
- **Migrasi data historis student lama → enrollment** — tidak ada data riwayat di DB saat ini (`siswa.kelas_id` hanya 1 kelas). Butuh source eksternal. Luar siklus ini.
- **Vite dev HMR iframe** (`vite.config.js` `refresh:true`) — artefak dev global, bukan bug master-data/enrollment.
- **Deployment Hostinger** — tidak disentuh.
- **MasterData / ManagementClass / Absensi / Auth** — tidak disentuh.

## Pertanyaan terbuka (belum keputian akhir — minta keputusan user)
1. **Hapus/soft‑delete enrollment yang ada kelas aktif di `siswa.kelas_id`?** Saya belum memutuskan `destroy` policy (bisa soft‑delete `deleted_at` atau hapus keras). **Keputusan yang kecil**: rekomendasikan **hapus keras + cek dulu** — tolak destroy bila enrollment yang dihapus adalah satu‑satu‑nya `active` dan `siswa.kelas_id` masih merujuk ke kelas itu (atau recompute kelas_id setelahnya). Konfirmasi pilih mana: (a) hapus keras, (b) soft delete, (c) blokir destroy bila ada kaitan.
2. **Apakah halaman enrollment butuh ekspor CSV (mirip `DataController::export`)?** Lihat `routes/web.php:23` pola export. Jika ya → task tambahan. Jika tidak → luar siklus (D11).
3. **Konsistensi tahun ajaran dengan `kelas.tahun_ajaran` (TEXT)** saat user memilih kombinasi kelas+year yang tidak cocok — rekam `warning` di UI, atau tolak submit (D6 hard fail)? Saya rekomendasikan hard fail (lebih aman); konfirmasi.

---
*Dokumen ini dibuat dari pembacaan langsung: `AGENT.md`, `routes/web.php`, `routes/auth.php`, `tests/Pest.php`, `tests/Feature/MasterDataTest.php` (kepala), `database/migrations/2026_10_09_000001_create_master_tables.php`, `database/master_schema_restore.sql`, `app/Models/{Siswa,Kelas}.php`, `database/seeders/MasterTablesSeeder.php`. **Tidak ada file proyek yang diubah** untuk menghasilkan plan ini.*
