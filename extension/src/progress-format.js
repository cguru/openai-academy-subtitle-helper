import { getTranslator } from "./i18n.js";

export function formatProgressLabel(progress, options = {}) {
  const t = options.t ?? getTranslator("en");
  if (!progress) {
    return t("preparing");
  }

  const referenceTime = options.now ?? (progress.checkedAt ? new Date(progress.checkedAt) : null);
  const parts = [];
  if (progress.totalChunks > 0) {
    parts.push(
      t("progressChunks", {
        completed: progress.completedChunks,
        total: progress.totalChunks,
        percent: progress.percent,
      }),
    );
  } else {
    parts.push(t("progressPreparing"));
  }

  const elapsed = formatDurationBetween(progress.startedAt, referenceTime, t);
  if (elapsed) {
    parts.push(t("progressElapsed", { duration: elapsed }));
  }

  const lastProgress = formatDurationBetween(progress.updatedAt, referenceTime, t);
  if (lastProgress) {
    parts.push(t("progressLastProgress", { duration: lastProgress }));
  }

  return parts.join(" | ");
}

export function formatProgressStatus(generation, options = {}) {
  const t = options.t ?? getTranslator("en");
  const name = generation.targetLanguageName ?? generation.targetLanguageCode;
  const progress = generation.progress;
  if (!progress || progress.totalChunks === 0) {
    return `${t("generatingSubtitles", { name })}\n${t("preparingSource")}`;
  }

  if (progress.currentChunk) {
    return `${t("generatingSubtitles", { name })}\n${t("workingOnChunk", {
      current: progress.currentChunk,
      total: progress.totalChunks,
      completed: progress.completedChunks,
    })}`;
  }

  return `${t("generatingSubtitles", { name })}\n${t("translatedChunks", {
    completed: progress.completedChunks,
    total: progress.totalChunks,
  })}`;
}

function formatDurationBetween(startValue, endValue, t) {
  if (!startValue || !endValue) {
    return null;
  }

  const seconds = secondsBetween(startValue, endValue);
  return seconds === null ? null : formatDuration(seconds, t);
}

function secondsBetween(startValue, endValue) {
  const start = Date.parse(startValue);
  const end = endValue instanceof Date ? endValue.getTime() : Date.parse(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return Math.round((end - start) / 1000);
}

function formatDuration(totalSeconds, t) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes === 0) {
    return t("progressSeconds", { seconds: remainderSeconds });
  }

  return t("progressMinutesSeconds", { minutes, seconds: remainderSeconds });
}
