# plan.md — Pemisahan Halaman `/master-data` (Guru / Kelas / Ruangan / Mapel → 4 halaman)

> Scope: **bisa dibaca, jangan ubah file**. Deliverable = file `plan.md` ini saja. Setiap tugas atomik boleh di-commit **setelah** hijau pada §6 *Tugas verifikasi* + lolos `./vendor/bin/pint` (AGENT.md rule 4,5).

## Ringkasan fakta eksisting (baca langsung dari repo, bukan rekayangan)
- **Master-data masih monolit.** `resources/js/Pages/MasterData/Index.jsx` (baca: full read 328 lns) = satu halaman dengan tab state `activeTab` (`guru`/`kelas`/`ruang`/`mapel`), tabel + modal form (`MasterDataForm`, *inline* di dalam file yang sama, **bukan** komponen terpisah).
- **Backend generic‑dispatch sudah ada & teruji.** `MasterDataController` (`baca: full read`) memakai satu method `index()` → render semua list (`guruList,kelasList,ruangList,mapelList` + `tabs` + `formConfig`); `store/update/destroy` lewat param `{entity}` + `match($entity)`; `TABS` konstan; `ensureEntity()`.
- **Route** (`routes/web.php:37-43`): `GET /master-data` (index), `POST/PUT/DELETE /master-data/{entity}[/{id}]` — generic, sudah entity‑aware via `{entity}`.
- **Bug‑fix master‑data sudah ter‑commit** (jalankan `git log`): `c12fed2 render success flash`, `0d96215 atribut name + label`, `ec89dec hapus option placeholder duplikat`. Berarti `MasterDataForm` sudah punya `htmlFor`/`id`/`name` (Index.jsx:269,274,275), flash banner ada (57,124), tidak duplikat option. **Tidak perlu di‑refactor lagi di fase ini.**
- **Pola split per‑entity‑page sudah terbukti dipakai** lewat fitur enrollment yang ter‑commit (`a9269b3`, `31a14d9`): controller terpisah (`StudentEnrollmentController`), route `/student-enrollments/*`, page `StudentEnrollments/Index.jsx` self‑contained (tabel + form inline, flash banner, redirect ke halaman sendiri). **Kita ikot‑pola ini.**
- **Siswa tidak di‑seed oleh `MasterTablesSeeder`** (lokasi/kelas/labkom/guru/ruang/mapel/user admin saja); student masuk lewat kiosk RFID eksternal (`master_schema_restore.sql:2`). Artinya tidak ada CRUD siswa — relevan hanya bila nanti enrollment/page siswa; untuk split master-data ini **tidak sentuh**.
- Test: `MasterDataTest.php` (baca: lines 1‑60) — `beforeEach` seed `MasterTablesSeeder`; `it('authenticated index emits master props')` asserting `GET /master-data` → `has('tabs','guruList',15,'kelasList',1,'ruangList',5,'mapelList','formConfig')`. Test create/update/delete pakai `POST/PUT/DELETE /master-data/{entity}` + `assertRedirect('/master-data')`.
- AGENT.md rule 2: *"Jangan ubah skema database... Ingin skema baru? buat migration baru."* → tidak ada yang butuh migration baru di sini; rule 3: *"Perubahan hanya boleh menyentuh file yang tercantum di plan.md."*

### Mapping keputusan (apa yang dipertahankan / dipindah)
| Elemen | Sekarang | Setelah split |
|---|---|---|
| `MasterData/Index.jsx` | monolit tab | **Dashboard** `GET /master-data` (4 kartu link → masing‑masuk entity), tetap kirim semua list+formConfig agar test existing tetap hijau |
| `MasterDataForm` (inline) | dipakai 1 halaman | **Ekstrak** → `Components/MasterDataForm.jsx` (dipakai 4 halaman; isi tidak berubah) |
| entity table + modal | 1X (di tab) | **4 halaman** `MasterData/{Guru,Kelas,Ruang,Mapel}/Index.jsx`, masing‑masing self‑contained (tabel + modal `MasterDataForm`), kolom tiap entitas dipilah |
| `master-data` redirect | `→ /master-data` | `→ /master-data/{entity}` (preservasi konteks, ikut pola enrollment `redirect()->route('student-enrollments')`) |

