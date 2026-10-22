# plan.md — Diagnose & restore API `/api/log-akses/*` after database wipe

> Scope: **bisa dibaca, jangan ubah file selain `plan.md`**. Deliverable = file ini saja.
> Constraint proyek (lihat `AGENT.md`): **tidak tambah dependency baru**, **tidak ubah skema database**.

---

## 0. Temuan kritis (baca dulu — hasil investigasi langsung)

### Apa yang rusak
API memiliki 2 endpoint (definisi di `routes/api.php`, terdaftar di Laravel 12 via `withRouting(api: ...)` → **automatis diprefix `/api`**):

| Endpoint | Metode | Auth | Hasil tes (live, 127.0.0.1:8765) |
|---|---|---|---|
| `/api/log-akses/health` | GET | tidak | **200** `{status:ok, service:...}` ✅ |
| `/api/log-akses/batch` | POST | `auth:sanctum` Bearer | **401** `{"message":"Unauthenticated."}` ❌ |

Tanpa header `Accept: application/json`, response 302 redirect ke `/login` (standar Laravel exception handler untuk request non-JSON).

### Root cause: database dibuang/restore ulang → dua set data kritis hilang

**`personal_access_tokens` = 0 row** (bukan error query — `SELECT COUNT(*)` = 0).

```
.env → SCAN_APP_TOKEN="1|Qe9rq78nnZ8JlxfLpEE9vrYFceUSTKWrKqlE2PP197e8be81"
```

Token ID `1` tidak ada di DB. Middleware `auth:sanctum` gagal → **401 Unauthenticated** pada setiap request POST.

**Bukti:** `mysql -u absensi -pabsensi absensi_lab -N -e "SELECT COUNT(*) FROM personal_access_tokens"` → `0`. Token pernah ada (direkam di `.env` via `CreateApiToken` command, `app/Console/Commands/CreateApiToken.php`) tapi hilang ketika DB direstore.

---

**`rfid_card` = 0 row** (bukan error query — `SELECT COUNT(*)` = 0).

API validasi `StoreLogAksesBatch` mensyaratkan:
```
data.*.rfid_id  → required|integer|exists:rfid_card,id
data.*.lokasi_id → required|integer|exists:lokasi,id
```

Dengan `rfid_card` kosong, `exists:rfid_card,id` gagal untuk **setiap** nilai `rfid_id` → **422 Validation Error** (ini akan terjadi setelah auth diperbaiki).

**Bukti:** `mysql -u absensi -pabsensi absensi_lab -N -e "SELECT COUNT(*) FROM rfid_card"` → `0`. Database lama `presensi_rfid.db` (legacy SQLite) punya **4 record** rfid_card (uid: `0006030620`, `0002612308`, `0006091809`, `0006477330`).

---

**Seeders tidak menciptakan `rfid_card`** — `MasterTablesSeeder` (lokasi, kelas, labkom, ruang_ajaran, mapel, guru, admin user) dan `StudentEnrollmentSeeder` (academic_years, siswa, enrollment) **tidak pernah** insert ke tabel `rfid_card`. Jadi `migrate:fresh --seed` — meskipun berhasil — **tidak akan** memulihkan data yang API butuhkan. Ini konfirmasi: API tidak pernah "berjalan" di state post-fresh-seed tanpa tambahan seeding rfid_card.

### Apa yang TIDAK rusak (schema OK)
Skema MySQL **cocok persis** dengan migration `2026_10_09_000001_create_master_tables.php` + `database/master_schema_restore.sql`:

| Tabel | Kolom kunci | Tipe | Constraint | Cocok API? |
|---|---|---|---|---|
| `log_akses` | `waktu_scan` | varchar(16) | unique `scan_unik`(rfid_id,lokasi_id,waktu_scan) | ✅ regex `/^[0-9]+$/` OK |
| `log_akses` | `rfid_id` | int(11) | FK → rfid_card(id) | ✅ |
| `log_akses` | `lokasi_id` | int(11) | FK → lokasi(id) | ✅ |
| `rfid_card` | `id` | int(11) AI | PK | ✅ (exists rule OK, tapi data kosong) |
| `rfid_card` | `uid` | text | unique | ✅ |
| `rfid_card` | `pengguna_id` | int(11) | FK → pengguna(id) | ✅ |
| `lokasi` | `id` | int(11) AI | PK | ✅ (3 row ada) |

