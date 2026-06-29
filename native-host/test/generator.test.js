import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildGeneratorCommand, readGenerationProgress } from "../src/generator.js";

test("builds a PowerShell command for Academy subtitle generation", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\New-AcademyKoreanSubtitle.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
    reasoningEffort: "high",
  });

  assert.equal(command.command, "powershell.exe");
  assert.deepEqual(command.args, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "C:\\tool\\New-AcademyKoreanSubtitle.ps1",
    "-Url",
    "https://academy.openai.com/home/videos/example",
    "-OutDir",
    "C:\\cache",
    "-TranslateWithCodex",
    "-TargetLanguageCode",
    "ko",
    "-TargetLanguageName",
    "Korean",
    "-ChunkSize",
    "25",
    "-ReasoningEffort",
    "high",
    "-CacheNameByVideoId",
  ]);
});

test("defaults subtitle generation reasoning effort to medium", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\New-AcademyKoreanSubtitle.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
  });

  assert.deepEqual(
    command.args.slice(
      command.args.indexOf("-ReasoningEffort"),
      command.args.indexOf("-ReasoningEffort") + 2,
    ),
    ["-ReasoningEffort", "medium"],
  );
});

test("uses a planned total chunk count when progress metadata exists", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));
  const chunkDir = join(cacheDir, "123.ko.chunks");
  await mkdir(chunkDir);
  await writeFile(
    join(chunkDir, "progress.json"),
    JSON.stringify({ totalChunks: 4, chunkSize: 50 }),
    "utf8",
  );
  await writeFile(join(chunkDir, "en_1_50.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_1_150.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_51_100.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_101_150.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_151_200.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_1_50.tsv"), "", "utf8");

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(progress, {
    totalChunks: 4,
    completedChunks: 1,
    percent: 25,
    chunkSize: 50,
  });
});

test("includes progress metadata timestamps and phase when present", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));
  const chunkDir = join(cacheDir, "123.ko.chunks");
  await mkdir(chunkDir);
  await writeFile(
    join(chunkDir, "progress.json"),
    JSON.stringify({
      totalChunks: 2,
      completedChunks: 1,
      status: "translating",
      updatedAt: "2026-06-29T01:02:03.000Z",
      currentChunk: 2,
    }),
    "utf8",
  );
  await writeFile(join(chunkDir, "en_1_25.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_26_50.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_1_25.tsv"), "", "utf8");

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.equal(progress.status, "translating");
  assert.equal(progress.updatedAt, "2026-06-29T01:02:03.000Z");
  assert.equal(progress.currentChunk, 2);
});

test("reads generation progress from chunk files", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));
  const chunkDir = join(cacheDir, "123.ko.chunks");
  await writeFile(join(cacheDir, "placeholder"), "", "utf8");
  await mkdir(chunkDir);
  await writeFile(join(chunkDir, "en_1_150.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_151_300.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_1_150.tsv"), "", "utf8");

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(progress, {
    totalChunks: 2,
    completedChunks: 1,
    percent: 50,
  });
});

test("returns zero progress before chunks are created", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(progress, {
    totalChunks: 0,
    completedChunks: 0,
    percent: 0,
  });
});

test("runs nested Codex translation without the Windows workspace sandbox", async () => {
  const script = await readFile("../scripts/New-AcademyKoreanSubtitle.ps1", "utf8");

  assert.match(
    script,
    /codex exec -C \$OutDir -s danger-full-access --ignore-user-config --ignore-rules -c "model_reasoning_effort='\$ReasoningEffort'" --skip-git-repo-check -/,
  );
});
