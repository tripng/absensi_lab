# AGENTS.md

Project: **absensi_lab** — Laravel 12 + Inertia.js (React 18) + Vite + Tailwind CSS 3 (Material You).
Database: **MySQL** `absensi_lab` di `127.0.0.1:3306`, user `absensi`.
PHP 8.5 / Node (npm). DB koneksi di `.env` (jangan commit).

## Perintah penting

### Backend (PHP / Laravel)
- Test semua: `php artisan test` (alias `composer test` — tambahan `config:clear`)
  - DIVERIFIKASI: 51 passed (261 assertions).
- Test satu file / satu kelas: `php artisan test --filter=NamaTest`
  - DIVERIFIKASI: `--filter=MasterDataTest` → 13 passed.
- Test satu method: `php artisan test --filter=NamaTest::nama_method`
- Format PHP: `./vendor/bin/pint`
  - Pakai PSR-12 + Laravel preset (tidak ada `pint.json`, pakai default).
- Cek format tanpa ubah: `./vendor/bin/pint --test`
  - DIVERIFIKASI: berjalan; kembalikan exit-code 0 meski ada file perlu-format (hasil `result: "fail"` berarti file perlu di-format, bukan error kompilasi).
- Migrasi DB: `php artisan migrate`
- Fresh DB + seed: `php artisan migrate:fresh --seed`
  - Seed chain: `DatabaseSeeder` → `MasterTablesSeeder` (lokasi, kelas X.1–X.15, labkom, guru, ruang_ajaran, mapel, user admin).
- Serve lokal: `php artisan serve` (atau `composer dev` untuk server+queue+pail+vite paralel).
- Clear cache: `php artisan config:clear && php artisan cache:clear && php artisan route:clear && php artisan view:clear`
- Generate URL route (Ziggay): `php artisan ziggy:fetch` (jika pakai Ziggy di JS).

### Frontend (React / Vite / Tailwind)
- Build produksi: `npm run build`
  - DIVERIFIKASI: sukses, built in ~2.8s → `public/build/`.
- Dev server: `npm run dev` (Vite, HMR + `refresh: true` untuk Inertia).
- Build + lint front-end: **TIDAK DIJALANKAN** — tidak ada ESLint/Prettier di `package.json` atau `node_modules/.bin`. Tidak ada script `lint`. Jalankan `npm run build` saja; error TS/React muncul di sini.
- Tailwind scan: `tailwind.config.js` content termasuk `resources/js/**/*.{js,jsx}`.

### Verifikasi end-to-end (Playwright)
- Skrip live browser ada di `tests/*.spec.cjs` dan `tests/*.mjs` (Playwright-core, headless Chromium).
- Jalankan satu skrip: `node tests/verify-final.mjs` (atau `.spec.cjs`).
- Pustaka skrip verifikasi: `absensi-db-verify.js`, `absensi-render-verify.js`, `verify-final.mjs`, `verify-photos.mjs`, `verify-date-today.mjs`.
- Syarat: `php artisan serve` harus berjalan di `http://127.0.0.1:8000` sebelum eksekusi skrip.

## Aturan wajib

1. **Jangan ubah `composer.json` atau `package.json`** tanpa izin eksplisit.
2. **Jangan ubah skema database** — jangan tambah, modifikasi, atau hapus migration yang sudah ada. Ingin skema baru? buat migration baru, jangan edit yang lama.
3. **Perubahan hanya boleh menyentuh file yang tercantum di `plan.md`.** Tidak ada `plan.md` di repo → minta konfirmasi dulu. Jika rencana (plan) ternyata salah, **berhenti dan laporkan**, jangan improvisasi.
4. **Format dulu sebelum commit** — jalankan `./vendor/bin/pint` (bukan `--test`) sebelum `git add`. Frontend: tidak ada linter, jadi cukup `npm run build` untuk cek error.
5. **Setiap tugas atomik selesai → commit terpisah** dengan pesan conventional commits:
   - `feat(scope): ...` — fitur baru (mis. `feat(master-data): ...`)
   - `fix(scope): ...` — perbaikan bug
   - `test(scope): ...` — penambahan/perbaikan test
   - `refactor(scope): ...` — refaktor
   - `docs(scope): ...` — dokumentasi
   - Contoh riil dari log: `feat(master-data): implement Master Data CRUD page per issue #5`
6. **Jika sebuah pengecekan tidak bisa dijalankan, tulis `TIDAK DIJALANKAN` + alasannya.** Jangan pernah menulis "lulus"/"passed" untuk pengecekan yang tidak benar-benar dijalankan.
7. **Verifikasi sebelum klaim "selesai"**:
   - Backend: `php artisan test` harus hijau.
   - Frontend: `npm run build` harus sukses.
   - UI: skrip Playwright di `tests/verify-*.mjs` harus lolah (jika menyentuh UI).
8. **Test database**: `phpunit.xml` menggunakan MySQL (`DB_DATABASE=absensi_lab`, koneksi `mysql://absensi:***@127.0.0.1:3306/absensi_lab`). Pastikan MySQL lokal berjalan sebelum `php artisan test`. Pest pakai trait `RefreshDatabase` di namespace `Feature` (lihat `tests/Pest.php`).
9. **Commit & push**: setelah fitur terverifikasi, jalankan `git add -A && git commit -m "..." && git push origin master`.