Kontroller `LogAksesController::storeBatch` dan `StoreLogAksesBatch` request **tidak punya bug kode** — logika bulk `insertOrIgnore` + dedup dua lapis sudah benar. API memang memerlukan data referensi yang kini hilang.

### Data state saat ini (post-restore MySQL)

| Tabel | Count | Catatan |
|---|---|---|
| `personal_access_tokens` | **0** ❌ | token Sanctum hilang |
| `rfid_card` | **0** ❌ | data RFID hilang |
| `log_akses` | **0** ❌ | data log hilang |
| `lokasi` | 3 ✅ | dari seeder |
| `pengguna` | 7 ✅ | 5 guru + 2 siswa (dari seeder) |
| `users` | 1 ✅ | admin@absensi.com |
| `migrations` | 11 (semua batch 1) ✅ | semua migration terjalan |

### Catatan schema sampingan (TUDAK break API, diluar scope)
`v_scan_lookup` view berubah dari versi lama (`presensi_rfid.db`):

- **Lama** (SQLite): `uid` kolom pertama, ada `WHERE r.status='aktif' AND p.status_aktif='aktif'`, INNER JOIN rfid_card
- **Baru** (MySQL): `uid` kolom terakhir, tidak ada WHERE clause, LEFT JOIN rfid_card

Perubahan ini **tidak memengaruhi API** (`LogAksesController` tidak pernah query `v_scan_lookup`). Dipakai oleh controller web (`AbsensiController`, `DataController`) yang mereferensi kolom **by name** (bukan posisi), jadi column-order change aman — tapi WHERE clause removal berarti view kini mengembalikan user tidak-aktif juga (behavioral change untuk UI web, bukan API).

---

## 1. Tujuan (1 paragraf)

Diagnosa dan membetulkan API absensi_lab (`POST /api/log-akses/batch`) yang berhenti berfungsi setelah database dibersihkan/restore ulang. Akar masalah bukan kode — bukan migrasi schema yang salah, bukan bug logika controller — melainkan **data referensi yang hilang**: tabel `personal_access_tokens` kosong (Sanctum token di `.env` sudah tidak valid → 401) dan `rfid_card` kosong (validasi `exists:rfid_card,id` akan gagal → 422). Seeder yang ada tidak pernah menciptakan `rfid_card` records, jadi `migrate:fresh --seed` tidak cukup untuk memulihkan API. Perbaikan: (1) recreat token Sanctum via command `api:token`, (2) seed data `rfid_card` via `MasterTablesSeeder`, (3) restore data lama dari `presensi_rfid.db` jika diperlukan. Tidak ada perubahan skema DB, tidak ada dependency baru, tidak ada perubahan logika API.

---

## 2. Keputusan yang dikunci

| # | Kontroversi | Keputusan | Fakta / alasan |
|---|---|---|---|
| D1 | Akar masalah? | **Data kosong** (token + rfid_card), bukan kode/schema bug. | Schema MySQL cocok migrasi 1:1; Pest 69/69 lulus; `/api/log-akses/health` 200; batch 401 karena token 0 row; rfid_card 0 row akan bikin 422. |
| D2 | Perbaiki via kode atau data? | **Data** — re-create token via `api:token` command + seed rfid_card via seeder. | `LogAksesController` + `StoreLogAksesBatch` logika sudah benar; tidak perlu edit API code. |
| D3 | Sumber data rfid_card? | **Seed minimal** di `MasterTablesSeeder` (≥1 rfid_card untuk seeded user). Script restore data lama (`presensi_rfid.db`) **optional** — gunakan mapping old-ID→new-ID by nisn/nip. | Old DB punya 4 rfid_card (uid: 0006030620→pengguna_id 2, uid 0002612308→1, uid 0006091809→3, uid 0006477330→598) — 3 siswa + 1 guru. MySQL baru punya 7 pengguna (2 siswa + 5 guru), semua ID berbeda. |
| D4 | Token Sanctum? | Recreate via `php artisan api:token "scan-app" --user-email=admin@absensi.com --save-to-env=SCAN_APP_TOKEN`. | Command sudah ada di `app/Console/Commands/CreateApiToken.php`; opsi `--save-to-env` update `.env` otomatis. |
| D5 | `v_scan_lookup` view WHERE clause restore? | **Tidak.** Luar scope API. Perlu migration baru (diskusi terpisah). | API tidak query view; hanya web controller. |
| D6 | Pest test untuk API? | Tambahkan test API di `tests/Feature/Api/LogAksesApiTest.php` (gunakan token + rfid_card dari seeder). | Pest suite + RefreshDatabase sudah tersetup (phpunit.xml → mysql). |
| D7 | Scan app tidak tahu prefix `/api`? | **Dokumentasikan ke operator scan app** — endpoint sebenarnya `POST /api/log-akses/batch`. Jika scan app hardcode `/log-akaos/batch` (tanpa prefix), tambahkan route alias di `routes/api.php` (task opsional, butuh file change). | Live test: `/log-akses/health` → 404, `/api/log-akses/health` → 200. Scan app harus pake prefix `/api`. |
| D8 | `waktu_scan` format? | **Kompatibel** — old data sudah numeric epoch (`1790736484`), new schema `varchar(16)`, API regex `/^[0-9]+$/`. | Tidak perlu tindakan. |

