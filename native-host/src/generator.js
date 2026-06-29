import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export function buildGeneratorCommand({
  scriptPath,
  academyUrl,
  outDir,
  targetLanguageCode,
  targetLanguageName,
  chunkSize = 25,
  parallelJobs = 3,
  reasoningEffort = "medium",
}) {
  const scriptArgs = [
    "-Url",
    academyUrl,
    "-OutDir",
    outDir,
    "-TranslateWithCodex",
    "-TargetLanguageCode",
    targetLanguageCode,
    "-TargetLanguageName",
    targetLanguageName,
    "-ChunkSize",
    String(chunkSize),
    "-ParallelJobs",
    String(parallelJobs),
    "-ReasoningEffort",
    reasoningEffort,
    "-CacheNameByVideoId",
  ];
  const bootstrapCommand = [
    "$OutputEncoding = [System.Text.UTF8Encoding]::new($false)",
    "[Console]::OutputEncoding = $OutputEncoding",
    ["&", psQuote(scriptPath), ...scriptArgs.map(formatPowerShellArgument)].join(" "),
  ].join("; ");

  return {
    command: "powershell.exe",
    args: [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      bootstrapCommand,
    ],
  };
}

function formatPowerShellArgument(value) {
  if (String(value).startsWith("-")) {
    return value;
  }

  return psQuote(value);
}

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export async function readGenerationProgress({ cacheDir, videoId, targetLanguageCode }) {
  const chunkDir = join(cacheDir, `${videoId}.${targetLanguageCode}.chunks`);
  let files;

  try {
    files = await readdir(chunkDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { totalChunks: 0, completedChunks: 0, percent: 0 };
    }

    throw error;
  }

  const translatedChunkPattern = new RegExp(
    `^${escapeRegExp(targetLanguageCode)}_\\d+_\\d+\\.tsv$`,
  );
  const metadata = await readProgressMetadata(chunkDir);
  const sourceChunks = files.map(parseSourceChunkName).filter(Boolean);
  const plannedSourceChunks = metadata.chunkSize
    ? sourceChunks.filter((chunk) => chunk.cueCount <= metadata.chunkSize)
    : sourceChunks;
  const sourceChunkCount = plannedSourceChunks.length;
  const totalChunks = metadata.totalChunks || sourceChunkCount;
  const completedChunks =
    plannedSourceChunks.length > 0
      ? plannedSourceChunks.filter((chunk) => files.includes(chunk.translatedName(targetLanguageCode)))
          .length
      : files.filter((file) => translatedChunkPattern.test(file)).length;
  const percent =
    totalChunks === 0 ? 0 : Math.min(100, Math.round((completedChunks / totalChunks) * 100));

  return withoutUndefined({
    totalChunks,
    completedChunks,
    percent,
    status: metadata.status,
    updatedAt: metadata.updatedAt,
    currentChunk: metadata.currentChunk,
    chunkSize: metadata.chunkSize,
  });
}

function parseSourceChunkName(file) {
  const match = /^en_(\d+)_(\d+)\.tsv$/.exec(file);
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return null;

  return {
    cueCount: end - start + 1,
    translatedName(targetLanguageCode) {
      return `${targetLanguageCode}_${start}_${end}.tsv`;
    },
  };
}

async function readProgressMetadata(chunkDir) {
  try {
    const raw = await readFile(join(chunkDir, "progress.json"), "utf8");
    const progress = JSON.parse(raw.replace(/^\uFEFF/, ""));
    return {
      totalChunks:
        Number.isInteger(progress.totalChunks) && progress.totalChunks > 0
          ? progress.totalChunks
          : 0,
      chunkSize:
        Number.isInteger(progress.chunkSize) && progress.chunkSize > 0 ? progress.chunkSize : undefined,
      currentChunk:
        Number.isInteger(progress.currentChunk) && progress.currentChunk > 0
          ? progress.currentChunk
          : undefined,
      status: typeof progress.status === "string" ? progress.status : undefined,
      updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : undefined,
    };
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      return { totalChunks: 0 };
    }

    throw error;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
