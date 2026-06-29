import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SUBTITLE_STYLE, normalizeSubtitleStyle } from "../src/subtitle-style.js";

test("normalizes subtitle style settings with readable defaults", () => {
  const style = normalizeSubtitleStyle();

  assert.deepEqual(style, DEFAULT_SUBTITLE_STYLE);
  assert.equal(style.fontSizePx, 24);
  assert.equal(style.bottomOffsetPx, 96);
});

test("normalizes null subtitle style settings with readable defaults", () => {
  assert.deepEqual(normalizeSubtitleStyle(null), DEFAULT_SUBTITLE_STYLE);
});

test("clamps subtitle style settings to supported control ranges", () => {
  const style = normalizeSubtitleStyle({
    fontSizePx: 99,
    bottomOffsetPx: -10,
    backgroundOpacity: 3,
    color: "not-a-color",
    backgroundColor: "#123456",
    bold: true,
  });

  assert.equal(style.fontSizePx, 48);
  assert.equal(style.bottomOffsetPx, 24);
  assert.equal(style.backgroundOpacity, 1);
  assert.equal(style.color, DEFAULT_SUBTITLE_STYLE.color);
  assert.equal(style.backgroundColor, "#123456");
  assert.equal(style.bold, true);
});

test("clamps overly high subtitle position back near the caption area", () => {
  const style = normalizeSubtitleStyle({ bottomOffsetPx: 240 });

  assert.equal(style.bottomOffsetPx, 180);
});
