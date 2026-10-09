// DRDOOM - Silent Browser Enhancement & Research Suite
// Runs at document_start in the MAIN world.
// Intercepts Fullscreen API (true native fullscreen + stealth escape spoofing),
// shields window keys, protects against tab/app switch detection (Alt+Tab),
// enables universal text selection (FanFiction.Net), and disarms all anti-paste mechanisms.

(function () {
  'use strict';

  if (window.__DRDOOM_LOADED__) {
    return;
  }
  window.__DRDOOM_LOADED__ = true;
  window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__ = true;

  let currentFullscreenElement = null;

  // ==========================================
  // BRIDGE COMMUNICATION (MAIN WORLD -> ISOLATED BRIDGE -> BACKGROUND)
  // ==========================================
  function sendBridgeAction(action) {
    if (!action) return;
    try {
      window.postMessage({ source: '__DRDOOM__', action: action }, '*');
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('__DRDOOM_BRIDGE_EVENT__', {
        detail: { action: action }
      }));
    } catch (e) {}
  }

  // ==========================================
  // 1. FULLSCREEN API & NATIVE FULLSCREEN SPOOFER
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

    // Trigger REAL native browser fullscreen on the Chrome window
    sendBridgeAction('FULLSCREEN');

    // Dispatch fullscreenchange so website believes it is in true fullscreen
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
    sendBridgeAction('RESTORE');
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

  // Viewport / Screen dimension spoofing (blinds sites checking innerHeight === screen.height)
  try {
    const origInnerW = Object.getOwnPropertyDescriptor(window, 'innerWidth') || { get: () => window.innerWidth };
    const origInnerH = Object.getOwnPropertyDescriptor(window, 'innerHeight') || { get: () => window.innerHeight };

    Object.defineProperty(window, 'innerWidth', {
      get: function () {
        if (currentFullscreenElement !== null && window.screen) {
          return window.screen.width;
        }
        return origInnerW.get ? origInnerW.get.call(window) : window.outerWidth;
      },
      configurable: true
    });

    Object.defineProperty(window, 'innerHeight', {
      get: function () {
        if (currentFullscreenElement !== null && window.screen) {
          return window.screen.height;
        }
        return origInnerH.get ? origInnerH.get.call(window) : window.outerHeight;
      },
      configurable: true
    });
  } catch (e) {}

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

    // Escape Key User Control: Exit fullscreen to normal window without notifying the website!
    if (e.key === 'Escape' && e.type === 'keydown') {
      e.stopImmediatePropagation();
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Escape: Minimize window to taskbar
        sendBridgeAction('MINIMIZE');
      } else {
        // Normal Escape: Restore window from fullscreen to normal window for the user
        sendBridgeAction('RESTORE');
      }

      // CRITICAL: We deliberately do NOT clear currentFullscreenElement!
      // The website's document.fullscreenElement remains active, and NO exit event is fired!
      console.log('[DRDOOM] User pressed Escape: Window restored. Website still thinks fullscreen is active!');
      return;
    }

    if (isProtectedKey || isWindowCombo) {
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
  // 5. UNIVERSAL CLIPBOARD & PASTE ENGINE
  // ==========================================

  // LAYER 1: Neutralize Event.prototype.preventDefault during paste & copy
  // This allows the browser's native paste & copy engine to execute even when
  // websites call e.preventDefault() in paste listeners or on Ctrl+V keydown!
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (this.type === 'paste') {
      // Disarm website anti-paste script trying to prevent paste!
      return;
    }
    if (this.type === 'keydown') {
      const isPasteShortcut = (this.ctrlKey || this.metaKey) && (this.key === 'v' || this.key === 'V');
      if (isPasteShortcut) {
        // Disarm website trying to block Ctrl+V keydown!
        return;
      }
    }
    return originalPreventDefault.apply(this, arguments);
  };

  // LAYER 2: Neutralize Event.prototype.returnValue
  const originalReturnValueDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'returnValue');
  Object.defineProperty(Event.prototype, 'returnValue', {
    get: function () {
      return originalReturnValueDesc && originalReturnValueDesc.get ? originalReturnValueDesc.get.call(this) : true;
    },
    set: function (val) {
      if (this.type === 'paste') return;
      if (originalReturnValueDesc && originalReturnValueDesc.set) {
        originalReturnValueDesc.set.call(this, val);
      }
    },
    configurable: true
  });

  // LAYER 3: Target Resolution & Framework-Aware Insertion
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

  // Force-Insert text into inputs, textareas, React/Vue controlled components, or contenteditables
  function forceInsertText(rawTarget, text) {
    if (!text || !rawTarget) return;

    const target = findEditableTarget(rawTarget);
    if (!target) return;

    // Handle ContentEditable (Notion, Google Docs, Discord, rich text editors)
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
        let start = 0;
        let end = 0;
        try {
          start = typeof target.selectionStart === 'number' ? target.selectionStart : (target.value || '').length;
          end = typeof target.selectionEnd === 'number' ? target.selectionEnd : (target.value || '').length;
        } catch (selErr) {
          // Some input types (e.g. email, number) throw on selectionStart
          start = (target.value || '').length;
          end = (target.value || '').length;
        }

        const val = target.value || '';
        const newVal = val.slice(0, start) + text + val.slice(end);

        // Native property setter bypasses React / Vue synthetic event interference
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

  // LAYER 4: Force-Copy & Copy Protection
  function handleForceCopy(e) {
    const selection = window.getSelection();
    let text = selection ? selection.toString() : '';

    if (!text && document.activeElement) {
      const active = document.activeElement;
      if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
        try {
          const start = active.selectionStart;
          const end = active.selectionEnd;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            text = (active.value || '').slice(start, end);
          }
        } catch (e) {}
      }
    }

    if (text && e.clipboardData) {
      try {
        e.clipboardData.setData('text/plain', text);
      } catch (err) {}
    }
  }

  // LAYER 5: Active Paste Watchdog / Fallback
  // 1. We allow the browser's native paste to fire (preventDefault is neutralized).
  // 2. If an aggressive website script stopped propagation or cleared the field,
  //    our watchdog checks after 0ms and force-inserts the clipboard text.
  function handlePasteWatchdog(e) {
    const target = getActiveOrTargetElement(e);
    if (!target) return;

    if (target.hasAttribute && target.hasAttribute('onpaste')) {
      target.removeAttribute('onpaste');
    }

    const initialVal = target.value;
    let clipText = '';
    if (e.clipboardData) {
      clipText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';
    }

    if (clipText) {
      setTimeout(function () {
        // If native paste was blocked or didn't update value, force insert
        if (target.value !== undefined && target.value === initialVal) {
          forceInsertText(target, clipText);
        }
      }, 0);
    }
  }

  function handleGenericAllow(e) {
    e.stopPropagation();
  }

  window.addEventListener('copy', handleForceCopy, true);
  document.addEventListener('copy', handleForceCopy, true);
  window.addEventListener('paste', handlePasteWatchdog, true);
  document.addEventListener('paste', handlePasteWatchdog, true);
  window.addEventListener('selectstart', handleGenericAllow, true);
  document.addEventListener('selectstart', handleGenericAllow, true);
  window.addEventListener('contextmenu', handleGenericAllow, true);
  document.addEventListener('contextmenu', handleGenericAllow, true);

  // LAYER 6: Strip anti-clipboard attributes from DOM and dynamic nodes
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

  // LAYER 7: Neutralize property setters on DOM prototypes
  const blockedClipboardProps = ['onselectstart', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'ondragstart'];
  blockedClipboardProps.forEach(function (prop) {
    try {
      Object.defineProperty(Document.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLInputElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
      Object.defineProperty(HTMLTextAreaElement.prototype, prop, { set: () => {}, get: () => null, configurable: true });
    } catch (e) {}
  });

  console.log('[DRDOOM] Active: True native fullscreen interception, window keys, tab/app switch protection, text selection, and Universal Paste Engine enabled.');
})();
