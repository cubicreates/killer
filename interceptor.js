// DRDOOM - Silent Browser Enhancement & Research Suite
// Runs at document_start in the MAIN world.
// Intercepts Fullscreen API, shields window keys, protects against tab/app switch detection (Alt+Tab),
// enables universal text selection (FanFiction.Net), and forces universal clipboard (Copy/Paste).

(function () {
  'use strict';

  if (window.__DRDOOM_LOADED__) {
    return;
  }
  window.__DRDOOM_LOADED__ = true;
  window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__ = true;

  let currentFullscreenElement = null;

  // ==========================================
  // 1. FULLSCREEN API INTERCEPTION
  // ==========================================
  function dispatchFullscreenEvents() {
    const eventNames = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    eventNames.forEach(function (name) {
      try {
        const evt = new Event(name, { bubbles: true, cancelable: false });
        document.dispatchEvent(evt);

        const onHandlerName = 'on' + name.toLowerCase();
        if (typeof document[onHandlerName] === 'function') {
          try {
            document[onHandlerName](evt);
          } catch (e) {}
        }
      } catch (e) {}
    });
  }

  function mockRequestFullscreen() {
    currentFullscreenElement = this;
    queueMicrotask(function () {
      dispatchFullscreenEvents();
    });
    return Promise.resolve();
  }

  const elementRequestMethods = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'webkitRequestFullScreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ];
  elementRequestMethods.forEach(function (methodName) {
    try {
      Element.prototype[methodName] = mockRequestFullscreen;
    } catch (e) {}
  });

  function mockExitFullscreen() {
    currentFullscreenElement = null;
    queueMicrotask(function () {
      dispatchFullscreenEvents();
    });
    return Promise.resolve();
  }

  const documentExitMethods = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'webkitCancelFullScreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  documentExitMethods.forEach(function (methodName) {
    try {
      Document.prototype[methodName] = mockExitFullscreen;
      document[methodName] = mockExitFullscreen;
    } catch (e) {}
  });

  const fsPropertyDefinitions = {
    fullscreenElement: () => currentFullscreenElement,
    webkitFullscreenElement: () => currentFullscreenElement,
    mozFullScreenElement: () => currentFullscreenElement,
    msFullscreenElement: () => currentFullscreenElement,
    fullscreenEnabled: () => true,
    webkitFullscreenEnabled: () => true,
    mozFullScreenEnabled: () => true,
    msFullscreenEnabled: () => true,
    fullscreen: () => currentFullscreenElement !== null,
    webkitIsFullScreen: () => currentFullscreenElement !== null
  };

  Object.keys(fsPropertyDefinitions).forEach(function (prop) {
    const descriptor = {
      get: fsPropertyDefinitions[prop],
      configurable: true,
      enumerable: true
    };
    try { Object.defineProperty(Document.prototype, prop, descriptor); } catch (e) {}
    try { Object.defineProperty(document, prop, descriptor); } catch (e) {}
  });

  // ==========================================
  // 2. WINDOW & KEYBOARD SHIELD (F-keys, Escape, Ctrl+C/V)
  // ==========================================
  const protectedKeys = new Set([
    'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ]);

  function handleKeyShield(e) {
    const isProtectedKey = protectedKeys.has(e.key) ||
      (typeof e.key === 'string' && e.key.startsWith('F') && !isNaN(e.key.slice(1)));
    const isWindowCombo = (e.altKey && (e.key === 'Enter' || e.key === 'F11')) ||
      (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown'));
    
    // Shield clipboard shortcuts from page interception
    const isClipboardShortcut = (e.ctrlKey || e.metaKey) && (
      e.key === 'c' || e.key === 'C' ||
      e.key === 'x' || e.key === 'X' ||
      e.key === 'v' || e.key === 'V' ||
      e.key === 'Insert'
    );

    if (isProtectedKey || isWindowCombo || isClipboardShortcut) {
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('keydown', handleKeyShield, true);
  window.addEventListener('keyup', handleKeyShield, true);
  window.addEventListener('keypress', handleKeyShield, true);
  document.addEventListener('keydown', handleKeyShield, true);
  document.addEventListener('keyup', handleKeyShield, true);

  // ==========================================
  // 3. TAB & APP SWITCH PROTECTION (ALT+TAB & BACKGROUND AUDIO SHIELD)
  // ==========================================
  // Locks visibility and focus so music players and websites never detect tab changes or Alt+Tab
  try {
    Object.defineProperty(Document.prototype, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(Document.prototype, 'hidden', {
      get: () => false,
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true,
      enumerable: true
    });
    Document.prototype.hasFocus = () => true;
    document.hasFocus = () => true;
  } catch (e) {}

  // Stop visibilitychange, blur, focusout, and pagehide from alerting the page
  function handleTabAndAppShield(e) {
    e.stopImmediatePropagation();
  }

  window.addEventListener('visibilitychange', handleTabAndAppShield, true);
  document.addEventListener('visibilitychange', handleTabAndAppShield, true);
  window.addEventListener('blur', handleTabAndAppShield, true);
  document.addEventListener('blur', handleTabAndAppShield, true);
  window.addEventListener('focusout', handleTabAndAppShield, true);
  document.addEventListener('focusout', handleTabAndAppShield, true);
  window.addEventListener('pagehide', handleTabAndAppShield, true);

  // Neutralize inline handler properties on prototypes
  const tabBlockedProps = ['onblur', 'onfocusout', 'onvisibilitychange', 'onpagehide'];
  tabBlockedProps.forEach(function (prop) {
    try {
      Object.defineProperty(window, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(document, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(Document.prototype, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(HTMLElement.prototype, prop, { get: () => null, set: () => {}, configurable: true });
    } catch (e) {}
  });

  // Window resize shield: prevents maximizing/minimizing window from triggering fullscreen exit alerts
  window.addEventListener('resize', function (e) {
    if (currentFullscreenElement !== null) {
      e.stopImmediatePropagation();
    }
  }, true);

  // ==========================================
  // 4. UNIVERSAL TEXT SELECTION ENABLER
  // ==========================================
  function applyTextSelectionStyles() {
    const styleId = '__drdoom_text_selection_enabler__';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        *, *::before, *::after, html, body, div, span, p, a, article, section, main, #storytext, .storytext {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `;
      const root = document.head || document.documentElement;
      if (root) {
        root.appendChild(style);
      }
    }
  }

  if (document.documentElement) {
    applyTextSelectionStyles();
  } else {
    document.addEventListener('readystatechange', applyTextSelectionStyles);
  }
  document.addEventListener('DOMContentLoaded', applyTextSelectionStyles);

  // ==========================================
  // 5. UNIVERSAL CLIPBOARD FORCE-SYNC ENGINE (COPY & PASTE)
  // ==========================================
  function handleForceCopy(e) {
    e.stopImmediatePropagation();

    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';

    if (text) {
      if (e.clipboardData) {
        e.clipboardData.clearData();
        e.clipboardData.setData('text/plain', text);
        e.preventDefault();
      }
    }
  }

  function handleForcePaste(e) {
    e.stopImmediatePropagation();
  }

  function handleGenericAllow(e) {
    e.stopPropagation();
  }

  window.addEventListener('copy', handleForceCopy, true);
  document.addEventListener('copy', handleForceCopy, true);
  window.addEventListener('cut', handleForceCopy, true);
  document.addEventListener('cut', handleForceCopy, true);
  window.addEventListener('paste', handleForcePaste, true);
  document.addEventListener('paste', handleForcePaste, true);
  window.addEventListener('selectstart', handleGenericAllow, true);
  document.addEventListener('selectstart', handleGenericAllow, true);
  window.addEventListener('contextmenu', handleGenericAllow, true);
  document.addEventListener('contextmenu', handleGenericAllow, true);

  const blockedClipboardProps = ['onselectstart', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'ondragstart'];
  blockedClipboardProps.forEach(function (prop) {
    try {
      Object.defineProperty(Document.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
    } catch (e) {}
  });

  console.log('[DRDOOM] Active: Fullscreen interception, window keys, tab/app switch protection, text selection, and universal clipboard active.');
})();
