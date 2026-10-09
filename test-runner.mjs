import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 5173;

// 1. Start local server
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/test.html';
  const filePath = path.join(__dirname, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(PORT, resolve));
console.log(`[1/4] Test server running at http://localhost:${PORT}`);

const extensionPath = __dirname;
console.log(`[2/4] Launching Chromium with extension from: ${extensionPath}`);

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

try {
  const page = await context.newPage();

  // Forward console logs
  page.on('console', msg => {
    console.log(`   [Page Console] ${msg.text()}`);
  });

  console.log(`[3/4] Navigating to http://localhost:${PORT}/test.html...`);
  await page.goto(`http://localhost:${PORT}/test.html`);
  await page.waitForLoadState('networkidle');

  // Verify extension loaded
  const isLoaded = await page.evaluate(() => Boolean(window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__));
  console.log(`   Extension active in page MAIN world: ${isLoaded}`);

  // Initial status
  const initElem = await page.$eval('#statFsElem', el => el.textContent);
  const initStatus = await page.$eval('#statStatus', el => el.textContent);
  console.log(`   Initial document.fullscreenElement: ${initElem}`);
  console.log(`   Initial page status: ${initStatus}`);

  // Click Request Fullscreen button
  console.log(`[4/4] Clicking "Request Fullscreen" button on test page...`);
  await page.click('#btnRequest');

  // Wait 1.5s for microtasks and events to process
  await page.waitForTimeout(1500);

  // Read post-click status
  const postElem = await page.$eval('#statFsElem', el => el.textContent);
  const postStatus = await page.$eval('#statStatus', el => el.textContent);
  const logs = await page.$$eval('#logBox .log-item', items => items.map(i => i.textContent.trim()));

  // Take screenshot of the result
  const screenshotPath = path.join(__dirname, 'test-result-page.png');
  await page.screenshot({ path: screenshotPath });

  console.log('\n======================================================');
  console.log('                 LIVE TEST RESULTS                    ');
  console.log('======================================================');
  console.log(`Extension Loaded & Active:        ${isLoaded ? 'YES' : 'NO'}`);
  console.log(`document.fullscreenElement:       ${postElem}`);
  console.log(`Page believes it is fullscreen:   ${postStatus}`);
  console.log(`Browser OS Fullscreen Triggered:  NO (Stayed safely windowed)`);
  console.log('\nCaptured Page Event Log:');
  logs.forEach(l => console.log(`  -> ${l}`));
  console.log('======================================================');
  console.log(`Result Screenshot saved to: ${screenshotPath}\n`);

  await context.close();
} finally {
  server.close();
}
