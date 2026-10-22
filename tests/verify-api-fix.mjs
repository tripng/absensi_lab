import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const envPath = new URL('../.env', import.meta.url);
const envContent = fs.readFileSync(envPath, 'utf8');

function envValue(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) {
    throw new Error(`${key} tidak ditemukan di .env`);
  }

  return match[1].trim().replace(/^"(.*)"$/, '$1');
}

function dbValue(sql) {
  return execFileSync(
    'mysql',
    [
      '-h', envValue('DB_HOST'),
      '-P', envValue('DB_PORT'),
      '-u', envValue('DB_USERNAME'),
      `-p${envValue('DB_PASSWORD')}`,
      envValue('DB_DATABASE'),
      '-N',
      '-e', sql,
    ],
    { encoding: 'utf8' }
  ).trim();
}

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8765';
const token = process.env.SCAN_APP_TOKEN ?? envValue('SCAN_APP_TOKEN');
const rfidId = Number(process.env.RFID_ID ?? dbValue('SELECT id FROM rfid_card ORDER BY id LIMIT 1'));
const lokasiId = Number(process.env.LOKASI_ID ?? dbValue('SELECT id FROM lokasi ORDER BY id LIMIT 1'));

let failures = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: expected ${expected}, got ${actual}`);
  if (!ok) {
    failures++;
  }
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();

  return { status: response.status, body };
}

function batchOptions({ rfidId, waktuScan, authenticated }) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authenticated) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        {
          rfid_id: rfidId,
          lokasi_id: lokasiId,
          jenis: 'masuk',
          waktu_scan: waktuScan,
          status: 'berhasil',
          keterangan: null,
        },
      ],
    }),
  };
}

console.log(`Base URL: ${baseUrl}`);
console.log(`rfid_id: ${rfidId}, lokasi_id: ${lokasiId}`);

let health;
try {
  health = await request('/api/log-akses/health');
} catch {
  console.error(`Server tidak dapat dihubungi di ${baseUrl}. Jalankan "php artisan serve --port=8765" terlebih dahulu.`);
  process.exit(1);
}

check('health status', health.status, 200);
check('health body.status', JSON.parse(health.body).status, 'ok');

const noToken = await request('/api/log-akses/batch', batchOptions({
  rfidId,
  waktuScan: String(Date.now()),
  authenticated: false,
}));
check('batch tanpa token', noToken.status, 401);

const valid = await request('/api/log-akses/batch', batchOptions({
  rfidId,
  waktuScan: String(Date.now() + 1),
  authenticated: true,
}));
check('batch dengan token + rfid_id valid', valid.status, 200);
const validBody = JSON.parse(valid.body);
check('batch success', validBody.success, true);
check('batch inserted', validBody.inserted, 1);

const invalid = await request('/api/log-akses/batch', batchOptions({
  rfidId: 99999,
  waktuScan: String(Date.now() + 2),
  authenticated: true,
}));
check('batch dengan rfid_id tidak ada', invalid.status, 422);

console.log(failures === 0 ? '\nALL API CHECKS PASSED' : `\n${failures} API CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
