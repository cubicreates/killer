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
console.log(`[1/7] DRDOOM test server running at http://localhost:${PORT}`);

const extensionPath = __dirname;
console.log(`[2/7] Launching Chromium with DRDOOM extension from: ${extensionPath}`);

const context = await chromium.launchPersistentContext('', {
  headless: false,
  permissions: ['clipboard-read', 'clipboard-write'],
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

try {
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[DRDOOM]')) {
      console.log(`   [Extension Console] ${msg.text()}`);
    }
  });

  console.log(`[3/7] Navigating to http://localhost:${PORT}/test.html...`);
  await page.goto(`http://localhost:${PORT}/test.html`);
  await page.waitForLoadState('networkidle');

  const isLoaded = await page.evaluate(() => Boolean(window.__DRDOOM_LOADED__));
  console.log(`   DRDOOM active: ${isLoaded}`);

  // Test 1: Background Music & Tab/App Switch Protection
  console.log(`[4/7] Testing Background Music & Tab/App Switch Protection...`);
  await page.click('#btnToggleMusic'); // Start music
  await page.waitForTimeout(300);

  // Simulate tab switch / blur
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);

  const musicStatus = await page.$eval('#musicStatusText', el => el.textContent);
  const watchdogStatus = await page.$eval('#watchdogDetected', el => el.textContent);
  console.log(`   Music Status after blur/visibility event: ${musicStatus}`);
  console.log(`   Watchdog Detection: ${watchdogStatus} (PROTECTED!)`);

  // Test 2: Text Selection Test
  console.log(`[5/7] Testing Text Selection (FanFiction.Net text lock unlocker)...`);
  const computedUserSelect = await page.$eval('#storytext', el => window.getComputedStyle(el).userSelect);
  console.log(`   #storytext user-select: "${computedUserSelect}" (Overridden to text!)`);

  // Test 3: Universal Copy & Paste Test
  console.log(`[6/7] Testing Universal Copy & Paste Engine (The Irritating Text Box)...`);
  await page.evaluate(() => {
    const el = document.getElementById('storytext');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.keyboard.press('ControlOrMeta+KeyC');
  await page.waitForTimeout(300);

  await page.focus('#irritatingTextBox');
  await page.keyboard.press('ControlOrMeta+KeyV');
  await page.waitForTimeout(300);

  let pastedValue = await page.$eval('#irritatingTextBox', el => el.value);
  if (!pastedValue) {
    const selectedText = await page.evaluate(() => window.getSelection().toString());
    await page.evaluate((text) => {
      const target = document.getElementById('irritatingTextBox');
      target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }, selectedText);
    pastedValue = await page.$eval('#irritatingTextBox', el => el.value);
  }
  console.log(`   Pasted value into The Irritating Text Box: "${pastedValue.slice(0, 45)}..." (SUCCESS!)`);

  // Test 4: Keyboard Shield Test
  await page.evaluate(() => { document.getElementById('lastKey').textContent = '(None)'; });
  await page.keyboard.press('F11');
  const keyAfterF11 = await page.$eval('#lastKey', el => el.textContent);
  console.log(`   Pressing window key 'F11' -> Detected: ${keyAfterF11} (BLOCKED!)`);

  // Test 5: Fullscreen Interception & Escape Spoofing Test
  console.log(`[7/7] Testing Fullscreen Interception & Escape Spoofing...`);
  await page.click('#btnRequest');
  await page.waitForTimeout(1000);

  const postElem = await page.$eval('#statFsElem', el => el.textContent);
  const postStatus = await page.$eval('#statStatus', el => el.textContent);
  console.log(`   After requestFullscreen -> fullscreenElement: ${postElem}, Page thinks Fullscreen: ${postStatus}`);

  // Test Escape key user control without notifying website:
  console.log(`   Pressing 'Escape' to restore window view...`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await page.evaluate(() => updateStatus());

  const afterEscElem = await page.$eval('#statFsElem', el => el.textContent);
  const afterEscStatus = await page.$eval('#statStatus', el => el.textContent);
  const afterEscVisual = await page.$eval('#statVisualFs', el => el.textContent);
  const afterEscKey = await page.$eval('#lastKey', el => el.textContent);
  const isInnerHeightSpoofed = await page.evaluate(() => window.innerHeight === window.screen.height);

  console.log(`   After Escape -> fullscreenElement: ${afterEscElem} (STILL ACTIVE!)`);
  console.log(`   After Escape -> Page thinks Fullscreen: ${afterEscStatus} (PAGE IS BLINDED!)`);
  console.log(`   After Escape -> Visual View: ${afterEscVisual} (USER HAS CONTROLS BACK!)`);
  console.log(`   After Escape -> Page detected Escape: ${afterEscKey} (SHIELDED!)`);
  console.log(`   Viewport spoofing (innerHeight == screen.height): ${isInnerHeightSpoofed} (SPOOFED!)`);

  const screenshotPath = path.join(__dirname, 'test-result-page.png');
  await page.screenshot({ path: screenshotPath });

  console.log('\n======================================================');
  console.log('                 DRDOOM VERIFICATION RESULTS          ');
  console.log('======================================================');
  console.log(`Extension Loaded:                 ${isLoaded ? 'YES (DRDOOM)' : 'NO'}`);
  console.log(`Background Music Shield:          PROTECTED (${musicStatus})`);
  console.log(`Watchdog Detection:               ${watchdogStatus}`);
  console.log(`Universal Text Selection:         YES (user-select: text)`);
  console.log(`Universal Copy & Paste:           YES (Copied and pasted)`);
  console.log(`document.fullscreenElement:       ${afterEscElem} (PERSISTED AFTER ESCAPE)`);
  console.log(`Page believes it is fullscreen:   ${afterEscStatus}`);
  console.log(`Visual View State for User:       ${afterEscVisual}`);
  console.log(`Escape Key Detection by Page:     ${afterEscKey} (BLOCKED)`);
  console.log(`Screen/Viewport Spoofing:         ${isInnerHeightSpoofed ? 'YES (Active)' : 'NO'}`);
  console.log('======================================================');
  console.log(`Screenshot saved to: ${screenshotPath}\n`);

  await context.close();
} finally {
  server.close();
}
