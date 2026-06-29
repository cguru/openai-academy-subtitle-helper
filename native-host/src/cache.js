import { access, readFile } from "node:fs/promises";
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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
