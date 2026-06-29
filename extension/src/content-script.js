(() => {
  const OVERLAY_CLASS = "academy-subtitle-helper-overlay";
  const DEFAULT_SUBTITLE_STYLE = Object.freeze({
    fontSizePx: 24,
    bottomOffsetPx: 96,
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 0.72,
    bold: false,
  });
  let currentCues = [];
  let syncOffsetSeconds = 0;
  let subtitleStyle = DEFAULT_SUBTITLE_STYLE;
  let activeVideo = null;
  let overlay = null;

  registerVideoFrameWithRetry();
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "detectVideo") {
      activeVideo = findVideo();
      sendResponse({
        found: Boolean(activeVideo),
        videoId: detectAcademyVideoId(),
      });
      return true;
    }

    if (message?.type === "showSubtitles") {
      activeVideo = findVideo();
      if (!activeVideo) {
        sendResponse({ ok: false, message: "No video element found on this Academy page." });
        return true;
      }

      currentCues = message.cues ?? [];
      syncOffsetSeconds = message.syncOffsetSeconds ?? 0;
      subtitleStyle = normalizeSubtitleStyle(message.subtitleStyle);
      ensureOverlay(activeVideo);
      applySubtitleStyle();
      activeVideo.addEventListener("timeupdate", render);
      activeVideo.addEventListener("seeked", render);
      render();
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "hideSubtitles") {
      currentCues = [];
      if (overlay) {
        overlay.textContent = "";
        overlay.style.display = "none";
      }
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "updateSubtitleStyle") {
      subtitleStyle = normalizeSubtitleStyle(message.subtitleStyle);
      applySubtitleStyle();
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  function findVideo() {
    return document.querySelector("video");
  }

  function registerVideoFrameWithRetry(attempt = 0) {
    const video = findVideo();
    if (!video) {
      if (attempt < 20) {
        setTimeout(() => registerVideoFrameWithRetry(attempt + 1), 500);
      }
      return;
    }

    chrome.runtime.sendMessage({
      target: "video-frame-registry",
      videoId: detectAcademyVideoId(),
    });
  }

  function detectAcademyVideoId() {
    const html = document.documentElement.innerHTML;
    const match =
      location.href.match(/player\.vimeo\.com\/video\/(\d+)/) ||
      html.match(/player\.vimeo\.com\/video\/(\d+)/) ||
      html.match(/vimeo\.com\/(\d+)/) ||
      location.href.match(/videos\/([^/?#]+)/);
    return match?.[1] ?? null;
  }

  function ensureOverlay(video) {
    const host = getOverlayHost(video);
    if (!host) {
      return;
    }

    if (!host.style.position) {
      host.style.position = "relative";
    }

    if (!overlay) {
      overlay = host.querySelector(`.${OVERLAY_CLASS}`);
    }

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = OVERLAY_CLASS;
      Object.assign(overlay.style, {
        padding: "0.25em 0.5em",
        borderRadius: "4px",
        display: "none",
      });
      host.appendChild(overlay);
    }

    if (overlay.parentElement !== host) {
      host.appendChild(overlay);
    }

    applyOverlayLayoutStyle(overlay);
  }

  function getOverlayHost(video) {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (
      fullscreenElement &&
      fullscreenElement !== video &&
      typeof fullscreenElement.contains === "function" &&
      fullscreenElement.contains(video)
    ) {
      return fullscreenElement;
    }

    return video.parentElement;
  }

  function handleFullscreenChange() {
    if (!activeVideo || currentCues.length === 0) {
      return;
    }

    ensureOverlay(activeVideo);
    applySubtitleStyle();
    render();
  }

  function applyOverlayLayoutStyle(element) {
    Object.assign(element.style, {
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      width: "94%",
      maxWidth: "94%",
      boxSizing: "border-box",
      textAlign: "center",
      whiteSpace: "pre-line",
      wordBreak: "keep-all",
      overflowWrap: "normal",
      pointerEvents: "none",
      zIndex: "2147483647",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.35",
    });
  }

  function render() {
    if (!activeVideo || !overlay) {
      return;
    }

    const effectiveTime = activeVideo.currentTime + syncOffsetSeconds;
    const cue = currentCues.find((item) => item.start <= effectiveTime && effectiveTime < item.end);
    overlay.textContent = cue?.text ?? "";
    overlay.style.display = cue ? "block" : "none";
  }

  function applySubtitleStyle() {
    if (!overlay) {
      return;
    }

    Object.assign(overlay.style, {
      bottom: `${scaleSubtitleDimension(subtitleStyle.bottomOffsetPx)}px`,
      fontSize: `${scaleSubtitleDimension(subtitleStyle.fontSizePx)}px`,
      fontWeight: subtitleStyle.bold ? "700" : "400",
      color: subtitleStyle.color,
      backgroundColor: rgba(subtitleStyle.backgroundColor, subtitleStyle.backgroundOpacity),
    });
  }

  function scaleSubtitleDimension(value) {
    const scale = getFullscreenScale();
    return Math.round(value * scale);
  }

  function getFullscreenScale() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement || !activeVideo || !fullscreenElement.contains(activeVideo)) {
      return 1;
    }

    const height = fullscreenElement.getBoundingClientRect?.().height || 0;
    if (!height) {
      return 1.5;
    }

    return clampNumber(height / 720, 1, 2, 1);
  }

  function normalizeSubtitleStyle(style = {}) {
    const safeStyle = isPlainObject(style) ? style : {};
    return {
      fontSizePx: clampInteger(safeStyle.fontSizePx, 16, 48, DEFAULT_SUBTITLE_STYLE.fontSizePx),
      bottomOffsetPx: clampInteger(
        safeStyle.bottomOffsetPx,
        24,
        180,
        DEFAULT_SUBTITLE_STYLE.bottomOffsetPx,
      ),
      color: normalizeHexColor(safeStyle.color, DEFAULT_SUBTITLE_STYLE.color),
      backgroundColor: normalizeHexColor(
        safeStyle.backgroundColor,
        DEFAULT_SUBTITLE_STYLE.backgroundColor,
      ),
      backgroundOpacity: clampNumber(
        safeStyle.backgroundOpacity,
        0,
        1,
        DEFAULT_SUBTITLE_STYLE.backgroundOpacity,
      ),
      bold: Boolean(safeStyle.bold),
    };
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  function normalizeHexColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value.toLowerCase() : fallback;
  }

  function rgba(hexColor, opacity) {
    const normalized = hexColor.replace("#", "");
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }
})();
