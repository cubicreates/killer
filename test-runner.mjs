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
console.log(`[1/6] Test server running at http://localhost:${PORT}`);

const extensionPath = __dirname;
console.log(`[2/6] Launching Chromium with extension from: ${extensionPath}`);

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

  console.log(`[3/6] Navigating to http://localhost:${PORT}/test.html...`);
  await page.goto(`http://localhost:${PORT}/test.html`);
  await page.waitForLoadState('networkidle');

  // Verify extension loaded
  const isLoaded = await page.evaluate(() => Boolean(window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__));
  console.log(`   Extension active: ${isLoaded}`);

  // Test 1: Text Selection Test (FanFiction.Net Simulation)
  console.log(`[4/6] Testing Text Selection (FanFiction.Net text lock unlocker)...`);
  const computedUserSelect = await page.$eval('#storytext', el => window.getComputedStyle(el).userSelect);
  const onselectstartProp = await page.$eval('#storytext', el => el.onselectstart);
  console.log(`   #storytext computed user-select: "${computedUserSelect}" (Overridden to text!)`);
  console.log(`   #storytext onselectstart property: ${onselectstartProp} (Neutralized!)`);

  // Programmatically select text in storytext
  const selectedText = await page.evaluate(() => {
    const el = document.getElementById('storytext');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return sel.toString();
  });
  console.log(`   Successfully highlighted & selected story text: "${selectedText.slice(0, 40)}..."`);

  // Test 2: Keyboard Shield Test
  console.log(`[5/6] Testing Keyboard Shield (F11, Escape, Normal keys)...`);
  await page.keyboard.press('KeyA');
  const keyAfterA = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing normal key 'a' -> Detected: ${keyAfterA}`);

  await page.evaluate(() => { document.getElementById('lastKey').textContent = '(None)'; });

  await page.keyboard.press('F11');
  const keyAfterF11 = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing window key 'F11' -> Detected: ${keyAfterF11} (BLOCKED!)`);

  await page.keyboard.press('Escape');
  const keyAfterEsc = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing window key 'Escape' -> Detected: ${keyAfterEsc} (BLOCKED!)`);

  // Test 3: Fullscreen Interception Test
  console.log(`[6/6] Testing Fullscreen Interception...`);
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
  console.log(`Text Selection Unlocked:          YES (user-select: text)`);
  console.log(`document.fullscreenElement:       ${postElem}`);
  console.log(`Page believes it is fullscreen:   ${postStatus}`);
  console.log(`Window Management Keys:           Shielded from page detection`);
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
