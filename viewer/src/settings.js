export const DEFAULT_SETTINGS = Object.freeze({
  sourceLanguage: Object.freeze({ code: "en", name: "English" }),
  targetLanguage: Object.freeze({ code: "ko", name: "Korean" }),
  supportedTargetLanguages: Object.freeze([
    Object.freeze({ code: "ko", name: "Korean" }),
    Object.freeze({ code: "ja", name: "Japanese" }),
    Object.freeze({ code: "zh-Hans", name: "Chinese Simplified" }),
    Object.freeze({ code: "es", name: "Spanish" }),
    Object.freeze({ code: "fr", name: "French" }),
    Object.freeze({ code: "de", name: "German" }),
  ]),
  subtitleStyle: Object.freeze({
    fontSizePx: 24,
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 0.72,
    bottomOffsetPx: 96,
    bold: false,
  }),
  defaultSyncOffsetSeconds: 0,
  videoSyncOffsets: Object.freeze({}),
});

export function mergeSettings(savedSettings = {}) {
  return deepMerge(DEFAULT_SETTINGS, savedSettings);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? cloneValue(base) : cloneValue(override);
  }

  const merged = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(override)])) {
    merged[key] = deepMerge(base[key], override[key]);
  }
  return merged;
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (isPlainObject(value)) {
    return deepMerge(value, {});
  }

  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
