import test from "node:test";
import assert from "node:assert/strict";
import { tryAutoLoadCachedSubtitle } from "../src/auto-load.js";

test("auto loads cached subtitles when a video frame registers", async () => {
  const sentMessages = [];

  const result = await tryAutoLoadCachedSubtitle({
    frame: { tabId: 1, frameId: 2, videoId: "1203686826" },
    storage: {
      async get() {
        return {
          subtitlesEnabled: true,
          targetLanguage: "ko",
          subtitleStyle: { fontSizePx: 30 },
        };
      },
    },
    async getSubtitle(payload) {
      assert.deepEqual(payload, {
        type: "getSubtitle",
        videoId: "1203686826",
        targetLanguageCode: "ko",
      });
      return { type: "subtitleFound", cues: [{ start: 0, end: 1, text: "안녕하세요" }] };
    },
    async sendFrameMessage(frame, payload) {
      sentMessages.push({ frame, payload });
      return { ok: true };
    },
  });

  assert.equal(result.type, "loaded");
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].payload.type, "showSubtitles");
  assert.equal(sentMessages[0].payload.subtitleStyle.fontSizePx, 30);
});

test("does not auto load cached subtitles when translated subtitles are disabled", async () => {
  let getSubtitleCalled = false;

  const result = await tryAutoLoadCachedSubtitle({
    frame: { tabId: 1, frameId: 2, videoId: "1203686826" },
    storage: {
      async get() {
        return { subtitlesEnabled: false, targetLanguage: "ko" };
      },
    },
    async getSubtitle() {
      getSubtitleCalled = true;
      return { type: "subtitle", cues: [] };
    },
    async sendFrameMessage() {
      throw new Error("should not send frame message");
    },
  });

  assert.equal(result.type, "skipped");
  assert.equal(result.reason, "disabled");
  assert.equal(getSubtitleCalled, false);
});
