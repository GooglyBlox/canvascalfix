chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    { canvasUrls: [], selectedCourses: [] },
    (data) => {}
  );
});

function isCanvasCalendar(url, canvasHosts) {
  if (!url.includes("/calendar")) return false;

  if (canvasHosts.length === 0) {
    return url.includes(".instructure.com") || url.includes(".canvas.edu");
  }
  return canvasHosts.some((u) => {
    try {
      return url.includes(new URL(u).hostname);
    } catch {
      return false;
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete" || !tab.url?.includes("/calendar")) return;
  chrome.tabs.sendMessage(
    tabId,
    { action: "applySavedCourses" },
    () => void chrome.runtime.lastError
  );
});
