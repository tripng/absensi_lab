# Plan: Management Master Data — Extend CRUD ke Siswa, Lokasi, Labkom

**Issue:** #6 (baru)
**Branch:** `management-master-data`
**Status:** Rencana
**Author:** agen

---

## 1. Latar belakang

Branch `management-master-data` bertujuan meluasiskan halaman **Manajemen Master Data**
(`/master-data`) agar mengelola tiga entitas master yang sudah ada di skema database
tapi belum ada CRUD-nya:

| Entitas  | Tabel        | Relasi ekisting                                   | CRUD existing? |
|----------|--------------|--------------------------------------------------|----------------|
| Siswa    | `siswa`      | 1:1 `pengguna` (shared PK `siswa.id = pengguna.id`), many-to-one `kelas` | ❌ |
| Lokasi   | `lokasi`      | hasOne `labkom`                                  | ❌ |
| Labkom   | `labkom`      | belongsTo `lokasi`, hasOne `ruang_ajaran`        | ❌ |

CRUD untuk **Guru, Kelas, Ruahan/Lab, Mapel** sudah ada (issue #5). Polanya memakai
route parameter `{entity}` di `MasterDataController`. Entitas baru akan mengikuti
pola yang sama — **tidak perlu migration baru** karena semua tabel sudah ada di
`2026_10_09_000001_create_master_tables.php`.

---

## 2. Ruang lingkup (in scope)

### 2.1. `MasterDataController` — tambah 3 tab + logika CRUD

**`TABS` constant** — tambahkan tiga entry:

```php
'siswa'  => 'Siswa',
'lokasi' => 'Lokasi',
'labkom' => 'Labkom',
```

Urutan akhir: `guru, kelas, ruang, siswa, lokasi, labkom, mapel`.

#### List helpers (baru)

- **`siswaList()`** — join `siswa` → `pengguna` + `kelas`:
  - kolom: `id, nama, nisn, tahun_masuk, kelas_label`

- **`lokasiList()`** — query `lokasi`:
  - kolom: `id, nama_lokasi, jenis, jenis_label`

- **`labkomList()`** — join `labkom` → `lokasi`:
  - kolom: `id, total_komputer, jumlah_baris, jumlah_kolom, lokasi_label`

#### Form config (baru)

- **`siswa`**
  - `nama` — text, required (dari `pengguna.nama`)
  - `nisn` — text, required, unique `siswa.nisn`
  - `tahun_masuk` — number, required
  - `kelas_id` — select (opsional), options dari `kelasList()`

- **`lokasi`**
  - `nama_lokasi` — text, required
  - `jenis` — select, options: `gerbang, lab, kelas, lainnya`

- **`labkom`**
  - `lokasi_id` — select (opsional), options dari `lokasiList()` (jenis = 'lab')
  - `total_komputer` — number, required
  - `jumlah_baris` — number, required
  - `jumlah_kolom` — number (opsional)

#### Validation rules (baru)

- `siswa` — unique ignore `siswa.nisn`; `kelas_id` exists `kelas,id` nullable
- `lokasi` — `jenis` in:gerbang,lab,kelas,lainnya
- `labkom` — `lokasi_id` exists `lokasi,id` nullable; integer min:1

#### Persistence (baru) — semua wrapped `DB::transaction()`

- **`createRecord` — siswa:**
  - Insert `pengguna` (tipe='siswa', nama, status_aktif='aktif'), pakai `insertGetId`
  - Insert `siswa` (id=penggunaId, nisn, tahun_masuk, kelas_id)
  - Konsep sama seperti `guru` di `createRecord` yang ada.

- **`createRecord` — lokasi:**
  - Insert `lokasi` (nama_lokasi, jenis)

- **createRecord — labkom:**
  - Insert `labkom` (lokasi_id nullable, total_komputer, jumlah_baris, jumlah_kolom nullable)

- **`updateRecord` — siswa:**
  - Update `pengguna.nama` + `siswa.nisn/tahun_masuk/kelas_id`

- **`updateRecord` — lokasi:**
  - Update `lokasi.nama_lokasi/jenis`

- **`updateRecord` — labkom:**
  - Update `labkom.lokasi_id/total_komputer/jumlah_baris/jumlah_kolom`

- **`deleteRecord` — semua:** delete by id (siswa hapus `pengguna` → cascade ke `siswa`;
  lokasi/labkom delete langsung).

### 2.2. Frontend `resources/js/Pages/MasterData/Index.jsx`

- Tambahkan entry di `columnsFor` untuk `siswa, lokasi, labkom`
- Tambahkan icon di `tabIcon()`
- Komponen form sudah data-driven dari `formConfig` → otomatis render.

### 2.3. Seeder

Update `MasterTablesSeeder` — tambahkan seed data contoh:
- 1–2 siswa (NISN, tahun_masuk=2026, kelas_id ke X.1)
- 1 lokasi tambahan (mis. 'Gerbang Selatan', jenis='gerbang')
- 1 labkom tambahan (mis. labkom 2, lokasi_id ke lokasi new, 40 komputer, 8 baris, 5 kolom)

> **Constraint:** tidak mengubah data seed yang sudah ada (kelas X.1–X.15, labkom 1, dst.)

### 2.4. Test

**Pest feature test** — `tests/Feature/MasterDataExtendedTest.php`:

- `test_siswa_crud` — create siswa, verify di database, update, delete
- `test_lokasi_crud` — create lokasi, verify, update jenis, delete
- `test_labkom_crud` — create labkom, verify, update total_komputer, delete
- `test_siswa_validates_nisn_unique` — duplicate NISN → 422
- `test_master_data_page_renders_new_tabs` — GET `/master-data` → response mengandung 'siswa','lokasi','labkom' di props

Target: 5 test, semua hijau.

---

## 3. Di luar ruang lingkup (out of scope)

- ✅ — Semua tabel sudah ada, **tidak boleh edit migration lama**.
- ❌ — Tidak menambah entitas baru di luar siswa/lokasi/labkom.
- ❌ — Tidak mengubah pola entity-based routing yang ada.
- ❌ — Tidak menambah halaman baru; semua lewat `/master-data`.

---

## 4. Langkah kerja (step order)

1. Patch `MasterDataController` — TABS, list helpers, form config, rules, persistence
2. Patch `MasterData/Index.jsx` — columnsFor, tabIcon
3. Update `MasterTablesSeeder` — seed data contoh
4. Buat `tests/Feature/MasterDataExtendedTest.php`
5. `./vendor/bin/pint` — format PHP
6. `php artisan migrate:fresh --seed` — verifikasi seed
7. `php artisan test --filter=MasterDataExtendedTest` — hijau
8. `npm run build` — build sukses
9. Commit per atom: `feat(master-data): ...`, `test(master-data): ...`, `seed(master-data): ...`
10. Push ke `origin/management-master-data`
11. (Opsional) buat PR ke master

---

## 5. Verifikasi akhir (acceptance)

- [ ] `php artisan test` — semua hijau (termasuk test baru)
- [ ] `npm run build` — sukses
- [ ] `php artisan migrate:fresh --seed` — seed baru muncul, tidak error
- [ ] Halaman `/master-data` render tab Siswa, Lokasi, Labkom
- [ ] CRUD tiap entitas berfungsi (create → list → edit → update → list → delete → list kosong)
- [ ] Form validation menampilkan error saat input duplikat/required kosong

---

## 6. Ringkasan file yang disentuh

| No | File | Aksi |
|----|------|------|
| 1 | `app/Http/Controllers/MasterDataController.php` | Edit — tambah 3 entitas |
| 2 | `resources/js/Pages/MasterData/Index.jsx` | Edit — kolom + icon baru |
| 3 | `database/seeders/MasterTablesSeeder.php` | Edit — data contoh |
| 4 | `tests/Feature/MasterDataExtendedTest.php` | Buat baru |
| 5 | `plan.md` | Buat (ini) |
