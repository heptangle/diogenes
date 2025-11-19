// List of domains
const AI_DOMAINS = [
  "openai.com",
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "perplexity.ai",
  "copilot.microsoft.com"
];

// Session state
let currentSession = {
  tabId: null,
  domain: null,
  startTime: null,
  windowFocused: true
};

function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (e) {
    return null;
  }
}

function isAiDomain(domain) {
  if (!domain) return false;
  return AI_DOMAINS.some(d => domain === d || domain.endsWith("." + d));
}

function resetSession() {
  currentSession.tabId = null;
  currentSession.domain = null;
  currentSession.startTime = null;
}

function recordDuration(seconds, dayKey) {
  if (seconds <= 0) return;
  chrome.storage.local.get(["dailyUsage"], data => {
    const dailyUsage = data.dailyUsage || {};
    const dayData = dailyUsage[dayKey] || { seconds: 0 };

    dayData.seconds += seconds;
    dailyUsage[dayKey] = dayData;

    chrome.storage.local.set({ dailyUsage });
  });
}

function endSession() {
  if (!currentSession.startTime || !currentSession.domain) {
    resetSession();
    return;
  }

  const now = Date.now();
  const durationMs = now - currentSession.startTime;

  // Guard against absurd gaps such as the machine sleeping all night
  const maxSessionMs = 60 * 60 * 1000;

  if (durationMs > 0 && durationMs <= maxSessionMs) {
    const seconds = Math.round(durationMs / 1000);
    const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    recordDuration(seconds, dayKey);
  }

  resetSession();
}

function startSession(tabId, url) {
  if (!currentSession.windowFocused) {
    resetSession();
    return;
  }

  const domain = getDomainFromUrl(url);
  if (!isAiDomain(domain)) {
    resetSession();
    return;
  }

  currentSession.tabId = tabId;
  currentSession.domain = domain;
  currentSession.startTime = Date.now();
}

// When the active tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  endSession();

  chrome.tabs.get(activeInfo.tabId, tab => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      resetSession();
      return;
    }
    startSession(tab.id, tab.url);
  });
});

// When a tab finishes loading or navigates to a new URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active || !tab.url || changeInfo.status !== "complete") {
    return;
  }

  endSession();
  startSession(tabId, tab.url);
});

chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    currentSession.windowFocused = false;
    endSession();
  } else {
    currentSession.windowFocused = true;

    chrome.tabs.query({ active: true, windowId }, tabs => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) {
        resetSession();
        return;
      }
      endSession();
      startSession(tab.id, tab.url);
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  resetSession();
});

chrome.runtime.onInstalled.addListener(() => {
  resetSession();
});