---

## 1. Tujuan
Memecah halaman `/master-data` yang menumpuk 4 entitas (Guru, Kelas, Ruangan/Lab, Mata Pelajaran) menjadi **4 halaman CRUD terpisah** (`/master-data/guru`, `/master-data/kelas`, `/master-data/ruang`, `/master-data/mapel`) plus **dashboard** `/master-data` sebagai pusat navigasi — dengan cara mengikuti pola split yang **sudah terbukti** di fitur enrollment (`StudentEnrollmentController` + `StudentEnrollments/Index.jsx`), tanpa menambah dependency, tanpa migration/schema baru, dan tanpa menyentuh halaman lain.

## 2. Keputusan yang dikunci
| # | Pertukaran | Keputusan | Alasannya |
|---|------------|-----------|-----------|
| D1 | Pola arsitektur | **Ikuti pola enrollment**: dashboard `/master-data` + 4 page terpisah, tetap pakai satu `MasterDataController` generic (bukan 4 controller) | Backend generic sudah teruji (`MasterDataTest` lulus); 4 controller berarti duplikat `match($entity)`. Controller tetap satu, hanya `index()` ber‑param. |
| D2 | `index()` signature | `index(string $entity = null)`: `null`→dashboard (kirim **semua** list, supaya test existing `GET /master-data` tetap hijau); terisi→halaman entitas (pasokan hanya `{$entity}List` + `formConfig` + `tabs` + `success`). | Minangkang regresi; satu method, rute `GET /master-data/{entity}`. |
| D3 | Komponen form | **Ekstrak `MasterDataForm`** ke `resources/js/Components/MasterDataForm.jsx` (dipakai 4 halaman). Isi **samai** (sudah lengkap a11y+flash). | DRY — 4 halaman pakai satu form generic yang sudah teruji. |
| D4 | Redirect setelah aksi | `POST/PUT/DELETE /master-data/{entity}[/{id}` redirect ke **`/master-data/{entity}`** (bukan `/master-data`). | Preservasi tab/konteks, konsisten enrollment. Wajib update asersi `assertRedirect` di `MasterDataTest`. |
| D5 | Naming halaman | Direktori `MasterData/{Guru,Kelas,Ruang,Mapel}/Index.jsx` (kapital, camelCase kelas React); entity key tetap `guru/kelas/ruang/mapel` di prop & route. | `ucfirst($entity)` aman pakai 4 kata ini; Inertia resolve `MasterData/Guru/Index`. |
| D6 | Dashboard apakah kirim list? | **Ya, kirim semua list + formConfig + tabs + success** (sama sekarang). | Agar `it('authenticated index emits master props')` test existing **tetap hijau tanpa edit**, dan dashboard bisa tunjukkan ringkasan. |
| D7 | Hapus halaman lama? | **Tidak hapus** — `MasterData/Index.jsx` ditulis ulang jadi dashboard (dipertahankan nama + route `/master-data`). | Navbar/ tautan master-data tetap valid. |
| D8 | Flash | Setiap halaman entitas render `session('success')` lewat prop `success` (controller kirim di D2; page baca `usePage().props.success`) — **sama pola master-data lama** (`0d96215`/`c12fed2`). | 4 halaman otomatis dapat flash; controller sudah `->with('success',...)` di store/update/destroy. |

