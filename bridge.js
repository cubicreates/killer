// DRDOOM Bridge - Runs at document_start in the ISOLATED world.
// Bridges MAIN world DOM events to Chrome Background Service Worker.

(function () {
  'use strict';

  window.addEventListener('__DRDOOM_BRIDGE_EVENT__', function (e) {
    if (!e || !e.detail || !e.detail.action) return;

    try {
      chrome.runtime.sendMessage({ action: e.detail.action }, function () {
        if (chrome.runtime.lastError) {
          // Service worker might be sleeping; safe to ignore
        }
      });
    } catch (err) {}
  }, false);
})();
