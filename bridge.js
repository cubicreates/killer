// DRDOOM Bridge - Runs at document_start in the ISOLATED world.
// Forwards actions from MAIN world page context to Chrome Background Service Worker.

(function () {
  'use strict';

  function forwardAction(action) {
    if (!action) return;
    try {
      chrome.runtime.sendMessage({ action: action }, function () {
        if (chrome.runtime.lastError) {
          // Worker sleeping or reloading; safe to ignore
        }
      });
    } catch (e) {}
  }

  // 1. PostMessage bridge (HTML structured clone - seamlessly traverses V8 isolated contexts)
  window.addEventListener('message', function (e) {
    if (!e || !e.data || e.data.source !== '__DRDOOM__' || !e.data.action) return;
    forwardAction(e.data.action);
  }, false);

  // 2. CustomEvent bridge (fallback)
  window.addEventListener('__DRDOOM_BRIDGE_EVENT__', function (e) {
    if (!e || !e.detail || !e.detail.action) return;
    forwardAction(e.detail.action);
  }, false);
})();
