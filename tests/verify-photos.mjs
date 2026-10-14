import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:8080/absensi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Clear any search field first
  try {
    await page.fill('#employee-search', '');
  } catch (e) {}

  // 1. Tab state initial
  const tabState = await page.$$eval('#filter-tabs button', (els) =>
    els.map((e) => ({ label: e.textContent.trim(), classes: e.className }))
  );
  console.log('TAB STATE (initial):');
  tabState.forEach((t) => {
    const active = t.classes.includes('bg-primary') && t.classes.includes('text-on-primary');
    console.log(`  ${t.label} -> active=${active}`);
  });

  // 2. Card count on siswa tab
  const cardsInit = await page.$$eval('#employee-list .employee-card', (els) => els.length);
  console.log('CARD COUNT (initial siswa):', cardsInit);

  // 3. Click Tamu
  await page.click('button[data-tab="tamu"]');
  await page.waitForTimeout(1500);

  const tabState2 = await page.$$eval('#filter-tabs button', (els) =>
    els.map((e) => ({ label: e.textContent.trim(), classes: e.className }))
  );
  console.log('TAB STATE (after klik Tamu):');
  tabState2.forEach((t) => {
    const active = t.classes.includes('bg-tertiary');
    console.log(`  ${t.label} -> tertiary-active=${active}`);
  });

  const imgsT = await page.$$eval('#employee-list .employee-card img', (els) =>
    els.map((e) => e.getAttribute('src'))
  );
  console.log('\nTAMU CARD COUNT:', imgsT.length);
  imgsT.forEach((s, i) => console.log(`  [${i}] ${s}`));

  // 4. Click back Siswa
  await page.click('button[data-tab="siswa"]');
  await page.waitForTimeout(1200);
  const imgsS = await page.$$eval('#employee-list .employee-card img', (els) =>
    els.map((e) => e.getAttribute('src'))
  );
  console.log('\nSISWA CARD COUNT (back):', imgsS.length);
  imgsS.forEach((s, i) => console.log(`  [${i}] ${s}`));

  await page.screenshot({ path: '/tmp/absensi_tamu_view.png', fullPage: true });
  console.log('\nscreenshot: /tmp/absensi_tamu_view.png');
  await browser.close();
})();
