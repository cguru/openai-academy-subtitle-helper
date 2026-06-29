import { tryAutoLoadCachedSubtitle } from "./auto-load.js";

const HOST_NAME = "io.github.openai_academy_subtitle_helper";
const videoFramesByTab = new Map();
let nativePort = null;
const pendingNativeResponses = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === "video-frame-registry" && sender.tab?.id !== undefined) {
    const frame = {
      tabId: sender.tab.id,
      frameId: sender.frameId,
      videoId: message.videoId,
      updatedAt: Date.now(),
    };
    videoFramesByTab.set(sender.tab.id, frame);
    sendResponse({ ok: true });
    queueAutoLoadCachedSubtitle(frame);
    return true;
  }

  if (message?.target === "content-frame") {
    sendToActiveVideoFrame(message.payload).then(sendResponse);
    return true;
  }

  if (message?.target !== "native-host") {
    return false;
  }

  sendNativeHostMessage(message.payload).then(sendResponse);
  return true;
});

function sendNativeHostMessage(payload) {
  return new Promise((resolve) => {
    let queued = false;
    try {
      const port = getNativePort();
      pendingNativeResponses.push(resolve);
      queued = true;
      port.postMessage(payload);
    } catch (error) {
      if (queued) {
        pendingNativeResponses.pop();
      }
      resolve({ type: "error", message: error.message });
    }
  });
}

function getNativePort() {
  if (nativePort) {
    return nativePort;
  }

  nativePort = chrome.runtime.connectNative(HOST_NAME);
  nativePort.onMessage.addListener((response) => {
    const resolve = pendingNativeResponses.shift();
    resolve?.(response);
  });
  nativePort.onDisconnect.addListener(() => {
    const message = chrome.runtime.lastError?.message ?? "Native host disconnected.";
    while (pendingNativeResponses.length > 0) {
      const resolve = pendingNativeResponses.shift();
      resolve({ type: "error", message });
    }
    nativePort = null;
  });

  return nativePort;
}

function queueAutoLoadCachedSubtitle(frame) {
  tryAutoLoadCachedSubtitle({
    frame,
    storage: chrome.storage.local,
    getSubtitle: sendNativeHostMessage,
    sendFrameMessage,
  }).catch(() => {
    // Auto-load is best effort; popup actions still show explicit errors.
  });
}

async function sendToActiveVideoFrame(payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, message: "No active tab." };
  }

  const frame = videoFramesByTab.get(tab.id);
  if (!frame) {
    return { ok: false, message: "No registered Academy video frame. Reload the page and try again." };
  }

  try {
    return await sendFrameMessage(frame, payload);
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function sendFrameMessage(frame, payload) {
  return await chrome.tabs.sendMessage(frame.tabId, payload, { frameId: frame.frameId });
}
