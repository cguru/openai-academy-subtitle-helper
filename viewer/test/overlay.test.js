import test from "node:test";
import assert from "node:assert/strict";
import { createSubtitleOverlay } from "../src/overlay.js";

test("creates an overlay element over the video parent and applies readable styles", () => {
  const document = createFakeDocument();
  const parent = document.createElement("div");
  const video = document.createElement("video");
  parent.appendChild(video);

  const overlay = createSubtitleOverlay(video, {
    subtitleStyle: {
      fontSizePx: 30,
      color: "#ffff00",
      backgroundColor: "#000000",
      backgroundOpacity: 0.8,
      bottomOffsetPx: 80,
      bold: true,
    },
  });

  overlay.setText("테스트 자막");

  assert.equal(parent.children.length, 2);
  assert.equal(parent.children[1].textContent, "테스트 자막");
  assert.equal(parent.children[1].style.fontSize, "30px");
  assert.equal(parent.children[1].style.color, "#ffff00");
  assert.equal(parent.children[1].style.fontWeight, "700");
  assert.equal(parent.children[1].style.bottom, "80px");
  assert.equal(parent.children[1].style.width, "94%");
  assert.equal(parent.children[1].style.maxWidth, "94%");
  assert.equal(parent.children[1].style.wordBreak, "keep-all");
  assert.equal(parent.children[1].style.backgroundColor, "rgba(0, 0, 0, 0.8)");
});

test("clears and destroys the overlay", () => {
  const document = createFakeDocument();
  const parent = document.createElement("div");
  const video = document.createElement("video");
  parent.appendChild(video);

  const overlay = createSubtitleOverlay(video);
  overlay.setText("visible");
  overlay.clear();

  assert.equal(parent.children[1].textContent, "");

  overlay.destroy();

  assert.equal(parent.children.length, 1);
});

function createFakeDocument() {
  return {
    createElement(tagName) {
      return createFakeElement(tagName, this);
    },
  };
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
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
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
