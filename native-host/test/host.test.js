import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defaultGeneratorScriptPath, handleMessage } from "../src/host.js";

test("responds to ping", async () => {
  assert.deepEqual(await handleMessage({ type: "ping" }, { cacheDir: "." }), { type: "pong" });
});

test("uses the short oash script name by default", () => {
  assert.match(defaultGeneratorScriptPath(), /scripts[\\/]oash\.ps1$/);
});

test("returns cached subtitle cues", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-subtitles-"));
  await writeFile(
    join(cacheDir, "abc.ko.vtt"),
    `WEBVTT

1
00:00:01.000 --> 00:00:02.000
테스트
`,
    "utf8",
  );

  const response = await handleMessage(
    { type: "getSubtitle", videoId: "abc", targetLanguageCode: "ko" },
    { cacheDir },
  );

  assert.equal(response.type, "subtitleFound");
  assert.equal(response.cues[0].text, "테스트");
});

test("returns subtitleMissing when cache is empty", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-subtitles-"));

  const response = await handleMessage(
    { type: "getSubtitle", videoId: "abc", targetLanguageCode: "ko" },
    { cacheDir },
  );

  assert.deepEqual(response, { type: "subtitleMissing", videoId: "abc", targetLanguageCode: "ko" });
});

test("deletes cached subtitles and chunks for a video language", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-subtitles-"));
  await writeFile(join(cacheDir, "abc.ko.vtt"), "WEBVTT\n", "utf8");
  await writeFile(join(cacheDir, "abc.ko.srt"), "1\n", "utf8");
  await mkdir(join(cacheDir, "abc.ko.chunks"));
  await writeFile(join(cacheDir, "abc.en.vtt"), "WEBVTT\n", "utf8");

  const response = await handleMessage(
    { type: "deleteSubtitle", videoId: "abc", targetLanguageCode: "ko" },
    { cacheDir },
  );

  assert.equal(response.type, "subtitleDeleted");
  assert.equal(response.deletedCount, 3);
  await assert.rejects(access(join(cacheDir, "abc.ko.vtt")));
  await assert.rejects(access(join(cacheDir, "abc.ko.srt")));
  await assert.rejects(access(join(cacheDir, "abc.ko.chunks")));
  await access(join(cacheDir, "abc.en.vtt"));
});

test("starts the generator for generateSubtitle requests", async () => {
  const calls = [];
  const response = await handleMessage(
    {
      type: "generateSubtitle",
      pageUrl: "https://academy.openai.com/home/videos/example",
      targetLanguageCode: "ko",
      targetLanguageName: "Korean",
      reasoningEffort: "low",
      parallelJobs: 10,
      chunkSize: 75,
    },
    {
      cacheDir: "C:\\cache",
      generatorScriptPath: "C:\\tool\\oash.ps1",
      startCommand: (command) => {
        calls.push(command);
        return {
          cancel: () => {},
          done: Promise.resolve({ exitCode: 0, stdout: "ok", stderr: "" }),
        };
      },
    },
  );

  assert.equal(response.type, "generationStarted");
  assert.equal(response.status, "running");
  assert.ok(response.jobId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "powershell.exe");
  assert.equal(calls[0].args[3], "-Command");
  assert.match(calls[0].args[4], /-CacheNameByVideoId/);
  assert.match(calls[0].args[4], /-ReasoningEffort 'low'/);
  assert.match(calls[0].args[4], /-ParallelJobs '10'/);
  assert.match(calls[0].args[4], /-ChunkSize '75'/);
});

test("returns generation status with chunk progress", async () => {
  const response = await handleMessage(
    {
      type: "getGenerationStatus",
      jobId: "job-1",
      videoId: "abc",
      targetLanguageCode: "ko",
    },
    {
      cacheDir: "C:\\cache",
      readProgress: async () => ({ totalChunks: 4, completedChunks: 2, percent: 50 }),
      jobs: new Map([
        [
          "job-1",
          {
            jobId: "job-1",
            status: "running",
            videoId: "abc",
            targetLanguageCode: "ko",
            startedAt: "2026-06-29T01:00:00.000Z",
          },
        ],
      ]),
      now: () => new Date("2026-06-29T01:02:00.000Z"),
    },
  );

  assert.deepEqual(response, {
    type: "generationStatus",
    jobId: "job-1",
    status: "running",
    videoId: "abc",
    targetLanguageCode: "ko",
    progress: {
      totalChunks: 4,
      completedChunks: 2,
      percent: 50,
      startedAt: "2026-06-29T01:00:00.000Z",
      checkedAt: "2026-06-29T01:02:00.000Z",
    },
  });
});

test("cancels a running generation job", async () => {
  let cancelled = false;
  const jobs = new Map([
    [
      "job-1",
      {
        jobId: "job-1",
        status: "running",
        videoId: "abc",
        targetLanguageCode: "ko",
        cancel: () => {
          cancelled = true;
        },
      },
    ],
  ]);

  const response = await handleMessage({ type: "cancelGeneration", jobId: "job-1" }, { jobs });

  assert.equal(cancelled, true);
  assert.deepEqual(response, {
    type: "generationStatus",
    jobId: "job-1",
    status: "cancelled",
    videoId: "abc",
    targetLanguageCode: "ko",
  });
});

test("marks generation status failed when the generator exits non-zero", async () => {
  const jobs = new Map();
  const started = await handleMessage(
    {
      type: "generateSubtitle",
      pageUrl: "https://academy.openai.com/home/videos/example",
      targetLanguageCode: "ko",
      targetLanguageName: "Korean",
    },
    {
      cacheDir: "C:\\cache",
      generatorScriptPath: "C:\\tool\\oash.ps1",
      jobs,
      startCommand: () => ({
        cancel: () => {},
        done: Promise.resolve({ exitCode: 1, stdout: "", stderr: "failed" }),
      }),
    },
  );
  await Promise.resolve();

  const response = await handleMessage(
    {
      type: "getGenerationStatus",
      jobId: started.jobId,
      videoId: "abc",
      targetLanguageCode: "ko",
    },
    {
      cacheDir: "C:\\cache",
      jobs,
      readProgress: async () => ({ totalChunks: 0, completedChunks: 0, percent: 0 }),
    },
  );

  assert.equal(response.type, "generationStatus");
  assert.equal(response.status, "failed");
  assert.match(response.message, /failed/);
});
