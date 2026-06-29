import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/settings.js";

test("defaults to English source and Korean target", () => {
  assert.equal(DEFAULT_SETTINGS.sourceLanguage.code, "en");
  assert.equal(DEFAULT_SETTINGS.targetLanguage.code, "ko");
});

test("uses normal subtitle defaults while allowing larger readable styles", () => {
  assert.equal(DEFAULT_SETTINGS.subtitleStyle.fontSizePx, 24);
  assert.equal(DEFAULT_SETTINGS.subtitleStyle.color, "#ffffff");
  assert.equal(DEFAULT_SETTINGS.subtitleStyle.backgroundColor, "#000000");
  assert.equal(DEFAULT_SETTINGS.subtitleStyle.bottomOffsetPx, 96);
});

test("merges saved style settings without losing defaults", () => {
  const settings = mergeSettings({
    subtitleStyle: { fontSizePx: 34, backgroundOpacity: 0.9 },
  });

  assert.equal(settings.subtitleStyle.fontSizePx, 34);
  assert.equal(settings.subtitleStyle.backgroundOpacity, 0.9);
  assert.equal(settings.subtitleStyle.color, DEFAULT_SETTINGS.subtitleStyle.color);
});

test("keeps per-video sync offsets separate from the global default", () => {
  const settings = mergeSettings({
    defaultSyncOffsetSeconds: 0.25,
    videoSyncOffsets: { "vimeo-123": -0.5 },
  });

  assert.equal(settings.defaultSyncOffsetSeconds, 0.25);
  assert.equal(settings.videoSyncOffsets["vimeo-123"], -0.5);
});