---

## 3. File yang boleh diubah / dibuat

**Data / runtime (bukan source code):**
- `.env` — di-update otomatis oleh command `api:token --save-to-env=SCAN_APP_TOKEN`

**Edit — seeder (tambahkan rfid_card seeding):**
- `database/seeders/MasterTablesSeeder.php` — insert minimal 1 rfid_card record yang valid (referensi ke `pengguna_id` yang ada, `lokasi_id` yang ada) agar `exists:rfid_card,id` pernah bernilai benar.

**Baru — script restore data lama (optional):**
- `database/scripts/migrate_rfid_from_sqlite.php` — one-off PHP script: baca `presensi_rfid.db` → insert rfid_card/log_akses ke MySQL dengan mapping (lihat D3).

**Baru — API test:**
- `tests/Feature/Api/LogAksesApiTest.php` — Pest test: health 200, batch dengan token valid + rfid_card ada → 201/200 success=true, batch dengan rfid_id tidak ada → 422.

**Baru — verifikasi ekselusi API:**
- `tests/verify-api-fix.mjs` — Playwright/curl-style: start server → health 200 → batch 401 (no token) → batch 200 (token + valid rfid_id) → batch 422 (invalid rfid_id).

**Baru — dokumen ini:**
- `plan.md` (di-refresh).

---

## 4. File yang TIDAK boleh diubah

- `routes/api.php` — route definisi sudah benar (2 endpoint, prefix `/api` otomatis Laravel 12).
- `app/Http/Controllers/Api/LogAksesController.php` — logika bulk insert + dedup sudah benar.
- `app/Http/Requests/StoreLogAksesBatch.php` — validasi `exists:rfid_card,id` dan `exists:lokasi,id` memang dimaksudkan; perbaikan adalah datanya, bukan rule-nya.
- `database/migrations/*` — **tidak ada perubahan skema** (AGENT.md rule 2).
- `database/master_schema_restore.sql` — reference / restore script, jangan diubah.
- `presensi_rfid.db` — database SQLite lama, referensi saja, jangan dimodifikasi.
- `app/Http/Controllers/AbsensiController.php`, `app/Http/Controllers/DataController.php` — web controller, tidak menyentuh API scope (meski memakai `v_scan_lookup`).
- `app/Models/*` — model sudah benar.
- `config/*` (termasuk `config/auth.php`, `config/database.php`) — guard + koneksi sudah benar.
- `composer.json`, `package.json` — tidak ada dependency baru.
- `composer.lock`, `vendor/*`, `node_modules/*`, `public/build/*`.
- `.env.example` — hanya update `.env` runtime (via command), jangan sampai `.env.example` asing.

---

## 5. Tugas atomik (maksimal 6 — masing-masing satu commit)

