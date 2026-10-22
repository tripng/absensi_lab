import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.MASTER_DATA_EMAIL || 'admin@absensi.com';
const PASSWORD = process.env.MASTER_DATA_PASSWORD || 'password';

const failures = [];
const pageErrors = [];
const consoleErrors = [];
const guruPostStatuses = [];

function check(condition, label, detail = '') {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const stamp = Date.now();
const guruName = `Guru E2E ${stamp}`;

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
page.on('response', (response) => {
  if (response.request().method() === 'POST' && response.url().includes('/master-data/guru')) {
    guruPostStatuses.push(response.status());
  }
});

try {
  // Login fresh — sesi/cookie baru, skenario yang sama dengan setelah migrate:fresh.
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  console.log('PASS: login fresh berhasil');

  await page.goto(`${BASE_URL}/master-data/guru`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Data Guru' }).waitFor({ state: 'visible' });
  console.log('PASS: halaman /master-data/guru terbuka');

  // ------------------------------------------------------------------
  // NIP kosong + uji 419 pada POST pertama setelah login fresh.
  // ------------------------------------------------------------------
  await page.getByRole('button', { name: 'Tambah Guru', exact: true }).click();
  const form = page.locator('#modal form');
  await form.waitFor({ state: 'visible' });
  await page.fill('#modal input[name="nama"]', guruName);
  await page.fill('#modal input[name="jabatan"]', 'Verifikasi');
  // NIP sengaja dikosongkan.

  await form.locator('button[type="submit"]').click();

  let modalClosed = true;
  try {
    await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });
  } catch {
    modalClosed = false;
  }

  check(guruPostStatuses.length > 0, 'POST /master-data/guru terkirim', JSON.stringify(guruPostStatuses));
  check(!guruPostStatuses.includes(419), 'no-419', `status=${JSON.stringify(guruPostStatuses)}`);
  check(
    guruPostStatuses.every((status) => status !== 419) && (guruPostStatuses.includes(200) || guruPostStatuses.includes(302)),
    'POST guru 200/302',
    `status=${JSON.stringify(guruPostStatuses)}`,
  );
  check(modalClosed, 'create guru NIP kosong berhasil');

  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.innerText.includes('berhasil ditambahkan'),
    { timeout: 15000 },
  );
  console.log('PASS: flash create tampil');

  const createdRow = page.locator('tbody tr').filter({ hasText: guruName }).first();
  await createdRow.waitFor({ state: 'visible', timeout: 15000 });
  check((await page.locator('tbody tr').filter({ hasText: guruName }).count()) === 1, 'guru NIP kosong tampil di tabel');

  const nipText = (await createdRow.locator('td').nth(1).innerText()).trim();
  check(nipText === '', 'nip-empty', `nip="${nipText}"`);

  // ------------------------------------------------------------------
  // Search nama + NIP (URL-driven, preserveState).
  // ------------------------------------------------------------------
  const searchInput = page.locator('#guru-search');
  await searchInput.waitFor({ state: 'visible' });

  await searchInput.fill('Budi');
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.get('search') === 'Budi',
    { timeout: 15000 },
  );
  await page.waitForFunction(
    () => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.length === 1 && rows[0].innerText.includes('Budi Santoso');
    },
    { timeout: 15000 },
  );
  check((await page.locator('tbody tr').count()) === 1, 'search nama');
  check((await searchInput.inputValue()) === 'Budi', 'search nama: input tetap terisi');

  await searchInput.fill('19850303');
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.get('search') === '19850303',
    { timeout: 15000 },
  );
  await page.waitForFunction(
    () => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.length === 1 && rows[0].innerText.includes('Dewi Lestari');
    },
    { timeout: 15000 },
  );
  check((await page.locator('tbody tr').count()) === 1, 'search nip');
} catch (error) {
  failures.push('exception');
  console.log('EXCEPTION:', error.message);
} finally {
  try {
    await page.goto(`${BASE_URL}/master-data/guru?search=${encodeURIComponent(guruName)}`, { waitUntil: 'networkidle' });
    const leftover = page.locator('tbody tr').filter({ hasText: guruName });
    if (await leftover.count()) {
      await leftover.first().locator('button[title="Hapus"]').click();
      await page.waitForTimeout(1500);
    }
  } catch {
    // cleanup best-effort
  }

  check(pageErrors.length === 0, 'tidak ada pageerror', pageErrors.join(' | '));
  check(consoleErrors.length === 0, 'tidak ada console.error', consoleErrors.join(' | '));

  console.log(`\nOVERALL: ${failures.length === 0 ? 'PASS' : 'FAIL'}`);
  await browser.close();
  process.exit(failures.length === 0 ? 0 : 1);
}
