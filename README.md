# DRDOOM

A silent, zero-UI Chrome Extension (Manifest V3) that runs in the background to provide full browser control and protection across all websites.

## Core Capabilities

1. **Fullscreen Interception:**
   - When a website or button requests fullscreen, your browser window **remains windowed**.
   - The page receives a resolved promise, `document.fullscreenElement` reports the element, and `fullscreenchange` fires normally.
2. **Tab & App Switch Protection (Background Music Shield):**
   - Locks `document.visibilityState` to `"visible"` and `document.hidden` to `false`.
   - Locks `document.hasFocus()` to `true`.
   - Traps and suppresses `blur`, `focusout`, and `visibilitychange` events in the capture phase.
   - **Result:** Music apps, audio players, and websites never detect when you switch tabs or Alt+Tab to another desktop app—music keeps playing continuously!
3. **Universal Text Selection (FanFiction.Net Unblocker):**
   - Injects high-priority CSS `user-select: text !important` across all elements (including `#storytext`).
   - Neutralizes `onselectstart`, allowing you to highlight, drag, and search any text or author notes.
4. **Universal Clipboard Engine (Copy & Paste):**
   - Traps `copy` and `cut` events in capture phase and forces selected text into `clipboardData`.
   - Shields `Ctrl+C` / `Ctrl+V` keystrokes from website cancellation scripts.
   - Neutralizes anti-paste scripts (`onpaste="return false;"`) so you can paste anywhere.
5. **Window Management Key Shield:**
   - Traps all function keys (`F1`-`F12`), `Escape`, and window resize shortcuts before page scripts can intercept them.

---

## Quick Installation in Google Chrome

1. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select this directory:
   ```text
   D:\Github\KillerExtention
   ```
5. **DRDOOM** is now loaded and running silently!

---

## Local Verification Lab

1. Start the local server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173/` in Chrome.
3. Test background music, text selection, copy/paste, keyboard shield, and fullscreen simulation!