## 3. File yang boleh diubah / dibuat
**Baru (NEW):**
- `resources/js/Components/MasterDataForm.jsx` — ekstraksi `MasterDataForm` dari `MasterData/Index.jsx` (tanpa perubahan logika).
- `resources/js/Pages/MasterData/Guru/Index.jsx`
- `resources/js/Pages/MasterData/Kelas/Index.jsx`
- `resources/js/Pages/MasterData/Ruang/Index.jsx`
- `resources/js/Pages/MasterData/Mapel/Index.jsx`
- `tests/verify-masterdata-split.mjs` — skrip Playwright (pola `tests/verify-final.mjs` + `tests/verify-*.mjs` yang ada).

**Diedit (rewrite/append — semua terdaftar di sini):**
- `resources/js/Pages/MasterData/Index.jsx` — ditulis ulang jadi **dashboard** (4 kartu link → entity pages); masih menerima semua list+formConfig+tabs+success.
- `app/Http/Controllers/MasterDataController.php` — `index(string $entity = null)` (dashboard vs per‑entity page + `success` prop); ubah 3 redirect `->with('success')` dari `->route('master-data')` ke `redirect("/master-data/{$entity}")`.
- `routes/web.php` — `GET /master-data/{entity}` → `MasterDataController@index` (nama `master-data.{entity}` dinamis tidak bisa; pakai literal per entity: `Route::get('/master-data/{entity}', ...)` hanya GET, method‑level saja cukup). `GET /master-data` tetap dashboard.
- `tests/Feature/MasterDataTest.php` — update `assertRedirect('/master-data')` → `assertRedirect('/master-data/{entity}')`; **tambah** asersi `GET /master-data/{entity}` → prop entitas + `success`/`formConfig`/`tabs`. (Test dashboard existing tetap apa adanya.)

## 4. File yang TIDAK boleh diubah
- Semua migration (`database/migrations/*`) — termasuk `2026_10_09_000001_create_master_tables.php`.
- `database/master_schema_restore.sql`, semua `database/seeders/*` (terutama `MasterTablesSeeder`, `DatabaseSeeder`).
- `app/Models/*` (Siswa, Kelas, Guru, Pengguna, Mapel, RuangAjaran, Labkom, Lokasi, User, AcademicYear, StudentEnrollment).
- `app/Http/Middleware/HandleInertiaRequests.php`.
- `resources/js/Pages/ManagementClass/*`, `Absensi/*`, `StudentEnrollments/*`, `Auth/*`, `Profile/*`, `Welcome.jsx`, `Dashboard.jsx`.
- `routes/auth.php`.
- `composer.json`, `package.json`, `AGENT.md`, `vite.config.js`, `tailwind.config.js`, `resources/views/app.blade.php`, `resources/css/app.css`, `public/build/*`, `vendor/*`, `node_modules/*`.

## 5. Tugas atomik (5; masing‑masih satu commit)
| # | Commit | Lingkup file | Keterangan |
|---|--------|--------------|-----------|
| 1 | `refactor(master-data): extract shared MasterDataForm component` | `Components/MasterDataForm.jsx` (NEW); `Pages/MasterData/Index.jsx` (import) | Pindah fungsi `MasterDataForm` ke file terpisah; `Index.jsx` pakai `<MasterDataForm .../>`. **Zero behavior change** → `php artisan test --filter=MasterDataTest` tetap lulus. |
| 2 | `feat(master-data): split /master-data into dashboard + 4 entity pages` | `Index.jsx` (rewrite jadi dashboard); 4× `Pages/MasterData/{Entity}/Index.jsx` (NEW); `MasterDataController.php`; `routes/web.php` | Dashboard kirim semua list (D6); `GET /master-data/{entity}` render entity page; per‑entity halaman self‑contained (tabel + modal form + flash). Controller + route redirect ke `/master-data/{entity}`. |
| 3 | `test(master-data): update asserts for per-entity redirect + add entity GET assertions` | `tests/Feature/MasterDataTest.php` | `assertRedirect('/master-data')` → `/master-data/{entity}` (guru/kelas/ruang/mapel); tambah `it('guru page emits guruList + flash + formConfig')` dsb. |
| 4 | `test(master-data): Playwright verify split` | `tests/verify-masterdata-split.mjs` (NEW) | Headless chromium: login → `/master-data` dashboard ada 4 link → buka tiap entity → tabel + form + CRUD + flash `success`. |
| 5 | `chore(master-data): pint + build + full test gate` | (tidak ada file kode; hanya laporan hijau) | Jalan `./vendor/bin/pint`, `npm run build`, `php artisan test`. |

