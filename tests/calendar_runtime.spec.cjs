// CommonJS runtime test — pakai Vite dev server (port 5174) via Laravel
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();

  // Capture console + errors
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('PAGE JS ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to /absensi...');
  await page.goto('http://127.0.0.1:8000/absensi', { timeout: 15000 });

  // Tunggu React + Vite HMR siap
  await page.waitForFunction(() => {
    const el = document.querySelector('h2');
    return el && el.textContent.includes('Grid Absensi Bulanan');
  }, { timeout: 30000 });

  console.log('React rendered successfully!');

  const monthTexts = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return [...new Set(spans.map((s) => s.textContent.trim()).filter((t) => /[A-Za-z\u00C0-\u017F]+ \d{4}/.test(t)))];
  });
  console.log('Initial month display:', monthTexts);

  // Klik Bulan Berikutnya
  await page.click('button[aria-label="Bulan Berikutnya"]');
  await page.waitForTimeout(500);
  const nextText = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return [...new Set(spans.map((s) => s.textContent.trim()).filter((t) => /[A-Za-z\u00C0-\u017F]+ \d{4}/.test(t)))];
  });
  console.log('After next:', nextText);

  // Klik Bulan Sebelumnya
  await page.click('button[aria-label="Bulan Sebelumnya"]');
  await page.waitForTimeout(500);
  const prevText = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return [...new Set(spans.map((s) => s.textContent.trim()).filter((t) => /[A-Za-z\u00C0-\u017F]+ \d{4}/.test(t)))];
  });
  console.log('After prev:', prevText);

  // Klik Hari Ini
  await page.click('#btn-today');
  await page.waitForTimeout(500);
  const todayText = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return [...new Set(spans.map((s) => s.textContent.trim()).filter((t) => /[A-Za-z\u00C0-\u017F]+ \d{4}/.test(t)))];
  });
  console.log('After today:', todayText);

  // Analyze cells: weekend should NOT have opacity-45
  const analysis = await page.evaluate(() => {
    const grid = document.querySelector('.grid.grid-cols-7.gap-1\\.5');
    if (!grid) return { found: false };
    const cells = Array.from(grid.children);
    let spillover = 0, clickable = 0, weekendStyled = 0;
    cells.forEach((cell) => {
      const cls = cell.getAttribute('class') || '';
      if (cls.includes('opacity-45')) spillover++;
      else clickable++;
      // Weekend days used to have text-error, now should not
      if (cls.includes('text-error') && !cls.includes('bg-') && !cls.includes('rounded')) weekendStyled++;
    });
    // Check weekend cells (Sab index 5, 6, Min index 6 of each week) — verify they are clickable
    const weekendClickable = cells
      .filter((c, idx) => {
        const posInWeek = idx % 7;
        // Sab = position 5 (idx 5, 12, 19, 26, 33), Min = position 6 (idx 6, 13, 20, 27, 34)
        return posInWeek === 5 || posInWeek === 6;
      })
      .map((c) => {
        const cls = c.getAttribute('class') || '';
        return !cls.includes('opacity-45');
      });
    return { total: cells.length, spillover, clickable, weekendStyled, weekendClickable };
  });

  console.log('\n=== CELL ANALYSIS ===');
  console.log('Total cells:', analysis.total);
  console.log('Spillover (disabled):', analysis.spillover);
  console.log('Active (clickable):', analysis.clickable);
  console.log('Weekend-styled cells (should be 0):', analysis.weekendStyled);
  console.log('Weekend cells clickable (all should be true):', analysis.weekendClickable.every(Boolean));

  // Click a weekend day (Sab = idx 5)
  await page.evaluate(() => {
    const grid = document.querySelector('.grid.grid-cols-7.gap-1\\.5');
    const cells = Array.from(grid.children);
    cells[5].click(); // Sabtu pertama
  });
  await page.waitForTimeout(500);
  const day5status = await page.evaluate(() => {
    const grid = document.querySelector('.grid.grid-cols-7.gap-1\\.5');
    const cells = Array.from(grid.children);
    return cells[5].getAttribute('class');
  });
  console.log('\nCell idx5 (Sabtu) class after click includes selected:', day5status.includes('selected') || day5status.includes('bg-primary-fixed'));

  console.log('\n=== ALL VERIFICATION RESULTS ===');
  const allGood = nextText.length > 0 && prevText.length > 0 && todayText.length > 0 &&
    !nextText.includes('') && analysis.weekendClickable.every(Boolean);
  console.log(allGood ? 'PASS: Semua interaksi berfungsi, weekend bisa diklik' : 'FAIL: ada masalah');
  console.log('Errors detected:', errors.length === 0 ? 'none' : errors);

  await page.screenshot({ path: '/home/tripng/Projects/absensi_lab/tests/calendar-final.png', fullPage: true });
  await browser.close();
})().catch((e) => {
  console.error('Test error:', e.message);
  process.exit(1);
});
