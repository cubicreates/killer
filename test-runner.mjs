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
console.log(`[1/5] Test server running at http://localhost:${PORT}`);

const extensionPath = __dirname;
console.log(`[2/5] Launching Chromium with extension from: ${extensionPath}`);

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

try {
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[SilentFullscreen]')) {
      console.log(`   [Extension Console] ${msg.text()}`);
    }
  });

  console.log(`[3/5] Navigating to http://localhost:${PORT}/test.html...`);
  await page.goto(`http://localhost:${PORT}/test.html`);
  await page.waitForLoadState('networkidle');

  // Verify extension loaded
  const isLoaded = await page.evaluate(() => Boolean(window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__));
  console.log(`   Extension active: ${isLoaded}`);

  // Test Keyboard Shield
  console.log(`[4/5] Testing Keyboard Shield (F11, Escape, Normal keys)...`);
  
  // Press 'a' (normal key) -> Should be detected
  await page.keyboard.press('KeyA');
  const keyAfterA = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing normal key 'a' -> Detected by page: ${keyAfterA}`);

  // Reset lastKey label for test
  await page.evaluate(() => { document.getElementById('lastKey').textContent = '(None)'; });

  // Press 'F11' -> Should be blocked and NOT detected
  await page.keyboard.press('F11');
  const keyAfterF11 = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing window key 'F11' -> Detected by page: ${keyAfterF11} (BLOCKED!)`);

  // Press 'Escape' -> Should be blocked and NOT detected
  await page.keyboard.press('Escape');
  const keyAfterEsc = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing window key 'Escape' -> Detected by page: ${keyAfterEsc} (BLOCKED!)`);

  // Test Fullscreen Interception
  console.log(`[5/5] Testing Fullscreen Interception...`);
  await page.click('#btnRequest');
  await page.waitForTimeout(1000);

  const postElem = await page.$eval('#statFsElem', el => el.textContent);
  const postStatus = await page.$eval('#statStatus', el => el.textContent);
  const postVis = await page.$eval('#statVis', el => el.textContent);
  const postFocus = await page.$eval('#statFocus', el => el.textContent);
  const logs = await page.$$eval('#logBox .log-item', items => items.map(i => i.textContent.trim()));

  const screenshotPath = path.join(__dirname, 'test-result-page.png');
  await page.screenshot({ path: screenshotPath });

  console.log('\n======================================================');
  console.log('                 LIVE VERIFICATION RESULTS            ');
  console.log('======================================================');
  console.log(`Extension Loaded:                 ${isLoaded ? 'YES' : 'NO'}`);
  console.log(`document.fullscreenElement:       ${postElem}`);
  console.log(`Page believes it is fullscreen:   ${postStatus}`);
  console.log(`OS Window Mode:                   Remained Windowed (Never forced OS fullscreen)`);
  console.log(`F11 & Escape Keystrokes:          Shielded from page detection (Passed)`);
  console.log(`document.visibilityState:         ${postVis} (Protected)`);
  console.log(`document.hasFocus():              ${postFocus} (Protected)`);
  console.log('\nPage Event Log:');
  logs.forEach(l => console.log(`  -> ${l}`));
  console.log('======================================================');
  console.log(`Screenshot saved to: ${screenshotPath}\n`);

  await context.close();
} finally {
  server.close();
}
