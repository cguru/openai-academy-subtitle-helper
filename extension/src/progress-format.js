export function formatProgressLabel(progress, options = {}) {
  if (!progress) {
    return "Preparing...";
  }

  const referenceTime = options.now ?? (progress.checkedAt ? new Date(progress.checkedAt) : null);
  const parts = [];
  if (progress.totalChunks > 0) {
    parts.push(
      `${progress.completedChunks} / ${progress.totalChunks} chunks (${progress.percent}%)`,
    );
  } else {
    parts.push("Preparing chunks...");
  }

  const elapsed = formatDurationBetween(progress.startedAt, referenceTime);
  if (elapsed) {
    parts.push(`elapsed ${elapsed}`);
  }

  const lastProgress = formatDurationBetween(progress.updatedAt, referenceTime);
  if (lastProgress) {
    parts.push(`last progress ${lastProgress} ago`);
  }

  if (progress.checkedAt) {
    const checkedAgeSeconds = secondsBetween(progress.checkedAt, referenceTime);
    parts.push(checkedAgeSeconds === 0 ? "checked just now" : `checked ${formatDuration(checkedAgeSeconds)} ago`);

    if (options.pollIntervalMs) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((options.pollIntervalMs - checkedAgeSeconds * 1000) / 1000),
      );
      parts.push(remainingSeconds === 0 ? "next check now" : `next check in ${formatDuration(remainingSeconds)}`);
    }
  }

  return parts.join(" | ");
}

export function formatProgressStatus(generation) {
  const name = generation.targetLanguageName ?? generation.targetLanguageCode;
  const progress = generation.progress;
  if (!progress || progress.totalChunks === 0) {
    return `Generating ${name} subtitles...\nPreparing source subtitles and chunks.`;
  }

  if (progress.currentChunk) {
    return `Generating ${name} subtitles...\nWorking on chunk ${progress.currentChunk} of ${progress.totalChunks}. ${progress.completedChunks} chunks completed.`;
  }

  return `Generating ${name} subtitles...\n${progress.completedChunks} of ${progress.totalChunks} chunks translated.`;
}

function formatDurationBetween(startValue, endValue) {
  if (!startValue || !endValue) {
    return null;
  }

  const seconds = secondsBetween(startValue, endValue);
  return seconds === null ? null : formatDuration(seconds);
}

function secondsBetween(startValue, endValue) {
  const start = Date.parse(startValue);
  const end = endValue instanceof Date ? endValue.getTime() : Date.parse(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return Math.round((end - start) / 1000);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainderSeconds}s`;
  }

  return `${minutes}m ${remainderSeconds}s`;
}
