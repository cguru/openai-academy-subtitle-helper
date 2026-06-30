import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildGeneratorCommand, readGenerationProgress } from "../src/generator.js";
import { runCommandWithOutput } from "../src/host.js";

test("builds a PowerShell command for Academy subtitle generation", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\oash.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
    reasoningEffort: "high",
  });

  assert.equal(command.command, "powershell.exe");
  assert.equal(command.args[0], "-NoProfile");
  assert.equal(command.args[1], "-ExecutionPolicy");
  assert.equal(command.args[2], "Bypass");
  assert.equal(command.args[3], "-Command");
  assert.equal(command.args.length, 5);
  assert.match(command.args[4], /& 'C:\\tool\\oash\.ps1'/);
  assert.match(command.args[4], /-Url 'https:\/\/academy\.openai\.com\/home\/videos\/example'/);
  assert.match(command.args[4], /-OutDir 'C:\\cache'/);
  assert.match(command.args[4], /-TranslateWithCodex/);
  assert.match(command.args[4], /-TargetLanguageCode 'ko'/);
  assert.match(command.args[4], /-TargetLanguageName 'Korean'/);
  assert.match(command.args[4], /-ChunkSize '75'/);
  assert.match(command.args[4], /-ParallelJobs '5'/);
  assert.match(command.args[4], /-ReasoningEffort 'high'/);
  assert.match(command.args[4], /-CacheNameByVideoId/);
});

test("sets PowerShell output encoding before invoking the generator script", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\oash.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
  });

  assert.match(command.args[4], /UTF8Encoding/);
  assert.match(command.args[4], /Console\]::OutputEncoding/);
  assert.match(command.args[4], /& 'C:\\tool\\oash\.ps1'/);
});

test("reports missing PowerShell script paths without mojibake", async () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\no-such-folder\\없는스크립트.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "한국어",
  });

  const result = await runCommandWithOutput(command);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /없는스크립트\.ps1/);
  assert.doesNotMatch(result.stderr, /�/);
  assert.doesNotMatch(result.stderr, /잘못된 개체|InvalidOperation/);
});

test("passes a custom parallel job count to the generator", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\oash.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
    parallelJobs: 10,
  });

  assert.match(command.args[4], /-ParallelJobs '10'/);
});

test("defaults subtitle generation reasoning effort to low", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\oash.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
  });

  assert.match(command.args[4], /-ReasoningEffort 'low'/);
});

test("passes a custom chunk size to the generator", () => {
  const command = buildGeneratorCommand({
    scriptPath: "C:\\tool\\oash.ps1",
    academyUrl: "https://academy.openai.com/home/videos/example",
    outDir: "C:\\cache",
    targetLanguageCode: "ko",
    targetLanguageName: "Korean",
    chunkSize: 100,
  });

  assert.match(command.args[4], /-ChunkSize '100'/);
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

test("counts only translated chunks from the current generation plan", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));
  const chunkDir = join(cacheDir, "123.ko.chunks");
  await mkdir(chunkDir);
  await writeFile(
    join(chunkDir, "progress.json"),
    JSON.stringify({ totalChunks: 4, chunkSize: 25 }),
    "utf8",
  );
  await writeFile(join(chunkDir, "en_1_25.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_26_50.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_51_75.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_76_100.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_1_50.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "en_51_100.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_1_25.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_26_50.tsv"), "", "utf8");
  await writeFile(join(chunkDir, "ko_1_50.tsv"), "", "utf8");

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(progress, {
    totalChunks: 4,
    completedChunks: 2,
    percent: 50,
    chunkSize: 25,
  });
});

test("reads PowerShell UTF-8 BOM progress metadata", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "academy-progress-"));
  const chunkDir = join(cacheDir, "123.ko.chunks");
  await mkdir(chunkDir);
  await writeFile(
    join(chunkDir, "progress.json"),
    `\uFEFF${JSON.stringify({ totalChunks: 4, chunkSize: 25, status: "translating" })}`,
    "utf8",
  );

  const progress = await readGenerationProgress({
    cacheDir,
    videoId: "123",
    targetLanguageCode: "ko",
  });

  assert.deepEqual(progress, {
    totalChunks: 4,
    completedChunks: 0,
    percent: 0,
    status: "translating",
    chunkSize: 25,
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
  const script = await readFile("../scripts/oash.ps1", "utf8");

  assert.match(
    script,
    /codex exec -C \$OutDir -s danger-full-access --ignore-user-config --ignore-rules -c "model_reasoning_effort='\$ReasoningEffort'" --skip-git-repo-check -/,
  );
});

test("supports bounded parallel translation jobs in the PowerShell generator", async () => {
  const script = await readFile("../scripts/oash.ps1", "utf8");

  assert.match(script, /\[ValidateRange\(1,\s*10\)\]\s*\[int\]\s*\$ParallelJobs\s*=\s*5/);
  assert.match(script, /Start-TranslationJob/);
  assert.match(script, /while \(\$pendingPlans\.Count -gt 0 -or \$runningJobs\.Count -gt 0\)/);
});

test("writes generation progress with retry to tolerate popup polling", async () => {
  const script = await readFile("../scripts/oash.ps1", "utf8");

  assert.match(script, /function Set-Utf8TextFileWithRetry/);
  assert.match(script, /catch \[System\.IO\.IOException\]/);
  assert.match(script, /Set-Utf8TextFileWithRetry -Path \$Path -Value/);
  assert.match(script, /Set-Utf8TextFileWithRetry -Path \$progressPath -Value/);
});

test("reads generation progress with retry to tolerate transient file locks", async () => {
  const source = await readFile("./src/generator.js", "utf8");

  assert.match(source, /TRANSIENT_PROGRESS_READ_ERROR_CODES = new Set\(\["EBUSY", "EPERM"\]\)/);
  assert.match(source, /readTextFileWithRetry\(join\(chunkDir, "progress\.json"\)\)/);
  assert.match(source, /setTimeout\(resolve, ms\)/);
});
