# plan.md — Rename `management-class → management-schedule` + perbaiki CRUD (tombol submit di luar form)

> Scope: **bisa dibaca, jangan ubah file**. Deliverable = file `plan.md` ini saja. Setiap tugas atomik boleh di-commit **setelah** hijau pada §6 *Tugas verifikasi* + lolos `./vendor/bin/pint` (AGENT.md §4,5). **Tidak ada dependency baru. Tidak ada perubahan skema database.**

---

## 0. Temuan kritis (baca dulu — membedakan dari diagnose plan.md sebelumnya)

**Root cause CRUD "belum berfungsi / seperti tidak terjadi apa-apa" bukan 419 — melainkan struktur form.**

Bukti langsung dari kode (`resources/js/Pages/ManagementClass/ScheduleForm.jsx`):
- `<form onSubmit={handleSubmit}>` **menutup di baris 359** (`</form>`).
- Tombol **Simpan** `type="submit"` berada di **baris 371**, *setelah* `</form` (di dalam blok `{/* Form actions */}` yang merupakan *sibling* div — **bukan** anak dari `<form>`, dan tidak ada atribut `form=`).

Akibatnya: klik "Simpan" **tidak pernah memicu `handleSubmit`** → tidak ada `router.post`/`put` → tidak ada request ke server → **"seperti tidak terjadi apa-apa" + tidak ada data ditambahkan**. Ini cocok persis dengan laporan pengguna.

Mengapa **bukan** 419:
- `php artisan test --filter=ManagementClassTest` → **13 passed (101 assertions)**; POST/PUT/DELETE semuanya kembali 302 redirect dan data terbukti ada di DB. Backend CRUD sudah benar.
- Tapi Pest pakai `SESSION_DRIVER=array` (phpunit.xml) — *bypass* 419, **bukan** bukti 419 tak terjadi di app live.
- Symptom "419" berarti error/redirect *kasat mata*; symptom yang dilaporkan = "tidak terjadi apa-apa" = **tidak ada request sama sekali** → konsisten dengan tombol di luar form, **kontrapositif 419**.

**419 tetap risk sekunder** (bukan root cause yang dilaporkan): `.env.example` memakai `SESSION_DRIVER=database` dan migrasi tabel `sessions` ada. Setelah `migrate:fresh --seed`, tabel `sessions` dibuang → cookie `laravel_session` lama kadaluwarsa → POST pertama *bisa* 419. Ini baru relevan **setelah** tombol diperbaiki (agar form benar-benar submit). Lihat D1 + §6.5.

---

## 1. Tujuan (1 paragraf)

Mengganti nama halaman & rute **`management-class` → `management-schedule`** secara konsisten (URL `/management-schedule`, route name `management-schedule.*`, label Navbar "Management Schedule", dan semua literal URL di React + test) sekaligus memperbaiki CRUD jadwal berulang & jadwal pinjaman yang "tidak berfungsi" — yang ternyata **bukan** 419 CSRF, melainkan tombol **Simpan** (`type="submit"`) berada di luar elemen `<form>` sehingga klik tidak pernah memicu submit. Perbaikan: memindahkan tombol aksi ke dalam `<form>`. Backend sudah terbukti bekerja (Pest 13/13; full suite 69/69). Tanpa menambah dependency, tanpa mengubah skema DB; folder `ManagementClass/` dan class `ManagementClassController` diserahkan tidak diganti (D3/D4).

---

## 2. Keputusan yang dikunci