| # | Commit | File(s) | Rangkuman |
|---|---|---|---|
| 1 | `fix(api): recreate Sanctum API token via api:token command` | `.env` (runtime) | Jalankan `php artisan api:token "scan-app" --user-email=admin@absensi.com --save-to-env=SCAN_APP_TOKEN`. Verifikasi `SELECT COUNT(*) FROM personal_access_tokens` = 1. |
| 2 | `fix(api): seed rfid_card reference data in MasterTablesSeeder` | `database/seeders/MasterTablesSeeder.php` | Tambahkan ≥1 `rfid_card` record yang valid (uid + pengguna_id seeded + status 'aktif'). Cukup 1 record untuk dev/test agar `exists:rfid_card,id` punya nilai TRUE. |
| 3 | ~~`chore(api): restore rfid_card + log_akses data from presensi_rfid.db`~~ | — | ⛔ **SKIP** — mapping old nisn/nip → MySQL hasilkan 0 match (lihat Q2). Pengguna memilih opsi (a) seed minimal di task 2. Data lama (presensi_rfid.db) tidak direstore. Tidak ada file dibuat. |
| 4 | `test(api): add Pest LogAksesApiTest` | `tests/Feature/Api/LogAksesApiTest.php` (baru) | Health endpoint 200; batch dengan token valid + rfid_card ada → 200 + `success=true`; batch dengan rfid_id tidak ada → 422. |
| 5 | `test(api): add verify-api-fix.mjs smoke test` | `tests/verify-api-fix.mjs` (baru) | curl-based: health 200, batch tanpa token 401, batch dengan token+rfid_id valid 200, batch dengan rfid_id tidak ada 422. |
| 6 | `chore(api): pint + build + full test gate` | laporan hijau | `./vendor/bin/pint`; `npm run build`; `php artisan test` (69+ passed termasuk LogAksesApiTest baru). |

> Task 3 (restore data lama) **optional** — boleh dilewati jika tugas 2 (seed rfid_card) sudah cukup untuk API berfungsi. Task 3 bersumber data historis 20 record log_akses; jika tidak perlu history, lewati.

---

## 6. Tugas verifikasi (perintah persis — jalankan berurutan)

```bash
# 0. preflight
cd /home/tripng/Projects/absensi_lab
php artisan config:clear

# 1. format PHP (apply sebelum commit)
./vendor/bin/pint
./vendor/bin/pint --test   # EXPECTED: 0 diff / exit 0

# 2. frontend build
npm run build              # EXPECTED: exit 0 → public/build/

# 3. Seed + token (setelah task 1+2+3 selesai)
php artisan migrate:fresh --seed
# (jika task 3: php database/scripts/migrate_rfid_from_sqlite.php)
php artisan api:token "scan-app" --user-email=admin@absensi.com --save-to-env=SCAN_APP_TOKEN

# 4. Persiapkan env & DB untuk manual test
mysql -h 127.0.0.1 -P 3306 -u absensi -pabsensi absensi_lab -e "
SELECT COUNT(*) AS token_count FROM personal_access_tokens;
SELECT COUNT(*) AS rfid_count FROM rfid_card;
SELECT COUNT(*) AS lokasi_count FROM lokasi;
"   # EXPECTED: token_count ≥1, rfid_count ≥1, lokasi_count ≥1

# 5. Start server + API smoke test
php artisan serve --port=8765 --host=127.0.0.1 &
sleep 2

# Health (tanpa auth)
TOK=$(grep '^SCAN_APP_TOKEN=' .env | sed 's/SCAN_APP_TOKEN="\([^"]*\)"/\1/')
RFID_ID=$(mysql -h 127.0.0.1 -P 3306 -u absensi -pabsensi absensi_lab -N -e "SELECT id FROM rfid_card LIMIT 1;")
LOKASI_ID=$(mysql -h 127.0.0.1 -P 3306 -u absensi -pabsensi absensi_lab -N -e "SELECT id FROM lokasi LIMIT 1;")

echo "--- Health (no auth) ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8765/api/log-akses/health
# EXPECTED: HTTP 200

echo "--- Batch WITHOUT token ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST http://127.0.0.1:8765/api/log-akses/batch \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"data\":[{\"rfid_id\":${RFID_ID},\"lokasi_id\":${LOKASI_ID},\"jenis\":\"masuk\",\"waktu_scan\":\"$(date +%s)\",\"status\":\"berhasil\",\"keterangan\":null}]}"
# EXPECTED: HTTP 401 (tanpa token, selayumnya 401 juga — ini baseline)

echo "--- Batch WITH valid token + valid rfid_id ---"
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST http://127.0.0.1:8765/api/log-akses/batch \
  -H "Authorization: Bearer ${TOK}" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"data\":[{\"rfid_id\":${RFID_ID},\"lokasi_id\":${LOKASI_ID},\"jenis\":\"masuk\",\"waktu_scan\":\"$(date +%s)\",\"status\":\"berhasil\",\"keterangan\":null}]}"
# EXPECTED: HTTP 200 + {"success":true,"inserted":1,...}

echo "--- Batch WITH valid token + INVALID rfid_id (validation should fail) ---"
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST http://127.0.0.1:8765/api/log-akses/batch \
  -H "Authorization: Bearer ${TOK}" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"data\":[{\"rfid_id\":99999,\"lokasi_id\":${LOKASI_ID},\"jenis\":\"masuk\",\"waktu_scan\":\"$(date +%s)\",\"status\":\"berhasil\",\"keterangan\":null}]}"
# EXPECTED: HTTP 422 (validation error — rfid_id tidak ada di rfid_card)

# 6. Pest (termasuk LogAksesApiTest baru)
php artisan test --filter=LogAksesApiTest
# EXPECTED: semua passed

# 7. Full Pest regression
php artisan test
# EXPECTED: 69+ passed (460+ assertions), tidak ada regresi

# hentikan server
pkill -f "php artisan serve --port=8765"
```

