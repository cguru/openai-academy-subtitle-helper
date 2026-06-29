import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findCachedSubtitle } from "../src/cache.js";

test("finds and parses a cached VTT subtitle for a video and language", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-subtitles-"));
  await writeFile(
    join(cacheDir, "12345.ko.vtt"),
    `WEBVTT

1
00:00:01.000 --> 00:00:02.000
안녕하세요.
`,
    "utf8",
  );

  const result = await findCachedSubtitle({
    cacheDir,
    videoId: "12345",
    targetLanguageCode: "ko",
  });

  assert.equal(result.found, true);
  assert.equal(result.format, "vtt");
  assert.equal(result.cues[0].text, "안녕하세요.");
});

test("returns missing when no cached subtitle exists", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-subtitles-"));

  const result = await findCachedSubtitle({
    cacheDir,
    videoId: "missing",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(result, { found: false });
});
