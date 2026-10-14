import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let hasError = false;
  page.on('pageerror', (err) => {
    hasError = true;
    console.log('PAGEERR:', err.message.slice(0, 300));
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      hasError = true;
      console.log('CONSOLE ERR:', msg.text().slice(0, 200));
    }
  });

  await page.goto('http://127.0.0.1:8080/absensi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // full JS mount

  // Expected today in id-ID
  const now = new Date();
  const expected = now.toLocaleDateString('id-ID', { weekday: 'long' })
    + ', ' + now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  console.log('EXPECTED today:', expected);

  // H3 header date check
  const h3s = await page.$$eval('h3', (els) => els.map((e) => e.textContent.trim()));
  console.log('ALL H3:', h3s);
  const dateH3 = h3s.find((h) => h && h.includes('2026'));
  console.log('DATE H3 match:', dateH3 === expected ? 'PASS' : 'FAIL');

  // Filter tabs
  const tabs = await page.$$eval('#filter-tabs button', (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log('FILTER TABS:', tabs);
  console.log('TABS correct:', JSON.stringify(tabs) === JSON.stringify(['Siswa (5)', 'Tamu (5)']));

  // Siswa tab images (should be local img/photos/<nisn>.jpg)
  const imgsS = await page.$$eval('#employee-list .employee-card img', (els) =>
    els.map((e) => e.getAttribute('src'))
  );
  console.log('SISWA IMG count:', imgsS.length);
  const siswaLocal = imgsS.every((s) => s && s.includes('img/photos/') && s.includes('.jpg'));
  console.log('SISWA all local photos:', siswaLocal);
  imgsS.forEach((s, i) => console.log(`  [${i}] ${s}`));

  // Click Tamu
  await page.click('button[data-tab="tamu"]');
  await page.waitForTimeout(1200);
  const imgsT = await page.$$eval('#employee-list .employee-card img', (els) =>
    els.map((e) => e.getAttribute('src'))
  );
  console.log('TAMU IMG count:', imgsT.length);
  const tamuLocal = imgsT.every((s) => s && s.includes('img/photos/') && s.includes('.jpg'));
  console.log('TAMU all local photos:', tamuLocal);
  imgsT.forEach((s, i) => console.log(`  [${i}] ${s}`));

  // Back to Siswa
  await page.click('button[data-tab="siswa"]');
  await page.waitForTimeout(800);

  // Search box
  const searchOk = await page.$eval('#employee-search', (e) => !!e).catch(() => false);
  console.log('SEARCH BOX present:', searchOk);

  console.log('\n=== CONSOLE ERROR present:', hasError);
  console.log('=== OVERALL:',
    (dateH3 === expected && JSON.stringify(tabs) === JSON.stringify(['Siswa (5)','Tamu (5)'])
      && siswaLocal && tamuLocal && !hasError)
      ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌');

  await page.screenshot({ path: '/tmp/absensi_final_verify.png', fullPage: true });
  console.log('screenshot: /tmp/absensi_final_verify.png');
  await browser.close();
})();