### Standar lulus tiap gate
- `pint --test`: 0 diff.
- `npm run build`: exit 0.
- `mysql personal_access_tokens`: count ≥ 1.
- `mysql rfid_card`: count ≥ 1.
- Health `curl`: HTTP 200, body `{status:ok}`.
- Batch tanpa token: HTTP 401 `Unauthenticated` (baseline, expected).
- Batch dengan token + rfid_id valid: HTTP 200, body `{"success":true,"inserted":≥1,...}`.
- Batch dengan token + rfid_id tidak ada: HTTP 422 `Validation Error`.
- `php artisan test --filter=LogAksesApiTest`: passed.
- `php artisan test`: full suite hijau, tidak regresi.

---

## 7. Di luar cakupan

- Rename folder `resources/js/Pages/ManagementClass/` (sudah di-resolve di plan.md sebelumnya).
- `v_scan_lookup` view WHERE clause restore (`r.status='aktif' AND p.status_aktif='aktif'`) — butuh migration baru, termasuk skema DB, dan tidak memengaruhi API.
- Penuhkan `log_akses` 20 record lama jika tidak dibutuhkan untuk API (hanya data historis UI web).
- UI/UX halaman absensi web (`AbsensiController` / `DataController`) — view query column order sudah aman (by-name access); data kosong karena restore, bukan bug kode.
- Deployment ke Hostinger / production hardening / SSL.
- Penambahan dependency (mis. `league/csv` untuk export) — tidak diperlukan.
- Schema change apapun (ALTER TABLE, DROP COLUMN, dsb.) — dilarang oleh constraint.

---

## Pertanyaan terbuka (TERJAWAB)

1. **Q1 (sumber rfid_card data):** → **Seed minimal.** Cukup 1 `rfid_card` record di `MasterTablesSeeder` untuk dev/test agar `exists:rfid_card,id` punya nilai benar. Full restore data lama (task 3) bersifat optional.

2. **Q2 (mapping ID lama → baru):** → **SKIP — keputusan: opsi (a).** Mapping old nisn/nip → MySQL hasilkan 0 match (lihat tabel di bawah). Pengguna memilih opsi (a): **lewati task 3**, cukup seed minimal di task 2. Data lama (`presensi_rfid.db`) tidak direstore. Tanpa keputusan ini, task 3 akan tetap BLOCKED per AGENT.md rule 3.

**Old DB** (`presensi_rfid.db`) — 4 rfid_card:

| uid | old pengguna_id | tipe | nisn/nip |
|---|---|---|---|
| `0006030620` | 2 | siswa | nisn=115571177 |
| `0002612308` | 1 | siswa | nisn=3117754351 |
| `0006091809` | 3 | siswa | nisn=112395623 |
| `0006477330` | 598 | guru | nip=198108202023211009 |

**MySQL sekarang** — 7 pengguna, tidak ada nisn/nip yang cocok:

| id | tipe | nama | nisn | nip |
|---|---|---|---|---|
| 1 | guru | Rina Sari, S.Kom. | NULL | 198001012005011001 |
| 6 | siswa | Ahmad Fauzi | 0061234567 | NULL |
| 7 | siswa | Siti Nurhaliza | 0067654321 | NULL |
| ... | ... (5 guru + 2 siswa) | — | — | — |

**Konsekuensi:** 4 rfid_card lama FK ke pengguna_id yang tidak ada di MySQL → `insert` akan gagal (FK constraint). 20 log_akses juga gagal (FK rfid_id). Tanpa membuat/meng-upsert 4 pengguna lama, restore data lama **tidak mungkin** tanpa keluar dari plan (membuat user baru ≠ seed minimal, ≠ "tidak ubah skema").

