import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.SCHEDULE_EMAIL || 'admin@absensi.com';
const PASSWORD = process.env.SCHEDULE_PASSWORD || 'password';

const failures = [];
const pageErrors = [];
const consoleErrors = [];
const postStatuses = [];
const putStatuses = [];
const deleteStatuses = [];

function check(condition, label, detail = '') {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const stamp = Date.now();
const recurringLabel = `E2E Berulang ${stamp}`;
const oneTimeLabel = `E2E Pinjaman ${stamp}`;
const editedLabel = `${oneTimeLabel} (edit)`;

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
  if (!response.url().includes('/management-schedule')) return;

  const method = response.request().method();
  if (method === 'POST') postStatuses.push(response.status());
  if (method === 'PUT') putStatuses.push(response.status());
  if (method === 'DELETE') deleteStatuses.push(response.status());
});

const form = () => page.locator('form');
const cardFor = (text) => page.locator('div.bg-surface-container-lowest.border').filter({ hasText: text }).last();
const firstOptionValue = (selector) => page
  .locator(`${selector} option`)
  .evaluateAll((options) => options.find((option) => option.value)?.value ?? '');

const closeForm = async () => {
  await form().waitFor({ state: 'detached', timeout: 15000 });
};

const deleteCard = async (text) => {
  const card = cardFor(text);
  await card.locator('button[title="Hapus"]').click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
};

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  console.log('PASS: login fresh berhasil');

  await page.goto(`${BASE_URL}/management-schedule`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Manajemen Jadwal Lab' }).waitFor({ state: 'visible' });
  console.log('PASS: halaman /management-schedule terbuka');

  const navLink = page.getByRole('link', { name: 'Management Schedule' });
  check((await navLink.count()) === 1, 'navbar label Management Schedule');
  check((await navLink.getAttribute('href')) === '/management-schedule', 'navbar href /management-schedule');

  // ------------------------------------------------------------------
  // Create recurring — POST pertama dicek bukan 419.
  // ------------------------------------------------------------------
  await page.getByRole('button', { name: 'Tambah Jadwal' }).click();
  await form().waitFor({ state: 'visible' });

  const guruId = await firstOptionValue('select[name="guru_id"]');
  const kelasId = await firstOptionValue('select[name="kelas_id"]');
  const ruangId = await firstOptionValue('select[name="ruang_ajaran_id"]');

  await page.selectOption('select[name="guru_id"]', guruId);
  await page.selectOption('select[name="kelas_id"]', kelasId);
  await page.selectOption('select[name="ruang_ajaran_id"]', ruangId);
  await page.selectOption('select[name="hari"]', 'senin');
  await page.fill('input[name="jam_mulai"]', '13:00');
  await page.fill('input[name="jam_selesai"]', '14:00');
  await page.fill('textarea[name="keterangan"]', recurringLabel);
  await page.fill('input[name="no_telepon"]', '081234567890');
  await page.fill('input[name="jumlah_siswa"]', '30');

  await form().getByRole('button', { name: 'Simpan' }).click();
  await closeForm();

  check(postStatuses.length > 0, 'POST /management-schedule terkirim', JSON.stringify(postStatuses));
  check(!postStatuses.includes(419), 'no-419', `status=${JSON.stringify(postStatuses)}`);
  check(
    postStatuses.slice(0, 1).every((status) => status === 200 || status === 302),
    'POST pertama 200/302',
    `status=${JSON.stringify(postStatuses.slice(0, 1))}`,
  );

  await cardFor(recurringLabel).waitFor({ state: 'visible', timeout: 15000 });
  check((await cardFor(recurringLabel).count()) === 1, 'create recurring tampil sebagai card');

  // ------------------------------------------------------------------
  // Create one-time.
  // ------------------------------------------------------------------
  await page.getByRole('button', { name: 'Jadwal Pinjaman' }).click();
  await page.getByRole('button', { name: 'Tambah Jadwal' }).click();
  await form().waitFor({ state: 'visible' });

  await page.selectOption('select[name="kelas_id"]', kelasId);
  await page.selectOption('select[name="ruang_ajaran_id"]', ruangId);
  await page.fill('input[name="tanggal_mulai"]', '2030-01-07T13:00');
  await page.fill('input[name="tanggal_selesai"]', '2030-01-07T14:00');
  await page.fill('textarea[name="keterangan"]', oneTimeLabel);
  await page.fill('input[name="no_telepon"]', '081234567890');
  await page.fill('input[name="jumlah_siswa"]', '30');

  await form().getByRole('button', { name: 'Simpan' }).click();
  await closeForm();

  check(postStatuses.length >= 2, 'POST one-time terkirim', JSON.stringify(postStatuses));
  check(!postStatuses.includes(419), 'no-419 tetap bersih', `status=${JSON.stringify(postStatuses)}`);
  await cardFor(oneTimeLabel).waitFor({ state: 'visible', timeout: 15000 });
  check((await cardFor(oneTimeLabel).count()) === 1, 'create one-time tampil sebagai card');

  // ------------------------------------------------------------------
  // Edit one-time.
  // ------------------------------------------------------------------
  await cardFor(oneTimeLabel).locator('button[title="Edit"]').click();
  await form().waitFor({ state: 'visible' });
  await page.fill('textarea[name="keterangan"]', editedLabel);
  await page.fill('input[name="jumlah_siswa"]', '25');
  await form().getByRole('button', { name: 'Simpan' }).click();
  await closeForm();

  check(putStatuses.length === 1, 'PUT /management-schedule terkirim', JSON.stringify(putStatuses));
  check(
    putStatuses.every((status) => status === 200 || status === 302 || status === 303),
    'PUT edit 200/302/303',
    `status=${JSON.stringify(putStatuses)}`,
  );
  await cardFor(editedLabel).waitFor({ state: 'visible', timeout: 15000 });
  check((await page.getByText(oneTimeLabel, { exact: true }).count()) === 0, 'card lama hilang setelah edit');
  check((await cardFor(editedLabel).count()) === 1, 'card hasil edit tampil');

  // ------------------------------------------------------------------
  // Reload: data persisten.
  // ------------------------------------------------------------------
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Manajemen Jadwal Lab' }).waitFor({ state: 'visible' });
  check((await cardFor(recurringLabel).count()) === 1, 'reload: recurring masih tampil');

  await page.getByRole('button', { name: 'Jadwal Pinjaman' }).click();
  await cardFor(editedLabel).waitFor({ state: 'visible', timeout: 15000 });
  check((await cardFor(editedLabel).count()) === 1, 'reload: one-time hasil edit masih tampil');

  // ------------------------------------------------------------------
  // Delete + reload.
  // ------------------------------------------------------------------
  await deleteCard(editedLabel);
  check(deleteStatuses.length === 1, 'DELETE one-time terkirim', JSON.stringify(deleteStatuses));
  check(
    deleteStatuses.every((status) => status === 200 || status === 302 || status === 303),
    'DELETE 200/302/303',
    `status=${JSON.stringify(deleteStatuses)}`,
  );
  check((await cardFor(editedLabel).count()) === 0, 'one-time hilang setelah hapus');

  await page.getByRole('button', { name: 'Jadwal Berulang' }).click();
  await deleteCard(recurringLabel);
  check((await cardFor(recurringLabel).count()) === 0, 'recurring hilang setelah hapus');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Manajemen Jadwal Lab' }).waitFor({ state: 'visible' });
  check((await cardFor(recurringLabel).count()) === 0, 'reload: recurring tetap hilang');

  await page.getByRole('button', { name: 'Jadwal Pinjaman' }).click();
  check((await cardFor(editedLabel).count()) === 0, 'reload: one-time tetap hilang');
} catch (error) {
  failures.push('exception');
  console.log('EXCEPTION:', error.message);
} finally {
  try {
    await page.goto(`${BASE_URL}/management-schedule`, { waitUntil: 'networkidle' });
    for (const tab of ['Jadwal Berulang', 'Jadwal Pinjaman']) {
      await page.getByRole('button', { name: tab }).click();
      const leftover = page.locator('div.bg-surface-container-lowest.border').filter({ hasText: String(stamp) });
      while (await leftover.count()) {
        await leftover.first().locator('button[title="Hapus"]').click();
        await page.waitForTimeout(1000);
      }
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
