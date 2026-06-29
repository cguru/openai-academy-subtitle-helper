import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export function buildGeneratorCommand({
  scriptPath,
  academyUrl,
  outDir,
  targetLanguageCode,
  targetLanguageName,
  chunkSize = 25,
  reasoningEffort = "medium",
}) {
  return {
    command: "powershell.exe",
    args: [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
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
      "-ReasoningEffort",
      reasoningEffort,
      "-CacheNameByVideoId",
    ],
  };
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

  const sourceChunkPattern = /^en_\d+_\d+\.tsv$/;
  const translatedChunkPattern = new RegExp(
    `^${escapeRegExp(targetLanguageCode)}_\\d+_\\d+\\.tsv$`,
  );
  const sourceChunkCount = files.filter((file) => sourceChunkPattern.test(file)).length;
  const metadata = await readProgressMetadata(chunkDir);
  const totalChunks = metadata.totalChunks || sourceChunkCount;
  const completedChunks = files.filter((file) => translatedChunkPattern.test(file)).length;
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

async function readProgressMetadata(chunkDir) {
  try {
    const raw = await readFile(join(chunkDir, "progress.json"), "utf8");
    const progress = JSON.parse(raw);
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
