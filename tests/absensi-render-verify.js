import { chromium } from 'playwright-core';
import { join } from 'path';
import { homedir } from 'os';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_CHROME || join(homedir(), '.cache/ms-playwright/chromium-1155/chrome-linux/chrome'),
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:8000/absensi', { waitUntil: 'networkidle' });
await new Promise(r => setTimeout(r, 1500));

const r = {
  title: await page.title(),
  hasNavbar: await page.isVisible('nav.fixed'),
  hasTopbar: await page.isVisible('header.sticky'),
  hasSidebarTitle: await page.isVisible('text=AbsensiLab'),
  hasMainHeading: await page.isVisible('text=Kalender Absensi Lab Komputer'),
  hasLiveBadge: await page.isVisible('text=Live Realtime'),
  hasCalendarTitle: await page.isVisible('text=Grid Kehadiran Bulanan'),
  hasOctMonth: await page.isVisible('text=Oktober 2026'),
  metricCards: await page.$$eval('div.bg-surface-container-lowest', els => els.length),
  employeeCards: await page.$$eval('.employee-card', els => els.length),
  hasFilterTabs: await page.isVisible('button:has-text("Semua")'),
  hasSearch: await page.isVisible('input[placeholder*="Cari"]'),
  hasExportBtn: await page.isVisible('button:has-text("Unduh")'),
  hasPrintBtn: await page.isVisible('button:has-text("Cetak")'),
};

console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: '/tmp/absensi_render_v2.png', fullPage: true });
await browser.close();
console.log('Screenshot: /tmp/absensi_render_v2.png');
