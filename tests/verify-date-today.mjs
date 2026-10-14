import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text().slice(0, 200)));
  page.on('pageerror', (err) => console.log('PAGEERR:', err.message.slice(0, 300)));

  await page.goto('http://127.0.0.1:8080/absensi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const now = new Date();
  const expected = now.toLocaleDateString('id-ID', { weekday: 'long' })
    + ', ' + now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  console.log('EXPECTED:', expected);

  const mainText = await page.$eval('main', (e) => e.innerText).catch(() => 'N/A');
  console.log('MAIN TEXT (first 800 chars):', mainText.slice(0, 800));

  const h3s = await page.$$eval('h3', (els) => els.map((e) => e.textContent.trim()));
  console.log('ALL H3:', h3s);

  const allText = await page.$eval('body', (e) => e.innerText).catch(() => '');
  const match = allText.match(/[A-Za-z]+,\s*8\s+[A-Za-z]+\s+\d{4}/);
  console.log('OCTOBER-TODAY match:', match ? match[0] : 'NOT FOUND');

  await page.screenshot({ path: '/tmp/absensi_today_date.png', fullPage: true });
  console.log('screenshot: /tmp/absensi_today_date.png');
  await browser.close();
})();