## 6. Tugas verifikasi (perintah persis — jalankan berurutan)
```bash
# 0. Pre‑flight
php artisan config:clear

# 1. Format PHP (0 diff = pass)
./vendor/bin/pint --test          # cek
./vendor/bin/pint                # apply sebelum commit

# 2. Frontend build (error TS/React muncul di sini; tidak ada ESLint — AGENT.md:30)
npm run build                    # → public/build/ (~2.8s)

# 3. Pest — semua master-data hijau (existing + tambahan per‑entity)
php artisan test --filter=MasterDataTest      # EXPECTED >=13 passed
php artisan test --filter=StudentEnrollmentTest  # regression enrollment tetap hijau

# 4. Full regression
php artisan test                 # EXPECTED: semua hijau

# 5. UI e2e (butuh server — AGENT.md:37, port 8000)
php artisan serve --port=8000 &         # background
npm run dev &                           # Vite :5173 (refresh:true → HMR iframe, dev-only)
node tests/verify-masterdata-split.mjs  # EXPECTED: OVERALL: PASS; links ✅; crud ✅; flash ✅
#   lalu: hentikan server + vite
```

### Yang **TIDAK** bisa diverifikasi otomatis (jujur, AGENT.md rule 5)
- **TIDAK DIJALANKAN** — navigasi Navbar → link ke `/master-data/*` belum ditambahkan (D11 / di luar cakupan); verifikasi lewat `node tests/verify-*` langsung ke URL.
- **TIDAK DIJALANKAN** — kios/RFID karena student di‑populate sistem eksternal (`presensi_rfid.db`); tidak tersedia di dev.
- Vite dev `refresh: true` → HMR iframe `srcdoc` menyaring klik di `npm run dev`; **dev‑only**, hilang di `npm run build`. (Lihat: `StudentEnrollments` juga dipengaruhi — global, bukan bug split.)

## 7. Di luar cakupan
- **Migrasi data/history student lama** (`siswa.kelas_id` → enrollment) — tidak ada data riwayat; butuh sumber eksternal. Luar siklus ini.
- **Refactor siswa** menjadi CRUD (StudentController) — luar (lihat catatan).
- **Navbar/Topbar link** ke halaman baru master-data — luar (bisa task terpisah).
- **Schema/database** — tidak ada migration baru, tidak alter tabel.
- **Fitur enrollment** — sudah lengkap (PR #8), tidak disentuh.
- **Deployment Hostinger** — tidak disentuh.

---

*Dokumen ini dibuat dari bacaan langsung: `AGENT.md`, `routes/web.php` (25‑54), `app/Http/Controllers/MasterDataController.php` (full), `app/Http/Controllers/StudentEnrollmentController.php` (referensi pola), `resources/js/Pages/MasterData/Index.jsx` (full), `resources/js/Pages/StudentEnrollments/Index.jsx` (pola split), `tests/Feature/MasterDataTest.php` (1‑60), `tests/Pest.php`, `database/migrations/2026_10_09_000001_create_master_tables.php`, `database/master_schema_restore.sql`, `app/Models/{Siswa,Kelas,StudentEnrollment,AcademicYear}.php`, `git log` (commit `c12fed2`/`0d96215`/`ec89dec`/`a9269b3`/`31a14d9`). **Tidak ada file proyek yang diubah** untuk menghasilkan plan ini (hanya `plan.md` sebagai deliverable).*