| # | Kontroversi | Keputusan | Fakta / alasan |
|---|---|---|---|
| D1 | Root cause 419 vs form-structure? | **Form-structure** (Simpan di luar `<form>`). 419 = risk sekunder dev-env. | `ScheduleForm.jsx:359` `</form>` vs `:371` button di luar; Pest 13/101 lulus (backend OK); symptom "tidak terjadi apa-apa" ≠ 419. |
| D2 | Scope rename? | URL + route name + label Navbar + `redirect()->route(...)` di controller + semua literal `/management-class` di test. | Ini makna "ubah nama management-class". |
| D3 | Ganti folder `ManagementClass/` → `ManagementSchedule/` + `Inertia::render` nama view? | **Tidak.** Folder ≠ route; ganti nama folder berisiko update import path tanpa nilai user. | `Inertia::render('ManagementClass/Index')` tetap valid. |
| D4 | Ganti class `ManagementClassController` → `ManagementScheduleController`? | **Tidak.** Minim file berubah; risiko autoload PSR-4. | Hanya route/URL/label yang berubah. |
| D5 | Ganti nama file test `ManagementClassTest.php`? | **Tidak.** Cukup `sed` isi URL literal saja. | Nama file test tidak mempengaruhi route. |
| D6 | Cara perbaiki form? | **Pindahkan blok `{/* Form actions */}` ke dalam `<form>`** (sebelum `</form>` line 359). | `type="submit"` baru punya form owner; `onSubmit` baru dapat fire. |
| D7 | Klien validasi `keterangan` wajib (ScheduleForm:85)? | Dibiarkan (lihat Q4). | Bukan root cause; backend nullable. |
| D8 | Route lain / auth / master-data? | Tidak tersentuh. | grep: tidak referensi `management-class` di luar file §3. |

---

## 3. File yang boleh diubah / dibuat

**Edit — task 1 (form fix):**
- `resources/js/Pages/ManagementClass/ScheduleForm.jsx` — pindahkan blok `{/* Form actions */}` (Batal + Simpan) ke dalam `<form>` agar `type="submit"` mengirim ke `onSubmit`.

**Edit — task 2 (rename):**
- `routes/web.php` — 5 titik: 4 route URL+name (`/management-class`→`/management-schedule`, name `management-class.*`→`management-schedule.*`) + baris 61 `redirect()->route('management-class')`→`'management-schedule'`.
- `app/Http/Controllers/ManagementClassController.php` — 3× `redirect()->route('management-class')`→`'management-schedule'` (baris 166, 209, 228). `Inertia::render('ManagementClass/Index')` **tetap**.
- `resources/js/Pages/ManagementClass/ScheduleForm.jsx` — `post('/management-class')`→`'/management-schedule'` (ln105); `put(`/management-class/${id}`)`→`'/management-schedule/${id}'` (ln99).
- `resources/js/Pages/ManagementClass/Index.jsx` — `router.post('/management-class',…)`→`'/management-schedule'` (ln57); `router.delete(`/management-class/${id}`)`→`'/management-schedule/${id}'` (ln70).
- `resources/js/Pages/Absensi/Navbar.jsx` — `href: '/management-class'`→`'/management-schedule'`; `label: 'Management Class'`→`'Management Schedule'`.

**Edit — task 3 (test):**
- `tests/Feature/ManagementClassTest.php` — `sed` semua literal `/management-class`→`/management-schedule` (27 kemunculan URL + `assertRedirect` target) + label deskripsi tes (opsional). Nama file tidak diganti.

**Baru — task 4 (e2e):**
- `tests/verify-schedule-fixes.mjs` — Playwright (`playwright-core`, `/usr/bin/chromium`) model `verify-guru-fixes.mjs`: login fresh `admin@absensi.com`/`password` → buat jadwal berulang → buat pinjaman one-time → edit → hapus → reload → assert card muncul/hilang; + capture response status POST → **POST pertama tidak 419**.

---

## 4. File yang TIDAK boleh diubah

- `database/migrations/*` — termasuk `2026_10_15_000001_alter_jadwal_for_management_class.php` (nama & skema **tidak diganti/diusah**; AGENT.md rule 2).
- `database/seeders/*` (`MasterTablesSeeder.php` komentar `management-class` — **tidak ditelusuri/diganti**).
- `app/Models/*` (`JadwalAjaran`, `JadwalPinjaman`, `Kelas`, `RuangAjaran`, `Guru`, `Mapel`, dst.).
- `app/Http/Middleware/HandleInertiaRequests.php`, `bootstrap/app.php`, `config/*` (termasuk `config/session.php`).
- `resources/js/Pages/ManagementClass/ScheduleCard.jsx` (tidak ada URL di dalam — `grep` 0 match).
- `resources/js/Pages/{StudentEnrollments,Data,MasterData,Absensi/Index,Absensi/Mso,dll}/*`.
- `resources/views/app.blade.php`, `resources/css/app.css`, `vite.config.js`, `tailwind.config.js`, `jsconfig.json`, `postcss.config.js`.
- `composer.json`, `package.json` (tanpa permission; AGENT.md rule 1).
- `public/build/*`, `vendor/*`, `node_modules/*`.
- Folder `resources/js/Pages/ManagementClass/` — **tidak diganti** (D3).
- Class/PHP `ManagementClassController` — **tidak diganti** (D4).
- `database/database.sqlite`, `presensi_rfid.db`, `README.md`, `template.html`.
- `.env` / `.env.example` (secret; 419 env note bersifat manual user via Q5).

