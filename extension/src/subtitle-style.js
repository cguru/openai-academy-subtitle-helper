export const DEFAULT_SUBTITLE_STYLE = Object.freeze({
  fontSizePx: 24,
  bottomOffsetPx: 96,
  color: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 0.72,
  bold: false,
});

export function normalizeSubtitleStyle(style = {}) {
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
