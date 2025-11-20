const AI_DOMAINS = [
  "openai.com",
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "perplexity.ai",
  "copilot.microsoft.com"
];
function getDayKey(date) {
  return date.toISOString().slice(0, 10);
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

  chrome.storage.local.get(["dailyUsage"], data => {
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

    chrome.storage.local.set({ dailyUsage });
  });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
chrome.runtime.onInstalled.addListener(() => {
});
chrome.runtime.onStartup.addListener(() => {
});