---

## 5. Tugas atomik (5 — masing-masing satu commit)

| # | Commit | File(s) | Rangkuman |
|---|---|---|---|
| 1 | `fix(schedule): place Simpan button inside form so submission fires` | `resources/js/Pages/ManagementClass/ScheduleForm.jsx` | Pindahkan blok "Form actions" (Batal+Simpan) ke dalam `<form>` (sebelum `</form>`). Perbaiki akar penyebab "tidak terjadi apa-apa" — `type="submit"` baru trigger `onSubmit`. |
| 2 | `refactor(schedule): rename management-class → management-schedule` | `routes/web.php`, `ManagementClassController.php`, `ScheduleForm.jsx`, `Index.jsx`, `Navbar.jsx` | URL `/management-schedule` + route name `management-schedule.*` + label "Management Schedule" + `redirect()->route('management-schedule')`. Folder & class tetap. |
| 3 | `test(schedule): update ManagementClassTest URLs → /management-schedule` | `tests/Feature/ManagementClassTest.php` | `sed` 27 literal URL; tetap 13 passed. |
| 4 | `test(schedule): Playwright e2e CRUD + first-POST-no-419` | `tests/verify-schedule-fixes.mjs` (baru) | login fresh → create recurring ✅ → create one-time ✅ → edit ✅ → delete ✅ → reload ✅; POST pertama **bukan 419**. |
| 5 | `chore(schedule): pint + build + full test gate` | (laporan hijau) | `pint`; `npm run build`; `php artisan test` (ManagementClassTest 13 passed + full 69 passed). |

> Task 1 tidak terdeteksi Pest karena test POST langsung (melewati form UI) — inilah sebabnya plan.md sebelumnya melewatkan bug ini. Verifikasi task 1 eksklusif lewat Playwright (task 4).

---

## 6. Tugas verifikasi (perintah persis — jalankan berurutan setelah implementasi)

```bash
# 0. preflight
php artisan config:clear

# 1. format PHP (apply sebelum commit; di CI --test → 0 diff)
./vendor/bin/pint
./vendor/bin/pint --test            # EXPECTED: 0 diff / exit 0

# 2. frontend build
npm run build                       # EXPECTED: sukses → public/build/

# 3. Pest — management-schedule (rename regression; 13 test, 101 assertion)
php artisan test --filter=ManagementClassTest
# EXPECTED: 13 passed (101 assertions)

# 4. full Pest regression (semua hijau)
php artisan test
# EXPECTED: 69 passed (460 assertions) — ManagementClass tetap 13

# 5. UI e2e — butuh server + DB terseed
php artisan migrate:fresh --seed    # buat admin@absensi.com/password + master data
php artisan serve --port=8000 &     # background
npm run dev &                        # Vite :5173 (dev; HMR, dev-only)
node tests/verify-schedule-fixes.mjs
# EXPECTED: OVERALL: PASS  +  no-419 ✅  +  create recurring ✅ / one-time ✅ / edit ✅ / delete ✅ / reload ✅
# hentikan: pkill -f "php artisan serve"; pkill -f vite
```

### Standar lulus tiap gate
- `pint --test`: 0 diff.
- `npm run build`: exit 0.
- `php artisan test --filter=ManagementClassTest`: **13 passed (101 assertions)** — semua URL sudah `/management-schedule`.
- `php artisan test`: **69 passed (460 assertions)** — tidak ada regresi.
- `verify-schedule-fixes.mjs`: `OVERALL: PASS` + **`no-419 ✅`** (fresh login → POST pertama 200/302, bukan 419) + semua CRUD lifecycle lolos.

