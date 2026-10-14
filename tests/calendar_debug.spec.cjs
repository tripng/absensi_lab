// Minimal debug test
const { chromium } = require('playwright-core');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    console.log('Navigating...');
    await page.goto('http://127.0.0.1:8000/absensi', { timeout: 15000 });
    console.log('Navigation done. Waiting for render...');

    await page.waitForTimeout(5000);

    const body = await page.evaluate(() => document.body.textContent);
    console.log('BODY TEXT (first 500):', body.slice(0, 500));

    await browser.close();
  } catch (e) {
    console.error('Error:', e.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
