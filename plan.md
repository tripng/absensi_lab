# plan.md — Perbaiki halaman `/master-data/guru` (NIP kosong + 419 CSRF + fitur search)

> Scope: **bisa dibaca, jangan ubah file**. Deliverable = file `plan.md` ini saja. Setiap tugas atomik boleh di‑commit **setelah** hijau pada §6 *Tugas verifikasi* + lolos `./vendor/bin/pint` (AGENT.md §4,5). **Tidak ada perubahan skema database** (batasan kaku). Tidak ada dependency baru.

---

## 0. Penyebab & Perbaikan 419 (CSRF “expired”, pertama‑gagal‑retry‑OK)
**Bukan bug kode.** Fakta yang dibaca langsung:
- `.env.example`: `SESSION_DRIVER=database`, DB `sqlite`; `SESSION_DOMAIN=null`, `SESSION_SAME_SITE` tak set → default `lax` (benar); `APP_URL=http://localhost` (cocok host dev). `config/session.php`: `secure=>env(...)` → null/false; `same_site=>'lax'`. Semua **default betul**.
- `bootstrap/app.php`: `VerifyCsrfToken` aktif (web middleware bawaan Laravel) → CSRF standar. `HandleInertiaRequests` share `auth`.
- `resources/js/Components/MasterDataForm.jsx:30` pakai `form.post('/master-data/guru', …)` — Inertia/axios **otomatis** lampirkan `X‑XSRF‑TOKEN` dari cookie `XSRF-TOKEN` (Laravel set tiap respon via `VerifyCsrfToken::addXsrfTokenToCookie`).
- `routes/web.php:42` — `POST /master-data/{entity}` match.
- `php artisan migrate:status` → `2026_10_09_024039_create_sessions_table … Ran`. Tabel `sessions` ada & persisten.

**Penyebab pasti 419:** sesi browser (`laravel_session` + `XSRF-TOKEN`) **tidak lagi sinkron** dengan token server karena **session baru dibuat ulang sementara cookie lama masih dipakai browser.** Hal ini terjadi tepat setelah **`migrate:fresh --seed` yang saya jalankan pada sesi ini** — yang `DROP TABLE sessions` + buat ulang, menghapus semua baris sesi. Browser tetap pakai cookie hasil login *sebelumnya* → POST pertama `POST /master-data/guru` baca token cookie lama vs token sesi baru di server → `TokenMismatchException` → **419 Page Expired**. Respons 419 (dan GET berikutnya) me‑*re‑emit* cookie sesi baru → retry → token cocok → **OK**.

> Ini *textbook* pola “first submit 419, retry works”: cookie CSRF **stale setelah rotasi session**. Rotasi terjadi setiap **login** (`session()->regenerate()`) dan setiap **`migrate:fresh`/`db:wipe`** (saat sesi login masih hidup).

**Perbaiki (tanpa kode, tanpa config):** *setelah setiap `migrate:fresh --seed`, login ulang* agar browser pakai cookie sesi baru. **Tidak perlu mengubah `config/session.php`, `APP_URL`, atau `SESSION_*`** — semua sudah benar. Verifikasi 419 ada di `verify-guru-fixes.mjs` (§6.5): script login fresh baru, lalu POST → diharapkan 200/302, tidak ada 419.

---

## 1. Tujuan (1 paragraf)
Memperbaiki halaman `/master-data/guru` agar (a) **NIP guru dapat dikosongkan** dengan validasi `nullable` (hindar error unik pada satu baris), (b) **419 CSRF** yang muncul pertama kali setelah `migrate:fresh`/rotasi session teratasi via login ulang (bukan bug kode — root cause sudah teridentifikasi §0), dan (c) **fitur pencarian** `?search=` ditambahkan di halaman guru yang memfilter daftar guru berdasarkan **Nama** (relasi `pengguna`) **atau NIP**, dengan UI input teks + Inertia GET `preserveState`. Tanpa menambah dependency, tanpa mengubah skema database, tanpa sentuh halaman entitas (kelas/ruang/mapel) lain.

---

