const api = typeof chrome !== "undefined" ? chrome : browser;

function getDayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function normaliseHostname(hostname) {
  if (!hostname) return null;
  return hostname.toLowerCase();
}

function recordPrompt(hostname, charCount) {
  const domain = normaliseHostname(hostname);
  if (!domain) return;

  const today = new Date();
  const dayKey = getDayKey(today);

  api.storage.local.get(["dailyUsage"], data => {
    const dailyUsage = data.dailyUsage || {};
    const dayData = dailyUsage[dayKey] || {
      prompts: 0,
      chars: 0,
      byDomain: {}
    };

    dayData.prompts += 1;
    dayData.chars += charCount || 0;

    const byDomain = dayData.byDomain || {};
    byDomain[domain] = (byDomain[domain] || 0) + 1;
    dayData.byDomain = byDomain;

    dailyUsage[dayKey] = dayData;

    api.storage.local.set({ dailyUsage });
  });
}
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "prompt_sent") {
    return;
  }

  let hostname = message.hostname;
  if (!hostname && sender && sender.tab && sender.tab.url) {
    try {
      hostname = new URL(sender.tab.url).hostname;
    } catch (e) {
      hostname = null;
    }
  }

  const charCount = typeof message.charCount === "number" ? message.charCount : 0;

  recordPrompt(hostname, charCount);

  if (sendResponse) {
    sendResponse({ ok: true });
  }
});

api.runtime.onInstalled.addListener(() => {
});

api.runtime.onStartup.addListener(() => {
});
