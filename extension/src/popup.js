import { sendRuntimeMessage } from "./messaging.js";
import { formatProgressLabel, formatProgressStatus } from "./progress-format.js";
import { DEFAULT_SUBTITLE_STYLE, normalizeSubtitleStyle } from "./subtitle-style.js";

const statusElement = document.querySelector("#status");
const targetLanguageElement = document.querySelector("#target-language");
const reasoningEffortElement = document.querySelector("#reasoning-effort");
const fontSizeElement = document.querySelector("#font-size");
const fontSizeValueElement = document.querySelector("#font-size-value");
const bottomOffsetElement = document.querySelector("#bottom-offset");
const bottomOffsetValueElement = document.querySelector("#bottom-offset-value");
const subtitleColorElement = document.querySelector("#subtitle-color");
const backgroundColorElement = document.querySelector("#background-color");
const backgroundOpacityElement = document.querySelector("#background-opacity");
const backgroundOpacityValueElement = document.querySelector("#background-opacity-value");
const subtitleBoldElement = document.querySelector("#subtitle-bold");
const generateButton = document.querySelector("#generate");
const cancelButton = document.querySelector("#cancel");
const toggleSubtitlesButton = document.querySelector("#toggle-subtitles");
const progressPanel = document.querySelector("#progress-panel");
const progressElement = document.querySelector("#progress");
const progressLabel = document.querySelector("#progress-label");
const languageNames = {
  ko: "Korean",
  ja: "Japanese",
  "zh-Hans": "Chinese Simplified",
  es: "Spanish",
  fr: "French",
  de: "German",
};
const PROGRESS_POLL_INTERVAL_MS = 2000;

let currentGeneration = null;
let pollTimer = null;
let progressClockTimer = null;
let subtitleStyle = DEFAULT_SUBTITLE_STYLE;
let subtitlesEnabled = true;

document.querySelector("#load").addEventListener("click", loadCachedSubtitle);
generateButton.addEventListener("click", generateSubtitle);
cancelButton.addEventListener("click", cancelGeneration);
toggleSubtitlesButton.addEventListener("click", toggleSubtitles);
targetLanguageElement.addEventListener("change", async () => {
  await chrome.storage.local.set({ targetLanguage: targetLanguageElement.value });
  if (subtitlesEnabled) {
    await loadCachedSubtitle();
  }
});
reasoningEffortElement.addEventListener("change", async () => {
  await chrome.storage.local.set({ reasoningEffort: reasoningEffortElement.value });
});
[
  fontSizeElement,
  bottomOffsetElement,
  subtitleColorElement,
  backgroundColorElement,
  backgroundOpacityElement,
  subtitleBoldElement,
].forEach((element) => element.addEventListener("input", saveSubtitleStyleFromControls));
init();

async function init() {
  const stored = await chrome.storage.local.get([
    "currentGeneration",
    "reasoningEffort",
    "subtitleStyle",
    "subtitlesEnabled",
    "targetLanguage",
  ]);
  currentGeneration = stored.currentGeneration ?? null;
  subtitlesEnabled = stored.subtitlesEnabled !== false;
  targetLanguageElement.value = stored.targetLanguage ?? "ko";
  reasoningEffortElement.value = stored.reasoningEffort ?? "medium";
  subtitleStyle = normalizeSubtitleStyle(stored.subtitleStyle);
  renderSubtitleStyleControls();
  renderSubtitleToggle();
  updateGenerationControls();

  if (currentGeneration) {
    await pollGenerationStatus({ loadOnComplete: false });
    return;
  }

  await checkCachedSubtitleAvailability();
}

