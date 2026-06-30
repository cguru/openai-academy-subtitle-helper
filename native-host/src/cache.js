import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { parseSubtitleText } from "../../viewer/src/subtitle-parser.js";

export async function findCachedSubtitle({ cacheDir, videoId, targetLanguageCode }) {
  for (const format of ["vtt", "srt"]) {
    const path = join(cacheDir, `${videoId}.${targetLanguageCode}.${format}`);
    if (await exists(path)) {
      const text = await readFile(path, "utf8");
      return {
        found: true,
        path,
        format,
        cues: parseSubtitleText(text),
      };
    }
  }

  return { found: false };
}

export async function deleteCachedSubtitle({ cacheDir, videoId, targetLanguageCode }) {
  const targets = [
    join(cacheDir, `${videoId}.${targetLanguageCode}.vtt`),
    join(cacheDir, `${videoId}.${targetLanguageCode}.srt`),
    join(cacheDir, `${videoId}.${targetLanguageCode}.chunks`),
  ];
  const deleted = [];

  for (const path of targets) {
    if (!(await exists(path))) {
      continue;
    }

    await rm(path, { recursive: true, force: true });
    deleted.push(path);
  }

  return { deletedCount: deleted.length, deleted };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
