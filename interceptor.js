// DRDOOM - Silent Browser Enhancement & Research Suite
// Runs at document_start in the MAIN world.
// Intercepts Fullscreen API, shields window keys, protects against tab/app switch detection (Alt+Tab),
// enables universal text selection (FanFiction.Net), and forces universal clipboard (Copy & Universal Paste).

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

  const tabBlockedProps = ['onblur', 'onfocusout', 'onvisibilitychange', 'onpagehide'];
  tabBlockedProps.forEach(function (prop) {
    try {
      Object.defineProperty(window, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(document, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(Document.prototype, prop, { get: () => null, set: () => {}, configurable: true });
      Object.defineProperty(HTMLElement.prototype, prop, { get: () => null, set: () => {}, configurable: true });
    } catch (e) {}
  });

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
  // 5. UNIVERSAL CLIPBOARD FORCE-SYNC ENGINE (COPY & UNIVERSAL PASTE)
  // ==========================================

  function getActiveOrTargetElement(e) {
    let target = e ? e.target : null;
    if (!target || target === document.body || target === document.documentElement) {
      target = document.activeElement || target;
    }
    while (target && target.shadowRoot && target.shadowRoot.activeElement) {
      target = target.shadowRoot.activeElement;
    }
    return target;
  }

  function findEditableTarget(target) {
    if (!target) return null;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return target;
    }
    if (target.isContentEditable) {
      return target;
    }
    if (typeof target.closest === 'function') {
      const closestEditable = target.closest('[contenteditable="true"], [contenteditable=""], textarea, input');
      if (closestEditable) return closestEditable;
    }
    return target;
  }

  // Helper to force-insert text into any input, textarea, or contenteditable target
  function forceInsertText(rawTarget, text) {
    if (!text || !rawTarget) return;

    const target = findEditableTarget(rawTarget);
    if (!target) return;

    // Handle ContentEditable elements (e.g. Notion, Google Docs, Discord web, modern editors)
    if (target.isContentEditable) {
      try {
        const success = document.execCommand('insertText', false, text);
        if (!success) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch (err) {}
      return;
    }

    // Handle standard inputs and textareas (including React, Vue, Angular controlled fields)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      try {
        const start = typeof target.selectionStart === 'number' ? target.selectionStart : (target.value || '').length;
        const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : (target.value || '').length;
        const val = target.value || '';
        const newVal = val.slice(0, start) + text + val.slice(end);

        // Bypass React / modern framework synthetic event interception via prototype setter
        const proto = target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(target, newVal);
        } else {
          target.value = newVal;
        }

        const newPos = start + text.length;
        try {
          target.setSelectionRange(newPos, newPos);
        } catch (e) {}

        target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      } catch (err) {
        target.value = (target.value || '') + text;
        target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
    }
  }

  // Force-Copy: Extracts selected text and ensures it is placed into clipboardData
  function handleForceCopy(e) {
    e.stopImmediatePropagation();

    const selection = window.getSelection();
    let text = selection ? selection.toString() : '';

    // If nothing selected in window, check active input/textarea selection
    if (!text && document.activeElement) {
      const active = document.activeElement;
      if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          text = (active.value || '').slice(start, end);
        }
      }
    }

    if (text) {
      if (e.clipboardData) {
        try {
          e.clipboardData.clearData();
          e.clipboardData.setData('text/plain', text);
          e.preventDefault();
        } catch (err) {}
      }
    }
  }

  // Universal Paste Engine: Neutralizes anti-paste scripts and guarantees insertion
  function handleForcePaste(e) {
    e.stopImmediatePropagation();

    let text = '';
    if (e.clipboardData) {
      text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';
    }

    const target = getActiveOrTargetElement(e);

    if (text && target) {
      forceInsertText(target, text);
      e.preventDefault(); // Prevents anti-paste scripts from rejecting or clearing the paste
    } else if (target && navigator.clipboard && navigator.clipboard.readText) {
      // Async fallback if clipboardData is restricted
      navigator.clipboard.readText().then(function (clipText) {
        if (clipText) {
          forceInsertText(target, clipText);
        }
      }).catch(function () {});
      e.preventDefault();
    }
  }

  function handleForceCut(e) {
    handleForceCopy(e);
  }

  function handleGenericAllow(e) {
    e.stopPropagation();
  }

  window.addEventListener('copy', handleForceCopy, true);
  document.addEventListener('copy', handleForceCopy, true);
  window.addEventListener('cut', handleForceCut, true);
  document.addEventListener('cut', handleForceCut, true);
  window.addEventListener('paste', handleForcePaste, true);
  document.addEventListener('paste', handleForcePaste, true);
  window.addEventListener('selectstart', handleGenericAllow, true);
  document.addEventListener('selectstart', handleGenericAllow, true);
  window.addEventListener('contextmenu', handleGenericAllow, true);
  document.addEventListener('contextmenu', handleGenericAllow, true);

  // Strip anti-paste and anti-copy attributes from DOM
  function stripAntiClipboardAttributes(root) {
    try {
      const scope = root && root.querySelectorAll ? root : document;
      const elements = scope.querySelectorAll('[onpaste], [oncopy], [oncut], [onselectstart], [oncontextmenu]');
      elements.forEach(function (el) {
        el.removeAttribute('onpaste');
        el.removeAttribute('oncopy');
        el.removeAttribute('oncut');
        el.removeAttribute('onselectstart');
        el.removeAttribute('oncontextmenu');
      });
    } catch (e) {}
  }

  // Strip on initial load and observe dynamic insertions
  if (document.documentElement) {
    stripAntiClipboardAttributes(document);
  }
  document.addEventListener('DOMContentLoaded', () => stripAntiClipboardAttributes(document));

  try {
    const observer = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            stripAntiClipboardAttributes(node);
          }
        }
      }
    });
    observer.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch (e) {}

  // Neutralize inline handler properties on prototypes
  const blockedClipboardProps = ['onselectstart', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'ondragstart'];
  blockedClipboardProps.forEach(function (prop) {
    try {
      Object.defineProperty(Document.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLInputElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLTextAreaElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
    } catch (e) {}
  });

  console.log('[DRDOOM] Active: Fullscreen interception, window keys, tab/app switch protection, text selection, and Universal Paste Engine enabled.');
})();
