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

### 2. 🖥️ Fullscreen Maximization & Stealth Escape Control
- **The Problem:** Sites force full OS-level fullscreen to lock you into their window, monitor you via `document.fullscreenElement`, track window dimensions (`innerHeight === screen.height`), and catch you if you press `Escape` or `Alt+Tab`.
- **The DRDOOM Fix:**
  - **Auto-Maximization on Launch:** When the site calls `requestFullscreen()`, DRDOOM visually expands the target element to fill the viewport and commands Chrome's background service worker to maximize the browser window.
  - **API Spoofing:** Resolves `requestFullscreen()` immediately, fires `fullscreenchange` events, and locks `document.fullscreenElement` to the element.
  - **Stealth Escape (User in Full Control):**
    - Press **`Escape`**: Restores the window to normal size and un-locks the visual view for you, but **NEVER tells the website**. The website still sees `document.fullscreenElement !== null` and no exit event is ever fired!
    - Press **`Shift+Escape`**: Minimizes the browser window directly to the taskbar while keeping the website completely spoofed.
  - **Viewport Dimension Armor:** Spoofs `window.innerWidth` and `window.innerHeight` to report `screen.width` and `screen.height`, blinding sites that check if your window matches the monitor resolution.
  - **Result:** The site believes you are 100% trapped in fullscreen, while you freely have window controls, tabs, and `Alt+Tab` multitasking.

### 3. 📖 Universal Text Selection (FanFiction.Net & Text Lock Unblocker)
- **The Problem:** Websites (such as FanFiction.Net, news outlets, and blogs) lock story text and author notes with CSS `-webkit-user-select: none` and `onselectstart="return false;"`.
- **The DRDOOM Fix:**
  - Injects high-priority global CSS (`user-select: text !important`) across all elements, specifically targeting `#storytext` and `.storytext`.
  - Neutralizes `onselectstart` and `selectstart` events.
  - **Result:** You can highlight, select, and search author names and notes freely.

### 4. 📋 Universal Paste & Ghost Human Typer (`Ctrl+V`)
- **The Problem:** 
  1. *Form Lockers:* Exam/portal input fields block pasting via `onpaste="return false;"` or `e.preventDefault()` on `paste`.
  2. *Sneaky Paste Detectors:* Clever chat sites and anti-cheat portals monitor `InputEvent.inputType === 'insertFromPaste'`, listen for `paste` events, or flag you if 100+ characters appear instantly with zero `keydown` events (*"You pasted this response!"*).
- **The DRDOOM Fix:**
  - **Ghost Human Typer Dual-Action Engine on `Ctrl+V` (and `Cmd+V`):**
    - **Frontend (Zero-Wait User Experience):** The full text is inserted into the input field / contenteditable **immediately** the instant you press `Ctrl+V`. You don't have to wait or watch letters trickle in slowly—the value is right there!
    - **Backend (Authentic Keystroke Telemetry):** In the background, DRDOOM streams individual `keydown` $\rightarrow$ `beforeinput` $\rightarrow$ `input` $\rightarrow$ `keyup` events for every single character. Website telemetry, proctoring scripts, and keyloggers record an authentic stream of keystrokes ("happening happening happening")!
    - **Zero `paste` Events:** Completely suppresses the browser's native paste action, ensuring 0 `paste` events are ever fired on the page.
    - **Anti-Paste Blindness:** Defeats burst checkers (flags on 10+ chars with 0 keydowns) and spoofs `InputEvent.prototype.inputType` to always report `'insertText'` rather than `'insertFromPaste'`.
    - Automatically strips `onpaste` attributes and disarms property setters.
    - Press **`Escape`** at any point to immediately cancel any background stream.

### 5. 🥷 100% Stealth & Toolbar Auto-Pinning Protection
- **The Toolbar Pinning Mechanics:** In modern Chromium (Chrome 120+), the browser UI engine controls toolbar pinning at the user level—no extension API exists in Chrome's C++ core allowing extensions to programmatically unpin themselves.
- **The DRDOOM Solution:**
  1. **Zero-UI Architecture:** DRDOOM declares no popup, no action badge, and no toolbar UI in `manifest.json`.
  2. **100% Invisible Icon:** DRDOOM includes a completely transparent 1x1 icon (`icon.png`). Even if Chrome displays or pins an icon on your toolbar, it is **100% visually invisible** (zero visual footprint).
  3. **1-Click Permanent Unpin:** You can right-click the invisible spot or click the puzzle piece icon (`Extensions`) and click **"Unpin"**. Chrome permanently remembers this choice.

### 6. ⌨️ Window Management Key Shield
- Traps all function keys (`F1` through `F12`), `Escape`, and window resize shortcuts (`Alt+Enter`, `Meta+Arrows`) before page scripts can intercept them.
- Prevents websites from logging when you toggle window states.

---

## 📦 Installation Guide

Choose the method that suits your workflow:

### Method 1: GitHub Release ZIP (Recommended — Fastest & 100% Reliable)

> **No Node.js, no terminal, and no Google account required!**

1. Download **`DRDOOM-v1.0.0.zip`** from the **[Releases](https://github.com/cubicreates/killer/releases)** page.
2. Unzip it to any folder on your computer (e.g. `Downloads/DRDOOM` or `Documents/DRDOOM`).
3. Open Google Chrome (or Edge / Brave / Opera) and navigate to:
   ```text
   chrome://extensions
   ```
4. Toggle **ON** the **Developer mode** switch (located in the top-right corner).
5. Click the **Load unpacked** button (top-left) and select the unzipped `DRDOOM` folder.
6. DRDOOM is immediately active and permanently running in the background!

> **Why ZIP instead of CRX?**  
> On Windows, Google Chrome strictly blocks self-signed `.crx` files outside the Chrome Web Store to protect against malware (showing *"This extension is not listed in the Chrome Web Store"*). Distributing the clean `.zip` for **Load unpacked** bypasses this completely—it never triggers warnings, requires zero sign-in, and never gets auto-disabled.

---

### Method 2: Load Unpacked from Git Source

1. Clone or download this repository:
   ```bash
   git clone https://github.com/cubicreates/killer.git
   ```
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the repository root folder.

---

### Method 3: Using on Someone Else's PC (Zero Traces)

If you are using a friend's, school, or work computer:
1. Click the **Profile icon** (top-right circle in Chrome) -> **"Continue without an account"**.
2. Go to `chrome://extensions` and click **Load unpacked** on the unzipped folder.
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
