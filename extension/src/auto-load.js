import { normalizeSubtitleStyle } from "./subtitle-style.js";

export async function tryAutoLoadCachedSubtitle({ frame, storage, getSubtitle, sendFrameMessage }) {
  if (!frame?.videoId) {
    return { type: "skipped", reason: "missingVideoId" };
  }

  const settings = await storage.get(["subtitlesEnabled", "targetLanguage", "subtitleStyle"]);
  if (settings.subtitlesEnabled === false) {
    return { type: "skipped", reason: "disabled" };
  }

  const targetLanguageCode = settings.targetLanguage ?? "ko";
  const response = await getSubtitle({
    type: "getSubtitle",
    videoId: frame.videoId,
    targetLanguageCode,
  });

  if (response?.type !== "subtitleFound" && response?.type !== "subtitle") {
    return { type: "skipped", reason: response?.type ?? "unexpectedResponse" };
  }

  const shown = await sendFrameMessage(frame, {
    type: "showSubtitles",
    cues: response.cues,
    syncOffsetSeconds: 0,
    subtitleStyle: normalizeSubtitleStyle(settings.subtitleStyle),
  });

  if (!shown?.ok) {
    return { type: "skipped", reason: "frameRejected", message: shown?.message };
  }

  return {
    type: "loaded",
    videoId: frame.videoId,
    targetLanguageCode,
    cueCount: response.cues.length,
  };
}
