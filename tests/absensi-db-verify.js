import { chromium } from 'playwright-core';
import { join } from 'path';
import { homedir } from 'os';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_CHROME || join(homedir(), '.cache/ms-playwright/chromium-1155/chrome-linux/chrome'),
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:8000/absensi', { waitUntil: 'networkidle' });
await new Promise((r) => setTimeout(r, 2000));

// Navigasi ke September 2026
let guard = 0;
const hasBulan = async () => {
  const spans = await page.$$eval('span', (els) =>
    els.map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
  );
  return spans.find((t) => /^September 2026$/i.test(t));
};
while (!(await hasBulan()) && guard < 12) {
  await page.click('button[aria-label="Bulan Sebelumnya"]');
  await new Promise((r) => setTimeout(r, 300));
  guard++;
}

// Klik sel tanggal 30 untuk menandainya selected, lalu verifikasi detail
const cell30 = await page.evaluate(() => {
  const grids = document.querySelectorAll('[class*="grid-cols-7"]');
  let matrix = null;
  for (const g of grids) {
    if (g.className.includes('gap-1.5')) { matrix = g; break; }
  }
  if (!matrix) return null;
  const cells = Array.from(matrix.children);
  return cells.findIndex((el) => {
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
    return txt.startsWith('30') && !el.className.includes('opacity-45');
  });
});
if (cell30 >= 0) {
  const cell = await page.$(`div[class*="grid-cols-7"].gap-1\\.5 > div:nth-child(${cell30 + 1})`);
  if (cell) {
    const txt = await cell.evaluate((el) => (el.textContent || '').trim().replace(/\s+/g, ' '));
    console.log('cell 30 text:', txt.slice(0, 80));
    await cell.click();
    await new Promise((r) => setTimeout(r, 500));
    const after = await cell.evaluate((el) => (el.textContent || '').trim().replace(/\s+/g, ' '));
    console.log('setelah klik text:', after.slice(0, 80));
    console.log('status selected:', el_class = (await cell.evaluate((el) => el.className || '')) );
  }
}

await page.screenshot({ path: '/tmp/absensi_db_final.png', fullPage: true });
console.log('screenshot saved');
await browser.close();