async function loadCachedSubtitle(options = {}) {
  try {
    if (!subtitlesEnabled) {
      await setSubtitlesEnabled(true, { loadAfterEnable: false });
    }

    const detected = options.videoId
      ? { found: true, videoId: options.videoId }
      : await detectCurrentVideo();
    if (!detected) return;

    setStatus(`Looking for cached subtitles for ${detected.videoId}...`);

    const targetLanguageCode = targetLanguageElement.value;
    const response = await sendRuntimeMessage({
      target: "native-host",
      payload: {
        type: "getSubtitle",
        videoId: detected.videoId,
        targetLanguageCode,
      },
    });

    if (response?.type === "subtitleMissing") {
      setGenerateNeedsAttention(true);
      setStatus(`No cached ${targetLanguageCode} subtitles found for ${detected.videoId}.`);
      return;
    }

    if (response?.type === "error") {
      setStatus(response.message);
      return;
    }

    const shown = await sendRuntimeMessage({
      target: "content-frame",
      payload: {
        type: "showSubtitles",
        cues: response.cues,
        syncOffsetSeconds: 0,
        subtitleStyle,
      },
    });
    if (!shown?.ok) {
      setStatus(shown?.message ?? "Could not show subtitles on the video frame.");
      return;
    }
    setGenerateNeedsAttention(false);
    setStatus(`Loaded ${response.cues.length} cues from local cache.`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function checkCachedSubtitleAvailability() {
  if (!subtitlesEnabled) {
    setGenerateNeedsAttention(false);
    return;
  }

  try {
    const detected = await detectCurrentVideo({ quiet: true });
    if (!detected) {
      return;
    }

    const targetLanguageCode = targetLanguageElement.value;
    const response = await sendRuntimeMessage({
      target: "native-host",
      payload: {
        type: "getSubtitle",
        videoId: detected.videoId,
        targetLanguageCode,
      },
    });

    if (response?.type === "subtitleMissing") {
      setGenerateNeedsAttention(true);
      setStatus(`No cached ${targetLanguageCode} subtitles found. Generate to create them.`);
      return;
    }

    if (response?.type === "subtitle") {
      setGenerateNeedsAttention(false);
    }
  } catch {
    // Availability probing is best effort; explicit Load cached still reports errors.
  }
}

async function toggleSubtitles() {
  await setSubtitlesEnabled(!subtitlesEnabled);
}

async function setSubtitlesEnabled(enabled, options = {}) {
  const { loadAfterEnable = true } = options;
  subtitlesEnabled = enabled;
  await chrome.storage.local.set({ subtitlesEnabled });
  renderSubtitleToggle();

  if (!subtitlesEnabled) {
    try {
      await sendRuntimeMessage({
        target: "content-frame",
        payload: { type: "hideSubtitles" },
      });
    } catch {
      // The preference is still saved; a video frame may not be open yet.
    }
    setStatus("Translated subtitles disabled.");
    return;
  }

  setStatus("Translated subtitles enabled.");
  if (loadAfterEnable) {
    await loadCachedSubtitle();
  }
}

async function saveSubtitleStyleFromControls() {
  subtitleStyle = normalizeSubtitleStyle({
    fontSizePx: fontSizeElement.value,
    bottomOffsetPx: bottomOffsetElement.value,
    color: subtitleColorElement.value,
    backgroundColor: backgroundColorElement.value,
    backgroundOpacity: backgroundOpacityElement.value,
    bold: subtitleBoldElement.checked,
  });
  renderSubtitleStyleControls();
  await chrome.storage.local.set({ subtitleStyle });

  try {
    await sendRuntimeMessage({
      target: "content-frame",
      payload: {
        type: "updateSubtitleStyle",
        subtitleStyle,
      },
    });
  } catch {
    // The style is still saved; a video frame may not be open yet.
  }
}

async function generateSubtitle() {
  try {
    const tab = await getActiveTab();
    const detected = await detectCurrentVideo();
    if (!detected) return;

    const targetLanguageCode = targetLanguageElement.value;
    const targetLanguageName = languageNames[targetLanguageCode] ?? targetLanguageCode;
    const reasoningEffort = reasoningEffortElement.value;
    const isResume = generateButton.dataset.mode === "resume";

    setGenerateNeedsAttention(false);
    setProgress({ totalChunks: 0, completedChunks: 0, percent: 0 });
    setStatus(`${isResume ? "Resuming" : "Generating"} ${targetLanguageName} subtitles...`);
    setRunningControls(true);

    const response = await sendRuntimeMessage({
      target: "native-host",
      payload: {
        type: isResume ? "resumeGeneration" : "generateSubtitle",
        pageUrl: tab.url,
        videoId: detected.videoId,
        targetLanguageCode,
        targetLanguageName,
        reasoningEffort,
      },
    });

    if (response?.type === "error") {
      setStatus(response.message);
      setRunningControls(false);
      return;
    }

    if (response?.type !== "generationStarted") {
      setStatus(`Unexpected generator response: ${JSON.stringify(response)}`);
      setRunningControls(false);
      return;
    }

    currentGeneration = {
      jobId: response.jobId,
      videoId: detected.videoId,
      targetLanguageCode,
      targetLanguageName,
      reasoningEffort,
      status: "running",
    };
    await saveCurrentGeneration();
    await pollGenerationStatus();
  } catch (error) {
    setStatus(error.message);
    setRunningControls(false);
  }
}

async function cancelGeneration() {
  if (!currentGeneration?.jobId) {
    return;
  }

  cancelButton.disabled = true;
  setStatus("Cancelling generation...");

  const response = await sendRuntimeMessage({
    target: "native-host",
    payload: {
      type: "cancelGeneration",
      jobId: currentGeneration.jobId,
      videoId: currentGeneration.videoId,
      targetLanguageCode: currentGeneration.targetLanguageCode,
    },
  });

  if (response?.type === "error") {
    setStatus(response.message);
    updateGenerationControls();
    return;
  }

  await pollGenerationStatus({ loadOnComplete: false });
}

async function pollGenerationStatus(options = {}) {
  const { loadOnComplete = true } = options;
  if (!currentGeneration) {
    return;
  }

  clearPollTimer();
  const response = await sendRuntimeMessage({
    target: "native-host",
    payload: {
      type: "getGenerationStatus",
      jobId: currentGeneration.jobId,
      videoId: currentGeneration.videoId,
      targetLanguageCode: currentGeneration.targetLanguageCode,
    },
  });

  if (response?.type === "error") {
    setStatus(response.message);
    setRunningControls(false);
    return;
  }

  await handleGenerationStatus(response, { loadOnComplete });
}

async function handleGenerationStatus(response, { loadOnComplete }) {
  currentGeneration = {
    ...currentGeneration,
    jobId: response.jobId || currentGeneration?.jobId || null,
    status: response.status,
    progress: response.progress ?? currentGeneration?.progress,
  };
  setProgress(currentGeneration.progress);

  if (response.status === "running") {
    setStatus(formatProgressStatus(currentGeneration));
    setRunningControls(true);
    pollTimer = setTimeout(() => pollGenerationStatus({ loadOnComplete }), PROGRESS_POLL_INTERVAL_MS);
    await saveCurrentGeneration();
    return;
  }

  if (response.status === "completed") {
    const completedGeneration = currentGeneration;
    setStatus("Generation completed. Loading cached subtitles...");
    setRunningControls(false);
    await chrome.storage.local.remove("currentGeneration");
    currentGeneration = null;
    updateGenerationControls();
    if (loadOnComplete && subtitlesEnabled) {
      await loadCachedSubtitle({ videoId: completedGeneration.videoId });
    }
    return;
  }

  if (response.status === "cancelled") {
    currentGeneration.jobId = null;
    setStatus("Generation cancelled. Use Resume to continue from saved chunks.");
    setRunningControls(false);
    await saveCurrentGeneration();
    return;
  }

  if (response.status === "failed") {
    currentGeneration.jobId = null;
    setGenerateNeedsAttention(true);
    setStatus(`${response.message ?? "Generation failed."}\nUse Resume to continue from saved chunks.`);
    setRunningControls(false);
    await saveCurrentGeneration();
    return;
  }

  setStatus("No active generation job. Use Resume if chunks were already created.");
  setRunningControls(false);
  await saveCurrentGeneration();
}

async function detectCurrentVideo(options = {}) {
  const { quiet = false } = options;
  const detected = await sendRuntimeMessage(
    {
      target: "content-frame",
      payload: { type: "detectVideo" },
    },
    {
      timeoutMessage: "Video frame did not answer. Reload the Academy page and try again.",
    },
  );
  if (!detected?.found) {
    if (!quiet) {
      setStatus(detected?.message ?? "No video found on this Academy page.");
    }
    return null;
  }

  if (!detected.videoId) {
    if (!quiet) {
      setStatus("Could not detect an Academy/Vimeo video id.");
    }
    return null;
  }

  return detected;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function saveCurrentGeneration() {
  await chrome.storage.local.set({ currentGeneration });
  updateGenerationControls();
}

function clearPollTimer() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function startProgressClock() {
  if (progressClockTimer) {
    return;
  }

  renderProgressClock();
  progressClockTimer = setInterval(renderProgressClock, 1000);
}

function stopProgressClock() {
  if (!progressClockTimer) {
    return;
  }

  clearInterval(progressClockTimer);
  progressClockTimer = null;
}

function renderProgressClock() {
  if (!currentGeneration?.progress || progressPanel.hidden) {
    return;
  }

  progressLabel.textContent = formatProgressLabel(currentGeneration.progress, {
    now: new Date(),
    pollIntervalMs: PROGRESS_POLL_INTERVAL_MS,
  });
}

function setRunningControls(isRunning) {
  generateButton.disabled = isRunning;
  cancelButton.disabled = !isRunning;
  reasoningEffortElement.disabled = isRunning;
  progressPanel.dataset.running = isRunning ? "true" : "false";
  if (isRunning) {
    startProgressClock();
    generateButton.textContent = "Generating";
    return;
  }

  stopProgressClock();
  updateGenerationControls();
}

function updateGenerationControls() {
  const isRunning = currentGeneration?.status === "running";
  const canResume =
    currentGeneration &&
    currentGeneration.status !== "running" &&
    currentGeneration.status !== "completed";

  generateButton.disabled = isRunning;
  cancelButton.disabled = !isRunning;
  reasoningEffortElement.disabled = isRunning;
  generateButton.textContent = isRunning ? "Generating" : canResume ? "Resume" : "Generate";
  generateButton.dataset.mode = canResume ? "resume" : "generate";
}

function setGenerateNeedsAttention(needsAttention) {
  generateButton.classList.toggle("needs-attention", needsAttention);
}

function renderSubtitleStyleControls() {
  fontSizeElement.value = subtitleStyle.fontSizePx;
  fontSizeValueElement.textContent = `${subtitleStyle.fontSizePx}px`;
  bottomOffsetElement.value = subtitleStyle.bottomOffsetPx;
  bottomOffsetValueElement.textContent = `${subtitleStyle.bottomOffsetPx}px`;
  subtitleColorElement.value = subtitleStyle.color;
  backgroundColorElement.value = subtitleStyle.backgroundColor;
  backgroundOpacityElement.value = subtitleStyle.backgroundOpacity;
  backgroundOpacityValueElement.textContent = `${Math.round(subtitleStyle.backgroundOpacity * 100)}%`;
  subtitleBoldElement.checked = subtitleStyle.bold;
}

function renderSubtitleToggle() {
  toggleSubtitlesButton.textContent = subtitlesEnabled ? "Subtitles On" : "Subtitles Off";
  toggleSubtitlesButton.dataset.enabled = subtitlesEnabled ? "true" : "false";
}

function setProgress(progress) {
  if (!progress) {
    progressPanel.hidden = true;
    return;
  }

  progressPanel.hidden = false;
  progressElement.value = progress.percent;
  progressLabel.textContent = formatProgressLabel(progress, {
    now: new Date(),
    pollIntervalMs: PROGRESS_POLL_INTERVAL_MS,
  });
}

function setStatus(message) {
  statusElement.textContent = message;
}
