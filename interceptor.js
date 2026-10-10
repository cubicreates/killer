// DRDOOM - Silent Browser Enhancement & Research Suite
// Runs at document_start in the MAIN world.
// Intercepts Fullscreen API (true native fullscreen + stealth escape spoofing),
// shields window keys, protects against tab/app switch detection (Alt+Tab),
// enables universal text selection (FanFiction.Net), and disarms all anti-paste mechanisms.

(function () {
  'use strict';

  // ==========================================
  // NATIVE CAMOUFLAGE & CLOAK ENGINE
  // ==========================================
  const cloakedRegistry = new WeakMap();
  const originalToString = Function.prototype.toString;

  function cloakFunction(fn, name, length = 0) {
    if (!fn) return fn;
    try {
      Object.defineProperties(fn, {
        name: { value: name, configurable: true, writable: false, enumerable: false },
        length: { value: length, configurable: true, writable: false, enumerable: false }
      });
    } catch (e) {}
    cloakedRegistry.set(fn, name);
    return fn;
  }

  // Idempotency check
  if (cloakedRegistry.has(document.hasFocus)) {
    return;
  }

  const cloakedToString = function toString() {
    if (this === cloakedToString) {
      return 'function toString() { [native code] }';
    }
    if (cloakedRegistry.has(this)) {
      const fnName = cloakedRegistry.get(this);
      return `function ${fnName}() { [native code] }`;
    }
    return originalToString.apply(this, arguments);
  };
  cloakFunction(cloakedToString, 'toString', 0);
  try {
    Object.defineProperty(Function.prototype, 'toString', {
      value: cloakedToString,
      writable: true,
      configurable: true,
      enumerable: false
    });
  } catch (e) {
    Function.prototype.toString = cloakedToString;
  }

  function defineCloakedProperty(target, prop, getter, setter) {
    const getterCloaked = getter ? cloakFunction(getter, `get ${prop}`, 0) : undefined;
    const setterCloaked = setter ? cloakFunction(setter, `set ${prop}`, 1) : undefined;
    try {
      Object.defineProperty(target, prop, {
        get: getterCloaked,
        set: setterCloaked,
        configurable: true,
        enumerable: true
      });
    } catch (e) {}
  }

  let currentFullscreenElement = null;
  let lastCopiedText = '';
  let isTypingSimulationActive = false;
  let activeTypingSessionId = 0;
  const originalPreventDefault = Event.prototype.preventDefault;

  // ==========================================
  // SILENT BRIDGE (MAIN WORLD -> ISOLATED BRIDGE)
  // Non-bubbling CustomEvent on document captured in capture phase
  // Zero window.postMessage broadcasts to ensure zero leak
  // ==========================================
  const SYNC_EVENT = '__cx_sync_cmd__';

  function sendBridgeAction(action) {
    if (!action) return;
    try {
      const evt = new CustomEvent(SYNC_EVENT, {
        detail: { action: action },
        bubbles: false,
        cancelable: true
      });
      document.dispatchEvent(evt);
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

  const mockRequestFullscreen = cloakFunction(function requestFullscreen() {
    currentFullscreenElement = this;

    // Trigger REAL native browser fullscreen on the Chrome window
    sendBridgeAction('FULLSCREEN');

    // Dispatch fullscreenchange so website believes it is in true fullscreen
    queueMicrotask(function () {
      dispatchFullscreenEvents();
    });
    return Promise.resolve();
  }, 'requestFullscreen', 0);

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

  const mockExitFullscreen = cloakFunction(function exitFullscreen() {
    currentFullscreenElement = null;
    sendBridgeAction('RESTORE');
    queueMicrotask(function () {
      dispatchFullscreenEvents();
    });
    return Promise.resolve();
  }, 'exitFullscreen', 0);

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
    defineCloakedProperty(Document.prototype, prop, fsPropertyDefinitions[prop]);
    defineCloakedProperty(document, prop, fsPropertyDefinitions[prop]);
  });

  // Viewport / Screen dimension spoofing (blinds sites checking innerHeight === screen.height)
  try {
    const origInnerW = Object.getOwnPropertyDescriptor(window, 'innerWidth') || { get: () => window.innerWidth };
    const origInnerH = Object.getOwnPropertyDescriptor(window, 'innerHeight') || { get: () => window.innerHeight };

    defineCloakedProperty(window, 'innerWidth', function () {
      if (currentFullscreenElement !== null && window.screen) {
        return window.screen.width;
      }
      return origInnerW.get ? origInnerW.get.call(window) : window.outerWidth;
    });

    defineCloakedProperty(window, 'innerHeight', function () {
      if (currentFullscreenElement !== null && window.screen) {
        return window.screen.height;
      }
      return origInnerH.get ? origInnerH.get.call(window) : window.outerHeight;
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
      isTypingSimulationActive = false;
      activeTypingSessionId++;
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
      return;
    }

    // Ctrl+C / Cmd+C: Instant capture of selected text into DRDOOM cache
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && e.type === 'keydown') {
      const sel = window.getSelection();
      let text = sel ? sel.toString() : '';
      if (!text && document.activeElement) {
        const active = document.activeElement;
        if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
          try {
            const start = active.selectionStart;
            const end = active.selectionEnd;
            if (typeof start === 'number' && typeof end === 'number' && start !== end) {
              text = (active.value || '').slice(start, end);
            }
          } catch (err) {}
        }
      }
      if (text) {
        lastCopiedText = text;
      }
    }

    // Ctrl+V / Cmd+V: Trigger Ghost Human Typer on standard paste!
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && e.type === 'keydown') {
      e.stopImmediatePropagation();
      originalPreventDefault.call(e); // Crucial: Cancel browser's native paste action so zero-delay burst paste does NOT occur!

      const target = getActiveOrTargetElement(e);
      if (!target) return;

      if (lastCopiedText) {
        simulateHumanTyping(target, lastCopiedText);
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (clip) {
          if (clip) {
            lastCopiedText = clip;
            simulateHumanTyping(target, clip);
          }
        }).catch(function () {});
      }
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
    defineCloakedProperty(Document.prototype, 'visibilityState', () => 'visible');
    defineCloakedProperty(document, 'visibilityState', () => 'visible');
    defineCloakedProperty(Document.prototype, 'hidden', () => false);
    defineCloakedProperty(document, 'hidden', () => false);

    const mockHasFocus = cloakFunction(function hasFocus() { return true; }, 'hasFocus', 0);
    Document.prototype.hasFocus = mockHasFocus;
    document.hasFocus = mockHasFocus;
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
      defineCloakedProperty(window, prop, () => null, () => {});
      defineCloakedProperty(document, prop, () => null, () => {});
      defineCloakedProperty(Document.prototype, prop, () => null, () => {});
      defineCloakedProperty(HTMLElement.prototype, prop, () => null, () => {});
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
    try {
      if (typeof CSSStyleSheet !== 'undefined' && document.adoptedStyleSheets) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('*, *::before, *::after, html, body, div, span, p, a, article, section, main, #storytext, .storytext { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; }');
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
    } catch (e) {}
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
  // This prevents websites from blocking paste events when right-click pasting
  const mockPreventDefault = cloakFunction(function preventDefault() {
    if (this.type === 'paste') {
      // Disarm website anti-paste script trying to prevent paste!
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  }, 'preventDefault', 0);
  Event.prototype.preventDefault = mockPreventDefault;

  // LAYER 2: Neutralize Event.prototype.returnValue
  const originalReturnValueDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'returnValue');
  defineCloakedProperty(
    Event.prototype,
    'returnValue',
    function () {
      return originalReturnValueDesc && originalReturnValueDesc.get ? originalReturnValueDesc.get.call(this) : true;
    },
    function (val) {
      if (this.type === 'paste') return;
      if (originalReturnValueDesc && originalReturnValueDesc.set) {
        originalReturnValueDesc.set.call(this, val);
      }
    }
  );

  // LAYER 2.5: Spoof InputEvent.prototype.inputType
  // Websites that check if (e.inputType === 'insertFromPaste') are tricked into seeing 'insertText' (manual typing)!
  try {
    const origInputTypeDesc = Object.getOwnPropertyDescriptor(InputEvent.prototype, 'inputType');
    if (origInputTypeDesc && origInputTypeDesc.get) {
      defineCloakedProperty(InputEvent.prototype, 'inputType', function () {
        const val = origInputTypeDesc.get.call(this);
        if (val === 'insertFromPaste') {
          return 'insertText'; // Spoof: Always report as manual typing!
        }
        return val;
      });
    }
  } catch (e) {}

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

  // LAYER 4: Ghost Human Typer (Dual-Engine: Instant Frontend + Authentic Keystroke Stream)
  // 1. FRONTEND: Value is placed into the field immediately (instant copy-paste feel for the user).
  // 2. BACKEND: Keystrokes stream in background (keydown -> beforeinput -> input -> keyup)
  //    so website telemetry, keyloggers, and anti-paste detectors record authentic manual typing!
  function simulateHumanTyping(rawTarget, text) {
    if (!text || !rawTarget) return;

    const target = findEditableTarget(rawTarget);
    if (!target) return;

    const currentSession = ++activeTypingSessionId;
    isTypingSimulationActive = true;

    // 1. Prime the first character's keydown (ensures keydown count > 0 before any input event)
    const firstChar = text[0] || ' ';
    const firstCharCode = firstChar.charCodeAt(0);
    const primeDownEvt = new KeyboardEvent('keydown', {
      key: firstChar,
      code: `Key${firstChar.toUpperCase()}`,
      charCode: firstCharCode,
      keyCode: firstCharCode,
      which: firstCharCode,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(primeDownEvt);

    // 2. FRONTEND: Insert the full text into the field immediately!
    // The user sees their pasted content instantly without waiting!
    forceInsertText(target, text);

    // 3. Dispatch prime character keyup
    const primeUpEvt = new KeyboardEvent('keyup', {
      key: firstChar,
      code: `Key${firstChar.toUpperCase()}`,
      charCode: firstCharCode,
      keyCode: firstCharCode,
      which: firstCharCode,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(primeUpEvt);

    // 4. BACKEND: Stream authentic keystrokes in the background ("happening happening happening")
    let index = 1;
    let minDelay = 2;
    let maxDelay = 6;
    if (text.length > 500) {
      minDelay = 0;
      maxDelay = 2;
    }

    function step() {
      if (activeTypingSessionId !== currentSession || !isTypingSimulationActive || index >= text.length) {
        if (activeTypingSessionId === currentSession) {
          isTypingSimulationActive = false;
        }
        return;
      }

      const char = text[index++];
      const charCode = char.charCodeAt(0);

      // (a) Dispatch keydown event
      const downEvt = new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        charCode: charCode,
        keyCode: charCode,
        which: charCode,
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(downEvt);

      // (b) Dispatch beforeinput event
      try {
        const beforeEvt = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: char,
          bubbles: true,
          cancelable: true
        });
        target.dispatchEvent(beforeEvt);
      } catch (e) {}

      // (c) Dispatch input event
      try {
        const inEvt = new InputEvent('input', {
          inputType: 'insertText',
          data: char,
          bubbles: true,
          cancelable: false
        });
        target.dispatchEvent(inEvt);
      } catch (e) {
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // (d) Dispatch keyup event
      const upEvt = new KeyboardEvent('keyup', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        charCode: charCode,
        keyCode: charCode,
        which: charCode,
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(upEvt);

      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      setTimeout(step, delay);
    }

    if (text.length > 1) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      setTimeout(step, delay);
    } else {
      isTypingSimulationActive = false;
    }
  }

  // LAYER 5: Force-Copy & Copy Protection
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

    if (text) {
      lastCopiedText = text; // Cache for synchronous Ghost Human Typer
      if (e.clipboardData) {
        try {
          e.clipboardData.setData('text/plain', text);
        } catch (err) {}
      }
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

  // Pre-sync OS clipboard on window focus so Ctrl+V has zero-latency cache
  window.addEventListener('focus', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (clip) {
        if (clip) {
          lastCopiedText = clip;
        }
      }).catch(function () {});
    }
  }, true);

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
      defineCloakedProperty(Document.prototype, prop, () => null, () => {});
      defineCloakedProperty(HTMLElement.prototype, prop, () => null, () => {});
      defineCloakedProperty(HTMLInputElement.prototype, prop, () => null, () => {});
      defineCloakedProperty(HTMLTextAreaElement.prototype, prop, () => null, () => {});
    } catch (e) {}
  });
})();