### Yang **TIDAK** bisa diverifikasi otomatis (jujur, AGENT.md rule 5)
- **TIDAK DIJALANKAN** — klik Navbar *setelah rename* belum diuji manual; diverifikasi lewat URL langsung + `href`/`label` di Playwright.
- **TIDAK DIJALANKAN** — kios/RFID / data siswa via `presensi_rfid.db` (eksternal).
- Vite dev HMR `srcdoc` iframe (dev-only, hilang di `npm run build`).

---

## 7. Di luar cakupan

- Rename folder `resources/js/Pages/ManagementClass/` (Q1/D3).
- Rename class `ManagementClassController` / file → `ManagementScheduleController` (Q2/D4) — butuh update import di `routes/web.php` + autoload PSR-4.
- Rename file test `ManagementClassTest.php` → `ManagementScheduleTest.php` (Q3/D5).
- Relax validasi klien `keterangan` wajib di `ScheduleForm.jsx:85` (Q4/D7).
- Standing env-level 419 mitigasi `SESSION_DRIVER=file` (Q5 — manual user, `.env` secret; bukan schema/deps).
- Fitur search master-data, enrollment, deployment Hostinger, skema DB — tidak disentuh.

---

## Pertanyaan terbuka (jawab agar implementasi tidak tertuang‑tangan)

1. **Q1 (folder rename?):** ganti folder page `ManagementClass/` → `ManagementSchedule/` + `Inertia::render('ManagementSchedule/Index')` + import path React? — Rekomendasi: **tidak** (folder & class tetap; cukup route/URL/label). Setuju?
2. **Q2 (class rename?):** ganti class `ManagementClassController` → `ManagementScheduleController` (+ file)? — Rekomendasi: **tidak**. Jika ya, beri tahu (perlu update `routes/web.php` import + PSR-4 autoload).
3. **Q3 (test file rename?):** `ManagementClassTest.php` → `ManagementScheduleTest.php`? — Rekomendasi: **tidak** (cukup replace string URL). Setuju?
4. **Q4 (keterangan required di klien?):** `ScheduleForm.jsx:85` blokir save bila `keterangan` kosong meski backend nullable — lepas (1 baris) agar UX konsisten nullable? — Luar task 1/2 utama. Ingin masuk?
5. **Q5 (standing 419 fix):** setuju Anda akan manual-set `SESSION_DRIVER=file` di `.env` dev (`.env` secret, tidak ditulis agent; bukan schema/deps) agar `migrate:fresh --seed` tidak membuat re-login tiap seed? — Immediate fix = re-login setelah seed. Keputusan?

---

*Dokumen ini dibuat dari bacaan langsung (read‑only); tidak mengubah file proyek apa pun kecuali `plan.md`:*
- `php artisan test --filter=ManagementClassTest` → **13 passed, 101 assertions**;
- `php artisan test` → **69 passed, 460 assertions** (baseline);
- `resources/js/Pages/ManagementClass/ScheduleForm.jsx` (full — `</form>` ln 359 vs `type="submit"` ln 371 *di luar* form);
- `routes/web.php` (5 route + ln 61 redirect);
- `app/Http/Controllers/ManagementClassController.php` (3× `redirect()->route('management-class')`, `Inertia::render('ManagementClass/Index')`);
- `resources/js/Pages/ManagementClass/{Index,ScheduleForm,ScheduleCard}.jsx`;
- `resources/js/Pages/Absensi/Navbar.jsx` (href/label `Management Class`);
- `tests/Feature/ManagementClassTest.php` (13 test / 27 literal `/management-class`);
- `database/migrations/2026_10_15_000001_alter_jadwal_for_management_class.php` (skema; **tidak berubah**);
- `.env.example` (`SESSION_DRIVER=database`), `phpunit.xml` (`SESSION_DRIVER=array`), `bootstrap/app.php` (web middleware + CSRF aktif), `database/seeders/DatabaseSeeder.php` (seed `admin@absensi.com`/`password`), `package.json` (`playwright-core` sudah terpasang).