## 2. Keputusan yang dikunci (hal‑hal debatable)
| # | Kontroversi | Keputusan | Asal fakta / alasan |
|---|---|---|---|
| D1 | 419 diperbaiki lewat kode? | **Tidak — operasional (login ulang setelah migrate:fresh).** Root cause bukan bug kode/konfig. | diagnose §0; semua wiring CSRF standar (`MasterDataForm` → `useForm.post`; route match; sessions table ada) |
| D2 | NIP kosong disimpan `''` atau `NULL`? | **Validasi `nullable`, simpan `''`.** Kolom `guru.nip` = `NOT NULL` (migration `2026_10_09_000001` ln 83) → jangan boleh diubah skema; `''` valid untuk `NOT NULL`. | migration ln 83 `$t->text('nip')` |
| D3 | NIP kosong + `UNIQUE(nip)` bertentakan! | **Diterima sebagai keterbatasan (lihat Q1).** Dengan constraint “tak ubah skema”, hanya **1 guru boleh NIP kosong** (2‑nd → `unique violation` → 500 rollback). Banyak guru kosong butuh migration `ALTER nip DROP NOT NULL` → **luar cakupan & butuh keputusan user**. | migration ln 86 `$t->unique('nip')` |
| D4 | Search entitas? | **Guru saja** (Nama via `pengguna.nama` + `nip`); strukturnya reusable. Lingkup fokus guru; kelas/ruang/mapel ekstend di luar (Q3). | judul task: “master-data/guru” |
| D5 | `guruList()` filter diquery atau collection? | **Filter collection pasca‑`get()`** (list kecil; `nama` ada di relasi `pengguna`). Simpel, tak perlu JOIN. | `guruList()` relasi `with('pengguna')` |
| D6 | Search UI behavior? | **URL‑driven**: load dengan `?search=`; on type → `router.get('/master-data/guru', {search:q}, {preserveState:true, replace:true})`. Bukan AJAX fetch semu — pakai Inertia GET agar back/refresh konsisten. | pola Inertia existing (StudentEnrollments) |
| D7 | `MasterDataForm.jsx` perlu diubah? | **Tidak.** `required` di‑drive `formConfig`; cukup ubah `formConfig` nip `required:true→false` → `MasterDataForm` otomatis hapus `*`. | `MasterDataForm.jsx:43` `f.required ? ' *' : ''` |

---

## 3. File yang boleh diubah / dibuat
**Edit (controller):**
- `app/Http/Controllers/MasterDataController.php`
  - `index(?string $entity = null)` → `index(Request $request, ?string $entity = null)`; baca `$request->query('search', '')`; kirim prop `'search'` ke halaman guru.
  - `rules()` — guru `nip`: `['required',...]` → `['nullable','string','max:50', Rule::unique('guru','nip')->ignore($id)]`.
  - `formConfig()` — guru `nip`: `'required' => true` → `'required' => false`.
  - `guruList(): array` → `guruList(?string $search = null): array`; filter `nama` (dari `pengguna`) + `nip` setelah `map` bila `$search`; `->values()->all()`.

**Edit (frontend):**
- `resources/js/Pages/MasterData/Guru/Index.jsx` — tambah input `search` (bind `usePage().props.search`); `onChange` → `router.get('/master-data/guru', {search}, {preserveState:true, replace:true})`; tabel pakai `guruList` (sudah diff-filter di server).

**Baru (test):**
- `tests/Feature/MasterDataTest.php` — **edit/append**, +2 case (lihat task 3 §5).
- `tests/verify-guru-fixes.mjs` — **baru** (skrip Playwright, pola `tests/verify-*.mjs` yang ada).

---

## 4. File yang TIDAK boleh diubah
- Semua `database/migrations/*` — termasuk `2026_10_09_000001_create_master_tables.php` (**`guru.nip` NOT NULL+UNIQUE tidak disentuh**; tidak ada `ALTER`).
- `database/seeders/*`, `database/master_schema_restore.sql`.
- `app/Models/*` (`Guru`, `Pengguna`, …).
- `resources/js/Components/MasterDataForm.jsx` (hanya turun `required` via formConfig; file itu tidak diubah).
- `resources/js/Pages/MasterData/{Kelas,Ruang,Mapel}/Index.jsx`, `Pages/MasterData/Index.jsx` (dashboard), `StudentEnrollments/*`, `ManagementClass/*`, `Absensi/*`, `Auth/*`, `Profile/*`.
- `routes/web.php` — **tidak perlu diubah** (query `?search=` lewat tanpa edit route; `GET /master-data/{entity}` sudah ada).
- `config/*` (termasuk `config/session.php` — tidak tersentuh, 419 bukan bug config), `bootstrap/app.php`.
- `routes/auth.php`, `composer.json`, `package.json`, `AGENT.md`, `vite.config.js`, `tailwind.config.js`, `resources/views/app.blade.php`, `resources/css/app.css`, `public/build/*`, `vendor/*`, `node_modules/*`.

---

## 5. Tugas atomik (4 — satu per commit)
| # | Commit | File | Rangkuman |
|---|---|---|---|
| 1 | `fix(master-data): allow empty NIP on guru` | `MasterDataController.php` (rules + formConfig) | `nip` guru `required→nullable` + `required:false` di formConfig. ⚠️ **D3/Q1**: hanya 1 guru kosong aman; 2‑nd kosong akan `unique violation`. |
| 2 | `feat(master-data/guru): search by nama/nip` | `MasterDataController.php` (`index`+`guruList`), `Pages/MasterData/Guru/Index.jsx` | `?search=` filter (nama+pengguna/nip, collection filter); input UI + Inertia `router.get` preserveState. |
| 3 | `test(master-data): Pest for empty NIP + guru search` | `tests/Feature/MasterDataTest.php` (+2 case) | `POST /master-data/guru` NIP '' → 302 + success; `GET /master-data/guru?search=…` → listterfiltrasi. |
| 4 | `chore(master-data): pint + build + full test + e2e gate` | (tidak ada file kode; laporan hijau) | `pint`; `npm run build`; `php artisan test`; `node tests/verify-guru-fixes.mjs` (termasuk verifikasi **419 tidak muncul setelah login fresh**). |

