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

const stamp = Date.now();
const guruName = `Guru Verifikasi ${stamp}`;
const guruNameEdited = `Guru Verifikasi Edit ${stamp}`;
const guruNip = `VERIFY-${stamp}`;

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  console.log('PASS: login berhasil');

  await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Manajemen Master Data' }).waitFor({ state: 'visible' });
  console.log('PASS: halaman /master-data terbuka');

  const tabs = ['Guru', 'Kelas', 'Ruangan / Lab', 'Mata Pelajaran'];

  for (const tab of tabs) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: new RegExp(`^Tambah ${tab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();

    const form = page.locator('#modal form');
    await form.waitFor({ state: 'visible' });

    const fields = await form.locator('input, select').evaluateAll((elements) => elements.map((el) => ({
      tag: el.tagName.toLowerCase(),
      name: el.getAttribute('name'),
      id: el.id,
      emptyOptions: el.tagName === 'SELECT'
        ? Array.from(el.options).filter((option) => option.value === '').length
        : null,
    })));

    for (const field of fields) {
      check(Boolean(field.name), `${tab}: ${field.tag} punya atribut name`, JSON.stringify(field));
      check(field.id === field.name, `${tab}: ${field.tag} id terhubung ke label`, JSON.stringify(field));

      if (field.tag === 'select') {
        check(field.emptyOptions === 1, `${tab}: select punya tepat satu option value=""`, JSON.stringify(field));
      }
    }

    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await page.locator('#modal').waitFor({ state: 'detached', timeout: 5000 });
  }

  await page.getByRole('button', { name: 'Guru', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah Guru', exact: true }).click();
  await page.locator('#modal form').waitFor({ state: 'visible' });
  await page.fill('#modal input[name="nama"]', guruName);
  await page.fill('#modal input[name="nip"]', guruNip);
  await page.fill('#modal input[name="jabatan"]', 'Guru Verifikasi');
  await page.locator('#modal button[type="submit"]').click();
  await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });

  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.innerText.includes('berhasil ditambahkan'),
    { timeout: 15000 }
  );
  const createFlash = (await page.locator('[role="status"]').innerText()).trim();
  check(createFlash.includes('berhasil ditambahkan'), 'flash create tampil', createFlash);

  let row = page.locator('tbody tr').filter({ hasText: guruName });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  check((await row.count()) === 1, 'guru baru tampil di tabel');

  await row.locator('button[title="Edit"]').click();
  await page.locator('#modal form').waitFor({ state: 'visible' });
  await page.fill('#modal input[name="nama"]', guruNameEdited);
  await page.locator('#modal button[type="submit"]').click();
  await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });

  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.innerText.includes('berhasil diperbarui'),
    { timeout: 15000 }
  );
  const editFlash = (await page.locator('[role="status"]').innerText()).trim();
  check(editFlash.includes('berhasil diperbarui'), 'flash edit tampil', editFlash);

  await page.waitForFunction(
    (name) => Array.from(document.querySelectorAll('tbody tr')).some((tr) => tr.innerText.includes(name)),
    guruNameEdited,
    { timeout: 15000 }
  );
  row = page.locator('tbody tr').filter({ hasText: guruNameEdited });
  check((await row.count()) === 1, 'nama guru berubah setelah edit');

  await row.locator('button[title="Hapus"]').click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.innerText.includes('berhasil dihapus'),
    { timeout: 15000 }
  );
  const deleteFlash = (await page.locator('[role="status"]').innerText()).trim();
  check(deleteFlash.includes('berhasil dihapus'), 'flash delete tampil', deleteFlash);

  await page.waitForFunction(
    (name) => !Array.from(document.querySelectorAll('tbody tr')).some((tr) => tr.innerText.includes(name)),
    guruNameEdited,
    { timeout: 15000 }
  );
  check((await page.locator('tbody tr').filter({ hasText: guruNameEdited }).count()) === 0, 'guru terhapus dari tabel');
} catch (error) {
  failures.push('exception');
  console.log('EXCEPTION:', error.message);
} finally {
  try {
    await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle' });
    for (const name of [guruName, guruNameEdited]) {
      const leftover = page.locator('tbody tr').filter({ hasText: name });
      if (await leftover.count()) {
        await leftover.first().locator('button[title="Hapus"]').click();
        await page.waitForTimeout(1000);
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
