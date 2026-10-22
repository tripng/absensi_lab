import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.MASTER_DATA_EMAIL || 'admin@absensi.com';
const PASSWORD = process.env.MASTER_DATA_PASSWORD || 'password';

const failures = [];
const pageErrors = [];
const consoleErrors = [];

function check(condition, label, detail = '') {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const stamp = Date.now();

const entities = [
  {
    key: 'guru',
    label: 'Guru',
    unique: `Guru Split ${stamp}`,
    uniqueEdited: `Guru Split Edit ${stamp}`,
    create: { nama: `Guru Split ${stamp}`, nip: `SPLIT-${stamp}`, jabatan: 'Verifikasi' },
    editField: 'nama',
    editValue: `Guru Split Edit ${stamp}`,
  },
  {
    key: 'kelas',
    label: 'Kelas',
    unique: `Split ${stamp}`,
    uniqueEdited: `Split ${stamp} Edit`,
    create: { nama_kelas: `Split ${stamp}`, tingkat: 'X', tahun_ajaran: '2029/2030' },
    editField: 'nama_kelas',
    editValue: `Split ${stamp} Edit`,
  },
  {
    key: 'ruang',
    label: 'Ruangan / Lab',
    unique: `Ruang Split ${stamp}`,
    uniqueEdited: `Ruang Split ${stamp} Edit`,
    create: { nama_ruangan: `Ruang Split ${stamp}`, kapasitas: '12' },
    editField: 'nama_ruangan',
    editValue: `Ruang Split ${stamp} Edit`,
  },
  {
    key: 'mapel',
    label: 'Mata Pelajaran',
    unique: `Mapel Split ${stamp}`,
    uniqueEdited: `Mapel Split ${stamp} Edit`,
    create: { kode_mapel: `SP-${stamp}`, nama_mapel: `Mapel Split ${stamp}`, kelompok: 'wajib' },
    editField: 'nama_mapel',
    editValue: `Mapel Split ${stamp} Edit`,
  },
];

const rows = () => page.locator('tbody tr');
const rowWith = (text) => rows().filter({ hasText: text });
const waitForFlash = (text) => page.waitForFunction(
  (needle) => document.querySelector('[role="status"]')?.innerText.includes(needle),
  text,
  { timeout: 15000 },
);

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('pageerror', (err) => {
  pageErrors.push(err.message);
  console.log('PAGEERR:', err.message.slice(0, 300));
});
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
    console.log('CONSOLE ERR:', msg.text().slice(0, 300));
  }
});
page.on('dialog', async (dialog) => {
  console.log('DIALOG:', dialog.type(), dialog.message());
  await dialog.accept();
});

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  console.log('PASS: login berhasil');

  // ------------------------------------------------------------------
  // Dashboard: 4 kartu link menuju halaman entity
  // ------------------------------------------------------------------
  await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Manajemen Master Data' }).waitFor({ state: 'visible' });
  console.log('PASS: dashboard /master-data terbuka');

  for (const entity of entities) {
    const link = page.locator(`a[href="/master-data/${entity.key}"]`);
    check((await link.count()) === 1, `dashboard punya link ke /master-data/${entity.key}`);
  }

  // ------------------------------------------------------------------
  // CRUD per entity page
  // ------------------------------------------------------------------
  for (const entity of entities) {
    const heading = `Data ${entity.label}`;
    const addButton = `Tambah ${entity.label}`;

    await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle' });
    await page.locator(`a[href="/master-data/${entity.key}"]`).click();
    await page.waitForURL(`**/master-data/${entity.key}`, { timeout: 15000 });
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible' });
    check(new URL(page.url()).pathname === `/master-data/${entity.key}`, `${entity.key}: halaman entity terbuka`);

    // tabel / empty-state tampil
    const hasTable = await page.locator('table').count();
    const hasEmpty = await page.locator('text=Belum ada data').count();
    check(hasTable > 0 || hasEmpty > 0, `${entity.key}: tabel atau empty-state tampil`);

    // form tambah tampil
    await page.getByRole('button', { name: addButton, exact: true }).click();
    const form = page.locator('#modal form');
    await form.waitFor({ state: 'visible' });
    check((await form.locator('input, select').count()) > 0, `${entity.key}: form punya field`);

    for (const [name, value] of Object.entries(entity.create)) {
      const field = form.locator(`[name="${name}"]`);
      const tag = await field.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') await field.selectOption(value);
      else await field.fill(value);
    }
    await form.locator('button[type="submit"]').click();
    await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });

    await waitForFlash('berhasil ditambahkan');
    check(true, `${entity.key}: flash create tampil`);

    await rowWith(entity.unique).first().waitFor({ state: 'visible', timeout: 15000 });
    check((await rowWith(entity.unique).count()) === 1, `${entity.key}: data baru tampil di tabel`);
    check(new URL(page.url()).pathname === `/master-data/${entity.key}`, `${entity.key}: tetap di halaman entity setelah create`);

    // edit
    await rowWith(entity.unique).first().locator('button[title="Edit"]').click();
    await page.locator('#modal form').waitFor({ state: 'visible' });
    await page.locator(`#modal [name="${entity.editField}"]`).fill(entity.editValue);
    await page.locator('#modal button[type="submit"]').click();
    await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });

    await waitForFlash('berhasil diperbarui');
    check(true, `${entity.key}: flash edit tampil`);

    await rowWith(entity.uniqueEdited).first().waitFor({ state: 'visible', timeout: 15000 });
    check((await rowWith(entity.uniqueEdited).count()) === 1, `${entity.key}: nilai baru tampil setelah edit`);
    const oldStillExact = await page.locator('tbody td').evaluateAll(
      (cells, text) => cells.some((cell) => cell.innerText.trim() === text),
      entity.unique,
    );
    check(!oldStillExact, `${entity.key}: nilai lama hilang setelah edit`);

    // delete
    await rowWith(entity.uniqueEdited).first().locator('button[title="Hapus"]').click();
    await waitForFlash('berhasil dihapus');
    check(true, `${entity.key}: flash delete tampil`);

    await page.waitForFunction(
      (text) => !Array.from(document.querySelectorAll('tbody tr')).some((tr) => tr.innerText.includes(text)),
      entity.uniqueEdited,
      { timeout: 15000 },
    );
    check((await rowWith(entity.uniqueEdited).count()) === 0, `${entity.key}: data uji terhapus`);
  }
} catch (error) {
  failures.push('exception');
  console.log('EXCEPTION:', error.message);
} finally {
  try {
    for (const entity of entities) {
      await page.goto(`${BASE_URL}/master-data/${entity.key}`, { waitUntil: 'networkidle' });
      for (const text of [entity.unique, entity.uniqueEdited]) {
        const leftover = rowWith(text);
        if (await leftover.count()) {
          await leftover.first().locator('button[title="Hapus"]').click();
          await page.waitForTimeout(1000);
        }
      }
    }
  } catch {
    // cleanup best-effort
  }

  check(pageErrors.length === 0, 'tidak ada pageerror', pageErrors.join(' | '));
  check(consoleErrors.length === 0, 'tidak ada console.error', consoleErrors.join(' | '));

  console.log(`\n=== RESULT: ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} CHECK(S) FAILED`}`);
  await browser.close();
  process.exit(failures.length === 0 ? 0 : 1);
}
