-- Restore master table schema untuk absensi_lab (fresh state).
-- Dihasilkan dari database/schema lama (SQLite presensi_rfid.db) → MySQL.
-- Kolom PK guru/kelas/labkom/pengguna/siswa/lokasi = int(11) SIGNED,
-- agar mapel → jadwal FK signed int cocok.
-- Tabel log_akses disamakan dengan definisi lama (tidak ada kolom baru).

SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS log_akses, rfid_card, siswa, guru, kelas, labkom, pengguna, lokasi;
DROP VIEW   IF EXISTS v_scan_lookup;

SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE lokasi (
    id          INT             NOT NULL AUTO_INCREMENT,
    nama_lokasi TEXT            NOT NULL,
    jenis       ENUM('gerbang','lab','kelas','lainnya') DEFAULT 'lainnya',
    created_at  TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE labkom (
    id              INT         NOT NULL AUTO_INCREMENT,
    lokasi_id       INT         NULL,
    total_komputer  INT         NOT NULL,
    jumlah_baris    INT         NOT NULL,
    jumlah_kolom    INT         NULL,
    created_at      TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_labkom_lokasi (lokasi_id),
    CONSTRAINT labkom_lokasi_id_foreign
        FOREIGN KEY (lokasi_id) REFERENCES lokasi(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pengguna (
    id          INT         NOT NULL AUTO_INCREMENT,
    tipe        ENUM('siswa','guru') NOT NULL,
    nama        TEXT        NOT NULL,
    foto_path   TEXT        NULL,
    status_aktif ENUM('aktif','nonaktif') DEFAULT 'aktif',
    created_at  TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pengguna_tipe (tipe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE kelas (
    id          INT         NOT NULL AUTO_INCREMENT,
    nama_kelas  TEXT        NOT NULL,
    tingkat     TEXT        NULL,
    tahun_ajaran TEXT       NULL,
    created_at  TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guru (
    id          INT         NOT NULL,
    nip         TEXT        NOT NULL,
    jabatan     TEXT        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unik_nip (nip),
    CONSTRAINT guru_id_foreign
        FOREIGN KEY (id) REFERENCES pengguna(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE siswa (
    id          INT         NOT NULL,
    nisn        TEXT        NOT NULL,
    tahun_masuk INT         NOT NULL,
    kelas_id    INT         NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unik_nisn (nisn),
    KEY idx_siswa_kelas (kelas_id),
    CONSTRAINT siswa_id_foreign
        FOREIGN KEY (id) REFERENCES pengguna(id)
        ON DELETE CASCADE,
    CONSTRAINT siswa_kelas_id_foreign
        FOREIGN KEY (kelas_id) REFERENCES kelas(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rfid_card (
    id              INT         NOT NULL AUTO_INCREMENT,
    uid             TEXT        NOT NULL,
    pengguna_id     INT         NOT NULL,
    status          ENUM('aktif','hilang','nonaktif') DEFAULT 'aktif',
    tanggal_terdaftar TEXT      NULL,
    created_at      TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unik_uid (uid),
    KEY idx_rfid_pengguna (pengguna_id),
    KEY idx_rfid_status (status),
    CONSTRAINT rfid_card_pengguna_id_foreign
        FOREIGN KEY (pengguna_id) REFERENCES pengguna(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE log_akses (
    id          INT         NOT NULL AUTO_INCREMENT,
    rfid_id     INT         NOT NULL,
    lokasi_id   INT         NOT NULL,
    jenis       TEXT        NOT NULL,
    -- waktu_scan disimpan sebagai unix-epoch numeric string, sehingga dapat
    -- dipakai sebagai unique key (varchar) untuk dedup tingkat DB.
    waktu_scan  VARCHAR(16) NOT NULL,
    status      TEXT        NOT NULL,
    keterangan  TEXT        NULL,
    status_sync TINYINT(1)  DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_log_akses_rfid (rfid_id),
    KEY idx_log_akses_lokasi (lokasi_id),
    UNIQUE KEY unik_scan (rfid_id, lokasi_id, waktu_scan),
    CONSTRAINT log_akses_rfid_id_foreign
        FOREIGN KEY (rfid_id) REFERENCES rfid_card(id)
        ON DELETE CASCADE,
    CONSTRAINT log_akses_lokasi_id_foreign
        FOREIGN KEY (lokasi_id) REFERENCES lokasi(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE VIEW v_scan_lookup AS
SELECT
    p.id AS pengguna_id,
    p.tipe,
    p.nama,
    p.foto_path,
    p.status_aktif,
    s.kelas_id,
    k.nama_kelas,
    k.tingkat,
    s.id AS siswa_id,
    s.nisn,
    g.id AS guru_id,
    g.nip,
    g.jabatan,
    r.uid
FROM pengguna p
LEFT JOIN rfid_card r ON r.pengguna_id = p.id
LEFT JOIN siswa s ON s.id = p.id
LEFT JOIN kelas k ON k.id = s.kelas_id
LEFT JOIN guru g ON g.id = p.id;
