# DRDOOM

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Chrome%20Extension%20MV3-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera-success?style=for-the-badge" alt="Browsers" />
  <img src="https://img.shields.io/badge/Interface-Zero--UI%20%2F%20Silent-purple?style=for-the-badge" alt="Zero-UI" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local%20%2F%20No%20Telemetry-green?style=for-the-badge" alt="Privacy" />
  <img src="https://img.shields.io/badge/Version-1.0.0-orange?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge" alt="License" />
</p>

---

**DRDOOM** is a silent, zero-configuration Chrome Extension (Manifest V3) that runs invisibly in the background to grant users total control over web browser behavior across all websites.

It eliminates intrusive web restrictions: preventing websites from forcing real fullscreen, stopping audio players from pausing when switching tabs or Alt-Tabbing, re-enabling text selection on locked sites like FanFiction.Net, and guaranteeing universal copy and paste.

---

## ⚡ Key Capabilities

### 1. 🎵 Tab & App Switch Shield (Background Music Protection)
- **The Problem:** Many browser-based music players, web audio tools, and video players automatically pause playback the moment you switch tabs or Alt+Tab to another desktop application.
- **The DRDOOM Fix:**
  - Locks `document.visibilityState` to permanently report `"visible"`.
  - Locks `document.hidden` to permanently report `false`.
  - Locks `document.hasFocus()` to permanently report `true`.
  - Traps and silences `visibilitychange`, `blur`, `focusout`, and `pagehide` events in the capture phase.
  - **Result:** You can switch tabs, minimize Chrome, or Alt+Tab to VS Code/Discord/games, and your background audio will play continuously without pausing.

### 2. 🖥️ Fullscreen Interception
- **The Problem:** Sites force the browser into full OS-level fullscreen, hijacking your monitor and hiding tabs, taskbars, and tools.
- **The DRDOOM Fix:**
  - Intercepts `Element.prototype.requestFullscreen()` (and vendor prefixes) in the page's MAIN execution world.
  - Resolves the promise immediately, sets `document.fullscreenElement`, and fires `fullscreenchange` events.
  - **Result:** The website believes it is in fullscreen, while your browser window remains safely windowed.

### 3. 📖 Universal Text Selection (FanFiction.Net & Text Lock Unblocker)
- **The Problem:** Websites (such as FanFiction.Net, news outlets, and blogs) lock story text and author notes with CSS `-webkit-user-select: none` and `onselectstart="return false;"`.
- **The DRDOOM Fix:**
  - Injects high-priority global CSS (`user-select: text !important`) across all elements, specifically targeting `#storytext` and `.storytext`.
  - Neutralizes `onselectstart` and `selectstart` events.
  - **Result:** You can highlight, select, and search author names and notes freely.

### 4. 📋 Universal Clipboard Force-Sync (Copy & Paste Everywhere)
- **The Problem:** Anti-copy scripts intercept `copy` events and wipe the clipboard data (`e.preventDefault()`), and input forms block pasting with `onpaste="return false;"`.
- **The DRDOOM Fix:**
  - Intercepts `copy` and `cut` events in the capture phase and forces `window.getSelection().toString()` directly into `e.clipboardData`.
  - Shields `Ctrl+C`, `Ctrl+X`, and `Ctrl+V` from website keydown interception.
  - Neutralizes `onpaste` blocks so you can paste into any input field.

### 5. ⌨️ Window Management Key Shield
- Traps all function keys (`F1` through `F12`), `Escape`, and window resize shortcuts (`Alt+Enter`, `Meta+Arrows`) before page scripts can intercept them.
- Prevents websites from logging when you toggle window states.

---

## 📦 Installation Guide

Choose any of the three installation methods below:

### Method 1: Direct `.crx` File (Recommended from GitHub Releases)

> **No Node.js, no terminal, and no Google account required!**

1. Download the latest **`DRDOOM.crx`** file from the **[Releases](https://github.com/cubicreates/killer/releases)** page.
2. Open Google Chrome (or Edge / Brave / Opera).
3. In the address bar, go to:
   ```text
   chrome://extensions
   ```
4. Toggle **ON** the **Developer mode** switch (located in the top-right corner).
5. Drag and drop the downloaded **`DRDOOM.crx`** file directly onto the `chrome://extensions` page.
6. When prompted with *"Add DRDOOM?"*, click **Add extension**.

---

### Method 2: Load Unpacked (Source / ZIP)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/cubicreates/killer.git
   ```
   *(Or download and extract the repository ZIP).*
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click the **Load unpacked** button (top-left).
5. Select the project directory (`D:\Github\KillerExtention`).
6. DRDOOM is now active!

---

### Method 3: Using on Someone Else's PC (Zero Traces)

If you are using a friend's, school, or work computer:
1. Click the **Profile icon** (top-right circle in Chrome) -> **"Continue without an account"**.
2. Go to `chrome://extensions` and drag in `DRDOOM.crx` (or Load Unpacked).
3. No admin password or Google sign-in is required.
4. When finished, delete the temporary profile—leaving zero traces behind.

---

## 🔬 Local Verification Lab

The repository includes a built-in test harness to verify all features:

```bash
# 1. Start the local verification server
npm run dev
```

Visit **`http://localhost:5173/`** to test:
- **Audio Watchdog Shield:** Click "Play Music", then switch tabs or Alt+Tab to verify audio never stops.
- **Text Selection:** Highlight and select protected FanFiction.Net story text.
- **Copy & Paste:** Copy protected text and paste it into the anti-paste input.
- **Keyboard Shield:** Verify `F11`, `Escape`, and `F1`-`F12` are shielded.
- **Fullscreen Simulation:** Click "Request Fullscreen" and watch the state turn green while remaining windowed.

### Automated Testing

DRDOOM includes an end-to-end automated Playwright test suite:

```bash
npm test
```

This launches a headless Chromium instance with the extension loaded, executes all 7 feature scenarios, and verifies zero failures.

---

## 📁 Repository Structure & Filing

```text
KillerExtention/
├── manifest.json        # Manifest V3 extension configuration
├── interceptor.js       # Main-world script interceptor (Fullscreen, Audio, Keys, Copy)
├── background.js        # Extension lifecycle service worker
├── DRDOOM.crx           # Packed standalone extension release deliverable
├── test.html            # Interactive verification laboratory
├── server.mjs           # Zero-dependency local testing server
├── test-runner.mjs      # Playwright automated test suite
├── package.json         # Scripts and dev dependencies
└── README.md            # Documentation
```

### Filing Recommendation:
- **Root Directory:** Contains the clean, unminified extension files (`manifest.json`, `interceptor.js`, `background.js`).
- **Release Deliverable:** `DRDOOM.crx` is stored at the repository level for direct attachment to GitHub Releases.

---

## 🌐 Browser Compatibility

| Browser | Supported? | Notes |
| :--- | :---: | :--- |
| **Google Chrome** | ✅ Yes | Manifest V3 supported (Chrome 111+) |
| **Microsoft Edge** | ✅ Yes | Natively supported via Chromium |
| **Brave Browser** | ✅ Yes | Full support |
| **Opera / Opera GX** | ✅ Yes | Full support |
| **Vivaldi** | ✅ Yes | Full support |

---

## 🔒 Security & Privacy

- **100% Client-Side:** DRDOOM operates entirely in memory on your local machine.
- **Zero Telemetry:** No external network requests, analytics, or tracking.
- **No Data Storage:** DRDOOM does not save, log, or transmit passwords, cookies, or text.
- **Non-Destructive:** Does not alter browser settings or operating system files.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
