// DRDOOM Background Service Worker (Manifest V3)
// Handles native window manipulation (True Fullscreen, Maximization, Normal Restore, Minimization)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DRDOOM] Background Service Worker ready.');
});

function updateWindowState(sender, targetState, sendResponse) {
  const applyState = (winId) => {
    if (typeof winId === 'number' && winId > 0) {
      chrome.windows.update(winId, { state: targetState }, (win) => {
        if (chrome.runtime.lastError) {
          console.warn('[DRDOOM] Windows update error:', chrome.runtime.lastError.message);
        }
        if (sendResponse) {
          sendResponse({ success: true, state: win ? win.state : targetState });
        }
      });
    } else {
      chrome.windows.getLastFocused({ populate: false }, (win) => {
        if (win && typeof win.id === 'number') {
          chrome.windows.update(win.id, { state: targetState }, (w) => {
            if (sendResponse) {
              sendResponse({ success: true, state: w ? w.state : targetState });
            }
          });
        } else {
          chrome.windows.getAll({ populate: false }, (wins) => {
            if (wins && wins.length > 0) {
              chrome.windows.update(wins[0].id, { state: targetState }, (w) => {
                if (sendResponse) {
                  sendResponse({ success: true, state: w ? w.state : targetState });
                }
              });
            }
          });
        }
      });
    }
  };

  if (sender && sender.tab && typeof sender.tab.windowId === 'number') {
    applyState(sender.tab.windowId);
  } else {
    chrome.windows.getLastFocused({ populate: false }, (win) => {
      applyState(win ? win.id : null);
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return false;

  if (msg.action === 'FULLSCREEN') {
    updateWindowState(sender, 'fullscreen', sendResponse);
    return true;
  }

  if (msg.action === 'MAXIMIZE') {
    updateWindowState(sender, 'maximized', sendResponse);
    return true;
  }

  if (msg.action === 'RESTORE') {
    updateWindowState(sender, 'normal', sendResponse);
    return true;
  }

  if (msg.action === 'MINIMIZE') {
    updateWindowState(sender, 'minimized', sendResponse);
    return true;
  }

  return false;
});
