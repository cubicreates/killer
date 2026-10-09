// Silent Fullscreen & Window State Interceptor
// Runs at document_start in the MAIN world to intercept Fullscreen API calls,
// window management keystrokes (F11, Escape, function keys), and maximization/minimization tracking.

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

  // 4. Keyboard Protection (Not hardcoded to F11 - handles all window management / function keys)
  // Stops webpage scripts from intercepting F1-F12, Escape, Alt+Enter, or window resizing keys.
  const protectedKeys = new Set([
    'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ]);

  function handleKeyShield(e) {
    const isProtectedKey = protectedKeys.has(e.key) ||
      (typeof e.key === 'string' && e.key.startsWith('F') && !isNaN(e.key.slice(1)));
    const isWindowCombo = (e.altKey && (e.key === 'Enter' || e.key === 'F11')) ||
      (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown'));

    if (isProtectedKey || isWindowCombo) {
      // Stops the page's event listeners from ever receiving this key event
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('keydown', handleKeyShield, true);
  window.addEventListener('keyup', handleKeyShield, true);
  window.addEventListener('keypress', handleKeyShield, true);
  document.addEventListener('keydown', handleKeyShield, true);
  document.addEventListener('keyup', handleKeyShield, true);

  // 5. Visibility & Focus Shield (Protects against minimization / window blur detection)
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

  // Suppress visibilitychange and blur events from reaching the website when minimized/switched
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
      // If the website expects fullscreen, prevent resize from leaking an exit or re-layout alert
      e.stopImmediatePropagation();
    }
  }, true);

  console.log('[SilentFullscreen] Active: Fullscreen, key shield, and window state protection enabled.');
})();