---

## 6. Tugas verifikasi (perintah persis — jalankan berurutan)
```bash
# 0. pre‑flight
php artisan config:clear

# 1. format PHP (0 diff = pass; apply sebelum commit)
./vendor/bin/pint                              # apply
./vendor/bin/pint --test                       # cek, 0 diff

# 2. frontend build
npm run build                                 # → public/build/  (exit 0)

# 3. Pest — guru (NIP kosong + search)  + regression
php artisan test --filter=MasterDataTest      # EXPECTED: semua hijau, termasuk 2 case baru
php artisan test --filter=StudentEnrollmentTest
php artisan test --filter=ManagementClassTest

# 4. full suite
php artisan test                              # EXPECTED: semua hijau

# 5. UI e2e — 419 + fitur (butuh server)
php artisan serve --port=8000 &              # background
npm run dev &                                 # Vite :5173 (dev; HMR iframe, dev-only)
node tests/verify-guru-fixes.mjs              # EXPECTED: OVERALL PASS
#   - LOGIN FRESH dulu (ini UJI 419): POST /master-data/guru → 302, TIDAK 419
#   - nip-empty ✅ ; search ✅ ; no-419 ✅
# hentikan serve + vite
```

### Standar lulus tiap gate
- `pint`: 0 diff.
- `npm run build`: exit 0.
- `php artisan test`: **semua hijau**; `MasterDataTest` termasuk 2 case guru (NIP kosong + search).
- `verify-guru-fixes.mjs`: `OVERALL: PASS` + khususnya `no-419 ✅` berarti **setelah login fresh, POST guru tidak 419**.

---

## 7. Di luar cakupan
- **Membuat kolom `guru.nip` nullable (NULL) + lepas/duplikat `UNIQUE`** untuk NIP kosong jamak — butuh migration `ALTER` → diluar constraint “jangan ubah skema database” (lihat **Q1**).
- **Search ke Kelas / Ruangan / Mapel** (reuse pola) — luar fokus guru (lihat Q3).
- **Refactor controller ke 4 resource‑controller** / **navbar link master-data** / **enrollment** / **deployment Hostinger** — tidak disentuh.
- **419 via kode**: bila repro tetap muncul setelah login fresh berulang, butuh akses live dev/network capture — luar cakupan plan ini (lihat **Q2**).

---

## Pertanyaan terbuka (tak boleh menebak — jawab agar implementasi tidak buntu)
1. **Q1 (BLOCKING banyak‑guru‑NIP‑kosong):** `guru.nip` = `NOT NULL` + `UNIQUE(nip)` (migration ln 83,86). Dengan constraint “tak ubah skema”, **hanya 1 guru boleh NIP kosong** (2‑nd kosong → `unique violation` → 500). Rekomendasi default **(a) terima 1 guru kosong saja** (task 1 & test pakai 1 guru kosong; aman). Atau **(b) beri keizinan migration baru** `ALTER guru.nip DROP NOT NULL + DROP UNIQUE(unik)` — *melanggar* constraint ini. — Pilih (a) atau (b)?
2. **Q2 (419 fallback):** beri konfirmasi **setuju anggap 419 = session‑staleness setelah `migrate:fresh`/login** (perbaikan = re‑login, verifikasi lewat Playwright login fresh → POST). Bila tidak, butuh live akses — luar cakupan. Setuju?
3. **Q3 (search scope):** hanya **guru** (fokus ini) — setuju, atau mau **ekspan ke kelas/ruang/mapel** (bikin task 2 lebih besar)?
4. **Q4 (prop `search` di dashboard `/master-data`):** apakah kirim prop `search` di dashboard — atau **hanya di `/master-data/guru`** (default `''` via `usePage().props.search ?? ''`)? — Rekomendasi: cuma guru. Setuju?

---
*Dokumen ini dibuat dari bacaan langsung:*
- `AGENT.md` (rule 2,4,5,16,28,33); `.env.example`; `config/session.php`; `bootstrap/app.php`;
- `app/Http/Controllers/MasterDataController.php` (full — `index`, `rules`, `formConfig`, `guruList`);
- `resources/js/Components/MasterDataForm.jsx` (full — `useForm`, `f.required ? ' *'`, `form.post('/master-data/${activeTab}')`);
- `resources/js/Pages/MasterData/Guru/Index.jsx` (full — struktur page, flash, table, `router.delete`);
- `routes/web.php` (full — `GET /master-data`, `GET|POST|PUT|DELETE /master-data/{entity}…`);
- `database/migrations/2026_10_09_000001_create_master_tables.php` (ln 81‑90: `guru` NOT NULL `text('nip')` + `unique('nip')` + FK `pengguna.id` cascade delete);
- `php artisan migrate:status` (`…_create_sessions_table … Ran`); `tests/Feature/MasterDataBugFixTest.php`, `tests/Feature/MasterDataTest.php` (baca 1‑60).
**Tidak ada file proyek yang diubah untuk menghasilkan plan ini — hanya `plan.md` sebagai deliverable.**
