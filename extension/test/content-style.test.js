import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentScript = readFileSync(join(__dirname, "../src/content-script.js"), "utf8");

test("content script subtitle overlay supports default and live subtitle style updates", () => {
  assert.match(contentScript, /bottomOffsetPx:\s*96/);
  assert.match(contentScript, /type === "updateSubtitleStyle"/);
  assert.match(contentScript, /bottom:\s*`\$\{subtitleStyle\.bottomOffsetPx\}px`/);
  assert.match(contentScript, /fontSize:\s*`\$\{subtitleStyle\.fontSizePx\}px`/);
  assert.match(contentScript, /width:\s*"94%"/);
  assert.match(contentScript, /maxWidth:\s*"94%"/);
  assert.match(contentScript, /wordBreak:\s*"keep-all"/);
});

test("content script moves styled subtitle overlay into fullscreen containers", () => {
  const { context, document, video, videoParent, fullscreenHost, messageListeners } =
    createContentScriptHarness();
  vm.runInNewContext(contentScript, context);

  const showResponse = sendContentMessage(messageListeners, {
    type: "showSubtitles",
    cues: [{ start: 0, end: 10, text: "전체 화면 자막" }],
    subtitleStyle: {
      fontSizePx: 36,
      bottomOffsetPx: 140,
      color: "#ffff00",
      backgroundColor: "#000000",
      backgroundOpacity: 0.8,
      bold: true,
    },
  });

  assert.equal(showResponse.ok, true);
  let overlay = videoParent.querySelector(".academy-subtitle-helper-overlay");
  assert.ok(overlay);
  assert.equal(overlay.style.fontSize, "36px");
  assert.equal(overlay.style.bottom, "140px");

  fullscreenHost.appendChild(videoParent);
  document.fullscreenElement = fullscreenHost;
  document.dispatchEvent({ type: "fullscreenchange" });

  overlay = fullscreenHost.querySelector(".academy-subtitle-helper-overlay");
  assert.ok(overlay);
  assert.equal(overlay.parentElement, fullscreenHost);
  assert.equal(overlay.textContent, "전체 화면 자막");
  assert.equal(overlay.style.fontSize, "36px");
  assert.equal(overlay.style.bottom, "140px");
  assert.equal(videoParent.querySelector(".academy-subtitle-helper-overlay"), null);
});

function sendContentMessage(messageListeners, message) {
  let response;
  for (const listener of messageListeners) {
    listener(message, {}, (value) => {
      response = value;
    });
  }
  return response;
}

function createContentScriptHarness() {
  const document = createFakeDocument();
  const videoParent = document.createElement("div");
  const video = document.createElement("video");
  const fullscreenHost = document.createElement("div");
  document.body.appendChild(videoParent);
  document.body.appendChild(fullscreenHost);
  videoParent.appendChild(video);
  video.currentTime = 1;

  const messageListeners = [];
  const context = {
    document,
    location: { href: "https://player.vimeo.com/video/123" },
    setTimeout() {},
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListeners.push(listener);
          },
        },
        sendMessage() {},
      },
    },
  };

  return { context, document, video, videoParent, fullscreenHost, messageListeners };
}

function createFakeDocument() {
  const listeners = new Map();
  const document = {
    fullscreenElement: null,
    body: null,
    documentElement: { innerHTML: "" },
    createElement(tagName) {
      return createFakeElement(tagName, this);
    },
    querySelector(selector) {
      return this.body.querySelector(selector);
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
    },
  };
  document.body = createFakeElement("body", document);
  return document;
}

function createFakeElement(tagName, ownerDocument) {
  return {
    tagName: tagName.toUpperCase(),
    ownerDocument,
    parentElement: null,
    children: [],
    style: {},
    textContent: "",
    className: "",
    currentTime: 0,
    appendChild(child) {
      child.remove?.();
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    contains(candidate) {
      return this === candidate || this.children.some((child) => child.contains(candidate));
    },
    querySelector(selector) {
      if (selector === "video" && this.tagName === "VIDEO") {
        return this;
      }

      if (selector.startsWith(".") && this.className === selector.slice(1)) {
        return this;
      }

      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) {
          return found;
        }
      }

      return null;
    },
    remove() {
      if (!this.parentElement) {
        return;
      }
      const index = this.parentElement.children.indexOf(this);
      if (index >= 0) {
        this.parentElement.children.splice(index, 1);
      }
      this.parentElement = null;
    },
  };
}
