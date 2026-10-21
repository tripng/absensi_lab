import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.ENROLLMENT_EMAIL || 'admin@absensi.com';
const PASSWORD = process.env.ENROLLMENT_PASSWORD || 'password';

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

const rows = () => page.locator('tbody tr');
const rowWith = (...texts) => {
  let locator = rows();
  for (const text of texts) locator = locator.filter({ hasText: text });
  return locator;
};
const optionValue = (selector, needles) => page
  .locator(`${selector} option`)
  .evaluateAll(
    (options, values) => options.find(
      (option) => values.every((value) => option.textContent.includes(value)),
    )?.value,
    needles,
  );
const waitForFlash = (text) => page.waitForFunction(
  (needle) => document.querySelector('[role="status"]')?.innerText.includes(needle),
  text,
  { timeout: 15000 },
);

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  console.log('PASS: login berhasil');

  await page.goto(`${BASE_URL}/student-enrollments`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Riwayat Enrollment Siswa' }).waitFor({ state: 'visible' });
  console.log('PASS: halaman /student-enrollments terbuka');

  check((await rowWith('Ahmad Fauzi').count()) >= 2, 'riwayat Ahmad Fauzi tampil (2 baris)');
  check((await rowWith('Siti Nurhaliza').count()) >= 1, 'riwayat Siti Nurhaliza tampil');
  const tableText = (await rows().allInnerTexts()).join('\n');
  check(tableText.includes('2027/2028'), 'seed tahun ajaran 2027/2028 tampil');

  const sitiId = await optionValue('#filter-student', ['Siti Nurhaliza']);
  const createdRow = rowWith('Siti Nurhaliza', 'XI.1', '2027/2028');

  if (await createdRow.count()) {
    await createdRow.first().locator('button[title="Hapus"]').click();
    await waitForFlash('berhasil dihapus');
    await createdRow.first().waitFor({ state: 'detached', timeout: 15000 });
    console.log('PASS: cleanup enrollment Siti 2027/2028 sebelumnya');
  }

  await page.getByRole('button', { name: 'Tambah Enrollment', exact: true }).click();
  const form = page.locator('#modal form');
  await form.waitFor({ state: 'visible' });

  await form.locator('button[type="submit"]').click();
  await form.locator('.text-error').first().waitFor({ state: 'visible', timeout: 15000 });
  const emptyErrors = await form.locator('.text-error').allInnerTexts();
  check(emptyErrors.length >= 3, 'validasi form kosong tampil', emptyErrors.join(' | '));

  const studentId = await optionValue('#modal select[name="student_id"]', ['Siti Nurhaliza']);
  const classId = await optionValue('#modal select[name="class_id"]', ['XI.1', '2027/2028']);
  const yearId = await optionValue('#modal select[name="academic_year_id"]', ['2027/2028']);

  check(Boolean(sitiId), 'filter siswa tersedia');
  check(Boolean(studentId), 'opsi siswa Siti tersedia di form');
  check(Boolean(classId), 'opsi kelas XI.1 tersedia di form');
  check(Boolean(yearId), 'opsi tahun ajaran 2027/2028 tersedia di form');

  await page.selectOption('#modal select[name="student_id"]', studentId);
  await page.selectOption('#modal select[name="class_id"]', classId);
  await page.selectOption('#modal select[name="academic_year_id"]', yearId);
  await page.selectOption('#modal select[name="status"]', 'active');
  await form.locator('button[type="submit"]').click();
  await page.locator('#modal').waitFor({ state: 'detached', timeout: 15000 });

  await waitForFlash('berhasil ditambahkan');
  const createFlash = (await page.locator('[role="status"]').innerText()).trim();
  check(createFlash.includes('berhasil ditambahkan'), 'flash create tampil', createFlash);

  await createdRow.first().waitFor({ state: 'visible', timeout: 15000 });
  check((await createdRow.count()) === 1, 'enrollment baru tampil di tabel');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Riwayat Enrollment Siswa' }).waitFor({ state: 'visible' });
  check((await createdRow.count()) === 1, 'riwayat enrollment persisten setelah reload');

  await page.selectOption('#filter-student', sitiId);
  await page.waitForFunction(() => {
    const tableRows = Array.from(document.querySelectorAll('tbody tr'));
    return tableRows.length >= 2
      && tableRows.every((row) => row.innerText.includes('Siti Nurhaliza'));
  }, undefined, { timeout: 5000 });

  const filteredText = await rows().allInnerTexts();
  check(filteredText.length >= 2, 'filter siswa menampilkan riwayat Siti', `rows=${filteredText.length}`);
  check(filteredText.every((text) => text.includes('Siti Nurhaliza')), 'filter siswa hanya menampilkan Siti');
  check(!filteredText.some((text) => text.includes('Ahmad Fauzi')), 'Ahmad Fauzi tidak tampil saat filter Siti');

  await createdRow.first().locator('button[title="Hapus"]').click();
  await waitForFlash('berhasil dihapus');
  await createdRow.first().waitFor({ state: 'detached', timeout: 15000 });
  check((await createdRow.count()) === 0, 'enrollment uji terhapus kembali');

  await page.selectOption('#filter-student', '');
  await page.waitForFunction(
    () => document.querySelectorAll('tbody tr').length >= 2,
    undefined,
    { timeout: 5000 },
  );
  check((await rowWith('Siti Nurhaliza').count()) >= 1, 'riwayat seed tetap ada setelah cleanup');
} catch (error) {
  failures.push('exception');
  console.log('EXCEPTION:', error.message);
} finally {
  try {
    await page.goto(`${BASE_URL}/student-enrollments`, { waitUntil: 'networkidle' });
    const leftover = rowWith('Siti Nurhaliza', 'XI.1', '2027/2028');
    if (await leftover.count()) {
      await leftover.first().locator('button[title="Hapus"]').click();
      await page.waitForTimeout(1500);
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
