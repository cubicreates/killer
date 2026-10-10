// DRDOOM Bridge - Runs at document_start in the ISOLATED world.
// Forwards actions from MAIN world page context to Chrome Background Service Worker via a silent channel.

(function () {
  'use strict';

  const SYNC_EVENT = '__cx_sync_cmd__';

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

  // Silent non-bubbling CustomEvent listener in capture phase
  document.addEventListener(SYNC_EVENT, function (e) {
    if (!e || !e.detail || !e.detail.action) return;
    try {
      e.stopImmediatePropagation();
    } catch (err) {}
    forwardAction(e.detail.action);
  }, true);
})();
