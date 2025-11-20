let lastPromptTime = 0;
const PROMPT_DEBOUNCE_MS = 1000;

function nowMs() {
  return Date.now();
}

function isTextInput(element) {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const type = (element.type || "").toLowerCase();
    return type === "text" || type === "search" || type === "email" || type === "url";
  }
  return false;
}

function getCurrentTextValue(target) {
  try {
    if (isTextInput(target)) {
      return target.value || "";
    }
    const ta = document.querySelector("textarea");
    if (ta && ta.value) {
      return ta.value;
    }
  } catch (e) {}
  return "";
}

function sendPromptEvent(source) {
  const now = nowMs();
  if (now - lastPromptTime < PROMPT_DEBOUNCE_MS) {
    return;
  }
  lastPromptTime = now;

  const text = getCurrentTextValue(document.activeElement);
  const charCount = text.length;

  const hostname = window.location.hostname;

  chrome.runtime.sendMessage({
    type: "prompt_sent",
    hostname,
    charCount,
    source
  });
}
document.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  if (!isTextInput(event.target)) {
    return;
  }

  sendPromptEvent("enter_key");
});
document.addEventListener("click", function (event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  let el = target;
  while (el && el !== document.body) {
    if (el.tagName === "BUTTON") {
      const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
      const text = (el.textContent || "").toLowerCase();

      if (ariaLabel.includes("send") || text.includes("send")) {
        sendPromptEvent("send_button");
        return;
      }
    }
    el = el.parentElement;
  }
});