**Opsi:**
- **(a) Lewati task 3** (rekomendasi — sudah optional di plan §5). Seed minimal 1 rfid_card di task 2 cukup untuk API berfungsi. Data lama dibiarkan.
- **(b) Ijin khusus:** buat 4 pengguna lama di `pengguna` + `siswa`/`guru` tables sebagai bagian restore (task 3), sehingga FK valid. Ini berarti menambah data master (bukan schema change) — **perlu approval eksplisit pengguna** karena keluar dari "seed minimal" rekomendasi.

Per AGENT.md rule 3: tanpa keputusan (a) atau (b), task 3 akan tetap **BLOCKED**. **Keputusan sudah diambil:** opsi (a) — task 3 dilewati, data lama tidak direstore. ✅

3. **Q3 (token persistence):** **Dilanjutkan.** Pertahankan `--save-to-env` pola. `.env` plaintext adalah accepted risk untuk dev; production gunakan env server variable.

4. **Q4 (scan app URL):** → **Butuh tindakan.** Scan app belum tahu prefix `/api`. Endpoint sebenarnya `POST /api/log-akses/batch` (bukan `/log-akses/batch`). Perlu dokumentasikan ke operator, atau tambahkan route alias di `routes/api.php` (D7 → task opsional).

5. **Q5 (waktu_scan format):** → **Kompatibel.** Old data sudah numeric epoch (`1790736484`), bukan ISO8601. `waktu_scan varchar(16)` + regex `/^[0-9]+$/` semua cocok. Tidak perlu tindakan.

---

### Mapping ID old → new (untuk task 3, bila diputuskan restore penuh)

`presensi_rfid.db` rfid_card records → MySQL mapping:

| uid (old) | old pengguna_id | tipe | old nisn/nip | notes |
|---|---|---|---|---|
| `0006030620` | 2 | siswa | nisn=115571177 | ID 2 tidak ada di MySQL baru (hanya 7 pengguna) |
| `0002612308` | 1 | siswa | nisn=3117754351 | ID 1 tidak cocok (MySQL ID 1 = 'Admin Absensi' di users, bukan pengguna) |
| `0006091809` | 3 | siswa | nisn=112395623 | ID 3 tidak ada di MySQL baru |
| `0006477330` | 598 | guru | nip=198108202023211009 | ID 598 tidak ada di MySQL baru |

**Implikasi:** restore data lama membutuhkan mapping cross-table (nisn/nip → new pengguna_id), bukan simple ID copy. Ini kompleks untuk 4-record sampai 20-record log_akses + 607 pengguna penuh. Rekomendasi: cukup **seed minimal** (Q1) untuk API berfungsi; full restore hanya bila butuh history lama.

---

*Dokumen ini dibuat dari bacaan read-only (kecuali `.env` via terminal untuk bacaan saja, dan `php artisan serve` untuk tes HTTP). Tidak ada file sumber yang dimodifikasi kecuali `plan.md`:*
- `routes/api.php` — 2 route terdaftar, dikonfirmasi via `php artisan route:list --path=api`
- `app/Http/Controllers/Api/LogAksesController.php` — full read; logika `storeBatch` + dedup OK
- `app/Http/Requests/StoreLogAksesBatch.php` — full read; rule `exists:rfid_card,id` / `exists:lokasi,id` jelas
- `config/auth.php` — hanya `web` guard; Sanctum auth lewat `HasApiTokens` trait + `auth:sanctum` middleware
- `config/database.php` — `DB_CONNECTION=mysql`, default DB `absensi_lab`
- `.env` — `DB_CONNECTION=mysql`, `SCAN_APP_TOKEN` ada (token ID 1, sudah tidak valid)
- `database/master_schema_restore.sql` — full read; schema master definisi
- `database/migrations/2026_10_09_000001_create_master_tables.php` — full read; log_akses/rfid_card/lokasi definisi
- `presensi_rfid.db` (SQLite) — schema + data diekspor via `sqlite3`; 4 rfid_card, 20 log_akses, 607 pengguna
- Live API test: `GET /api/log-akses/health` → 200; `POST /api/log-akses/batch` (Bearer token) → 401; `POST /api/log-akses/batch` (Accept: JSON, Bearer token) → 401 `{"Unauthenticated."}`
- `mysql` schema dump: semua kolom/tipe/FK pada log_akses/rfid_card/lokasi/pengguna cocok migrasi
- `php artisan list api` → `api:token` terdaftar (CreateApiToken command)
- `git status` → bersih; `php artisan test` baseline: 69 passed (dari AGENT.md)