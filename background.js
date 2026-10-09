// DRDOOM Background Service Worker (Manifest V3)
// Handles native window state manipulation (Maximization, Restore, Minimization)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DRDOOM] Service worker initialized.');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return false;

  const targetWindowId = (sender.tab && sender.tab.windowId)
    ? sender.tab.windowId
    : chrome.windows.WINDOW_ID_CURRENT;

  if (msg.action === 'MAXIMIZE') {
    chrome.windows.update(targetWindowId, { state: 'maximized' }, (win) => {
      sendResponse({ success: true, state: win ? win.state : 'maximized' });
    });
    return true; // Asynchronous response
  }

  if (msg.action === 'RESTORE') {
    chrome.windows.update(targetWindowId, { state: 'normal' }, (win) => {
      sendResponse({ success: true, state: win ? win.state : 'normal' });
    });
    return true;
  }

  if (msg.action === 'MINIMIZE') {
    chrome.windows.update(targetWindowId, { state: 'minimized' }, (win) => {
      sendResponse({ success: true, state: win ? win.state : 'minimized' });
    });
    return true;
  }

  return false;
});
