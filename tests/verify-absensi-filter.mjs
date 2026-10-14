import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:8080/absensi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Verify the two filter tabs exist with correct labels
  const tabs = await page.$$eval('#filter-tabs button', (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log('FILTER TABS:', tabs);

  // Helper to read cards: name (bold span), role (variant span), status pill text
  const cards = await page.$$eval('#employee-list .employee-card', (els) =>
    els.map((e) => {
      const nameEl = e.querySelector('span.font-bold');
      const roleEl = e.querySelector('.text-on-surface-variant');
      const pillEls = e.querySelectorAll('span[class*="rounded-full"]');
      const pills = Array.from(pillEls).map((s) => s.textContent.trim());
      const noteEl = e.querySelector('.bg-surface-container-lowest\\/80');
      const note = noteEl ? noteEl.textContent.trim() : '';
      return {
        name: nameEl ? nameEl.textContent.trim() : '',
        role: roleEl ? roleEl.textContent.trim() : '',
        pills,
        note: note.slice(0, 30)
      };
    })
  );
  console.log('\nDEFAULT (SISWA) LIST:', JSON.stringify(cards, null, 2));

  // 2. Click Tamu tab
  await page.click('button[data-tab="tamu"]');
  await page.waitForTimeout(800);

  const cardsTamu = await page.$$eval('#employee-list .employee-card', (els) =>
    els.map((e) => {
      const nameEl = e.querySelector('span.font-bold');
      const roleEl = e.querySelector('.text-on-surface-variant');
      const pillEls = e.querySelectorAll('span[class*="rounded-full"]');
      const pills = Array.from(pillEls).map((s) => s.textContent.trim());
      return {
        name: nameEl ? nameEl.textContent.trim() : '',
        role: roleEl ? roleEl.textContent.trim() : '',
        pills
      };
    })
  );
  console.log('\nTAMU TAB LIST:', JSON.stringify(cardsTamu, null, 2));

  // 3. Click back Siswa
  await page.click('button[data-tab="siswa"]');
  await page.waitForTimeout(800);

  const cardsSiswa = await page.$$eval('#employee-list .employee-card', (els) =>
    els.map((e) => {
      const nameEl = e.querySelector('span.font-bold');
      const roleEl = e.querySelector('.text-on-surface-variant');
      const pillEls = e.querySelectorAll('span[class*="rounded-full"]');
      const pills = Array.from(pillEls).map((s) => s.textContent.trim());
      return {
        name: nameEl ? nameEl.textContent.trim() : '',
        role: roleEl ? roleEl.textContent.trim() : '',
        pills
      };
    })
  );
  console.log('\nSISWA (again) LIST:', JSON.stringify(cardsSiswa, null, 2));

  await page.screenshot({ path: '/tmp/absensi_final.png', fullPage: true });
  console.log('\nscreenshot saved to /tmp/absensi_final.png');
  await browser.close();
})();
