// Silent Fullscreen Interceptor
// Runs at document_start in the MAIN world to intercept Fullscreen API calls before page scripts execute.

(function () {
  'use strict';

  if (window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__) {
    return;
  }
  window.__SILENT_FULLSCREEN_INTERCEPTOR_LOADED__ = true;

  let currentFullscreenElement = null;

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

        // Also trigger onfullscreenchange property if assigned directly
        const onHandlerName = 'on' + name.toLowerCase();
        if (typeof document[onHandlerName] === 'function') {
          try {
            document[onHandlerName](evt);
          } catch (e) {
            console.error('[SilentFullscreen] Error in onhandler:', e);
          }
        }
      } catch (e) {
        // Fallback for older environments
        try {
          const evt = document.createEvent('Event');
          evt.initEvent(name, true, false);
          document.dispatchEvent(evt);
        } catch (err) {}
      }
    });
  }

  // 1. Mock requestFullscreen on Element prototype
  function mockRequestFullscreen() {
    currentFullscreenElement = this;

    // Asynchronously dispatch change event to mirror native browser microtask behavior
    queueMicrotask(function () {
      dispatchFullscreenEvents();
    });

    return Promise.resolve();
  }

  // Patch all standard and vendor-prefixed methods
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

  // 2. Mock exitFullscreen on Document prototype
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

  // 3. Define property getters on Document.prototype and document
  const propertyDefinitions = {
    fullscreenElement: function () {
      return currentFullscreenElement;
    },
    webkitFullscreenElement: function () {
      return currentFullscreenElement;
    },
    mozFullScreenElement: function () {
      return currentFullscreenElement;
    },
    msFullscreenElement: function () {
      return currentFullscreenElement;
    },
    fullscreenEnabled: function () {
      return true;
    },
    webkitFullscreenEnabled: function () {
      return true;
    },
    mozFullScreenEnabled: function () {
      return true;
    },
    msFullscreenEnabled: function () {
      return true;
    },
    fullscreen: function () {
      return currentFullscreenElement !== null;
    },
    webkitIsFullScreen: function () {
      return currentFullscreenElement !== null;
    }
  };

  Object.keys(propertyDefinitions).forEach(function (prop) {
    const getter = propertyDefinitions[prop];
    const descriptor = {
      get: getter,
      configurable: true,
      enumerable: true
    };

    try {
      Object.defineProperty(Document.prototype, prop, descriptor);
    } catch (e) {}

    try {
      Object.defineProperty(document, prop, descriptor);
    } catch (e) {}
  });

  console.log('[SilentFullscreen] Extension active: Fullscreen API intercepted.');
})();
