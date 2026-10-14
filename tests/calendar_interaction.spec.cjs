// CommonJS test — updated untuk mencari weekend cells dan memverif semua bisa diklik
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/absensi');

  // Tunggu sampai React/Inertia selesai render
  await page.waitForFunction(() => {
    const el = document.querySelector('[class*="font-headline-sm"]');
    return el && el.textContent.includes('Grid Absensi Bulanan');
  }, { timeout: 20000 });

  const getAllMonthTexts = async () => {
    const texts = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return [...new Set(spans.map((s) => s.textContent.trim()).filter((t) => /[A-Za-z]+ \d{4}/.test(t)))];
    });
    return texts;
  };

  console.log('Initial:', await getAllMonthTexts());

  // Klik Bulan Berikutnya
  const nextBtn = await page.$('button[aria-label="Bulan Berikutnya"]');
  await nextBtn.click();
  await page.waitForTimeout(500);
  console.log('After next:', await getAllMonthTexts());

  // Klik Bulan Sebelumnya
  const prevBtn = await page.$('button[aria-label="Bulan Sebelumnya"]');
  await prevBtn.click();
  await page.waitForTimeout(500);
  console.log('After prev:', await getAllMonthTexts());

  // Klik Hari Ini
  const todayBtn = await page.$('#btn-today');
  await todayBtn.click();
  await page.waitForTimeout(500);
  console.log('After today:', await getAllMonthTexts());

  // Cek semua cell — seharusnya tidak ada cell dengan opacity-45 kecuali spillover
  const result = await page.evaluate(() => {
    const grid = document.querySelector('.grid.grid-cols-7.gap-1\\.5');
    if (!grid) return { found: false };
    const cells = Array.from(grid.children);
    let disabledCount = 0;
    let clickableCount = 0;
    let weekendStyled = 0;

    cells.forEach((cell) => {
      const cls = cell.getAttribute('class') || '';
      if (cls.includes('opacity-45')) {
        disabledCount++;
      } else {
        clickableCount++;
      }
      // Cek apakah ada styling weekend khusus (text-error)
      if (cls.includes('text-error') && !cls.includes('bg-error')) {
        weekendStyled++;
      }
    });

    return {
      total: cells.length,
      disabledCount,
      clickableCount,
      weekendStyled,
    };
  });

  console.log('\n=== CELL ANALYSIS ===');
  console.log('Total cells:', result.total);
  console.log('Disabled (spillover):', result.disabledCount);
  console.log('Clickable (active days):', result.clickableCount);
  console.log('Weekend-styled cells (should be 0):', result.weekendStyled);

  // Bukti weekend bisa diklik: klik sel ke-6 (biasanya Sabtu)
  const cellsResult = await page.evaluate(() => {
    const grid = document.querySelector('.grid.grid-cols-7.gap-1\\.5');
    const cells = Array.from(grid.children);
    // Cari cell ke-6 (index 5 = Sabtu) dan ke-7 (index 6 = Minggu)
    const idx5 = cells[5];
    const idx6 = cells[6];
    if (!idx5 || !idx6) return { err: 'not enough cells' };
    return {
      cell5Class: idx5.getAttribute('class'),
      cell5Text: idx5.textContent.trim().slice(0, 20),
      cell6Text: idx6.textContent.trim().slice(0, 20),
    };
  });
  console.log('\n=== WEEKEND CELL CHECK (Sen=0..Min=6) ===');
  console.log('Cell idx5 (Sabtu) class includes cursor-pointer:', cellsResult.cell5Class?.includes('cursor-pointer'));
  console.log('Cell idx6 (Minggu) text:', cellsResult.cell6Text);

  await page.screenshot({ path: '/home/tripng/Projects/absensi_lab/tests/calendar-all-workdays.png', fullPage: true });
  console.log('\nScreenshot saved.');

  await browser.close();
})().catch((e) => {
  console.error('Playwright error:', e);
  process.exit(1);
});
