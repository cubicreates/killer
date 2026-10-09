// Silent Fullscreen, Window State & Text Selection Interceptor
// Runs at document_start in the MAIN world.
// Intercepts Fullscreen API calls, window management keys, maximization/minimization tracking,
// and re-enables text selection, copying, and context menus on protected sites like FanFiction.Net.

(function () {
  'use strict';

  if (window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__) {
    return;
  }
  window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__ = true;

  let currentFullscreenElement = null;

  // 1. Fullscreen Event Dispatcher
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

  // 2. Mock requestFullscreen & exitFullscreen
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

  // 3. Define property getters for Fullscreen on Document
  const propertyDefinitions = {
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

  Object.keys(propertyDefinitions).forEach(function (prop) {
    const descriptor = {
      get: propertyDefinitions[prop],
      configurable: true,
      enumerable: true
    };
    try { Object.defineProperty(Document.prototype, prop, descriptor); } catch (e) {}
    try { Object.defineProperty(document, prop, descriptor); } catch (e) {}
  });

  // 4. Keyboard Protection (Generic - handles F1-F12, Escape, window resize/management shortcuts)
  const protectedKeys = new Set([
    'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ]);

  function handleKeyShield(e) {
    const isProtectedKey = protectedKeys.has(e.key) ||
      (typeof e.key === 'string' && e.key.startsWith('F') && !isNaN(e.key.slice(1)));
    const isWindowCombo = (e.altKey && (e.key === 'Enter' || e.key === 'F11')) ||
      (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown'));

    if (isProtectedKey || isWindowCombo) {
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('keydown', handleKeyShield, true);
  window.addEventListener('keyup', handleKeyShield, true);
  window.addEventListener('keypress', handleKeyShield, true);
  document.addEventListener('keydown', handleKeyShield, true);
  document.addEventListener('keyup', handleKeyShield, true);

  // 5. Visibility & Focus Shield (Protects against minimization / window blur tracking)
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

  function handleVisibilityShield(e) {
    e.stopImmediatePropagation();
  }

  window.addEventListener('visibilitychange', handleVisibilityShield, true);
  document.addEventListener('visibilitychange', handleVisibilityShield, true);
  window.addEventListener('blur', handleVisibilityShield, true);
  window.addEventListener('focusout', handleVisibilityShield, true);

  // 6. Resize Shield (Suppresses maximization / minimization detection via resize)
  window.addEventListener('resize', function (e) {
    if (currentFullscreenElement !== null) {
      e.stopImmediatePropagation();
    }
  }, true);

  // 7. Universal Text Selection & Copy Enabler (FanFiction.Net & protected sites)
  function applyTextSelectionStyles() {
    const styleId = '__silent_text_selection_enabler__';
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

  // Apply immediately or as soon as DOM exists
  if (document.documentElement) {
    applyTextSelectionStyles();
  } else {
    document.addEventListener('readystatechange', applyTextSelectionStyles);
  }
  document.addEventListener('DOMContentLoaded', applyTextSelectionStyles);

  // Stop events used to cancel selection, copying, and right-click
  const selectionBlockingEvents = ['selectstart', 'copy', 'contextmenu', 'dragstart'];

  function stopCancelSelection(e) {
    // Stop webpage listeners from canceling user selection or context menus
    e.stopPropagation();
  }

  selectionBlockingEvents.forEach(function (eventType) {
    window.addEventListener(eventType, stopCancelSelection, true);
    document.addEventListener(eventType, stopCancelSelection, true);
  });

  // Neutralize attempts to assign onselectstart / oncontextmenu / oncopy handlers
  try {
    Object.defineProperty(Document.prototype, 'onselectstart', {
      set: function () {},
      get: function () { return null; },
      configurable: true
    });
    Object.defineProperty(HTMLElement.prototype, 'onselectstart', {
      set: function () {},
      get: function () { return null; },
      configurable: true
    });
    Object.defineProperty(Document.prototype, 'oncontextmenu', {
      set: function () {},
      get: function () { return null; },
      configurable: true
    });
    Object.defineProperty(HTMLElement.prototype, 'oncontextmenu', {
      set: function () {},
      get: function () { return null; },
      configurable: true
    });
  } catch (e) {}

  console.log('[SilentFullscreen] Active: Fullscreen, key shield, window protection, and universal text selection enabled.');
})();
