import test from "node:test";
import assert from "node:assert/strict";
import { getTranslator } from "../src/i18n.js";
import { formatProgressLabel, formatProgressStatus } from "../src/progress-format.js";

test("formats running progress with elapsed and last progress timing", () => {
  const progress = {
    totalChunks: 10,
    completedChunks: 3,
    percent: 30,
    startedAt: "2026-06-29T01:00:00.000Z",
    updatedAt: "2026-06-29T01:02:00.000Z",
    checkedAt: "2026-06-29T01:03:05.000Z",
  };

  assert.equal(
    formatProgressLabel(progress),
    "3 / 10 chunks (30%) | elapsed 3m 5s | last progress 1m 5s ago",
  );
});

test("omits live polling timing from the progress label", () => {
  const progress = {
    totalChunks: 10,
    completedChunks: 3,
    percent: 30,
    startedAt: "2026-06-29T01:00:00.000Z",
    updatedAt: "2026-06-29T01:02:00.000Z",
    checkedAt: "2026-06-29T01:03:05.000Z",
  };

  assert.equal(
    formatProgressLabel(progress, {
      now: new Date("2026-06-29T01:03:06.000Z"),
      pollIntervalMs: 2000,
    }),
    "3 / 10 chunks (30%) | elapsed 3m 6s | last progress 1m 6s ago",
  );
});

test("formats preparing progress with elapsed timing", () => {
  const progress = {
    totalChunks: 0,
    completedChunks: 0,
    percent: 0,
    startedAt: "2026-06-29T01:00:00.000Z",
    checkedAt: "2026-06-29T01:00:12.000Z",
  };

  assert.equal(formatProgressLabel(progress), "Preparing chunks... | elapsed 12s");
});

test("formats running status with current chunk context", () => {
  assert.equal(
    formatProgressStatus({
      targetLanguageName: "Korean",
      progress: { totalChunks: 10, completedChunks: 3, currentChunk: 4 },
    }),
    "Generating Korean subtitles...\nWorking on chunk 4 of 10. 3 chunks completed.",
  );
});

test("formats running status with localized messages", () => {
  assert.equal(
    formatProgressStatus(
      {
        targetLanguageName: "한국어",
        progress: { totalChunks: 10, completedChunks: 3, currentChunk: 4 },
      },
      { t: getTranslator("ko") },
    ),
    "한국어 자막 생성 중...\n10개 중 4번째 조각 작업 중입니다. 3개 조각 완료.",
  );
});
