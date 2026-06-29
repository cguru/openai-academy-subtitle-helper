import { DEFAULT_SETTINGS, mergeSettings } from "./settings.js";

export function createSubtitleOverlay(videoElement, settings = DEFAULT_SETTINGS) {
  if (!videoElement?.parentElement) {
    throw new Error("video element must have a parent element");
  }

  const effectiveSettings = mergeSettings(settings);
  const document = videoElement.ownerDocument;
  const parent = videoElement.parentElement;
  const overlayElement = document.createElement("div");
  overlayElement.className = "academy-subtitle-helper-overlay";

  applyContainerStyle(parent);
  applyOverlayStyle(overlayElement, effectiveSettings.subtitleStyle);
  parent.appendChild(overlayElement);

  return {
    element: overlayElement,
    setText(text) {
      overlayElement.textContent = text;
      overlayElement.style.display = text ? "block" : "none";
    },
    clear() {
      overlayElement.textContent = "";
      overlayElement.style.display = "none";
    },
    destroy() {
      overlayElement.remove();
    },
  };
}

function applyContainerStyle(parent) {
  if (!parent.style.position) {
    parent.style.position = "relative";
  }
}

function applyOverlayStyle(element, style) {
  Object.assign(element.style, {
    position: "absolute",
    left: "50%",
    bottom: `${style.bottomOffsetPx}px`,
    transform: "translateX(-50%)",
    width: "94%",
    maxWidth: "94%",
    boxSizing: "border-box",
    padding: "0.25em 0.5em",
    borderRadius: "4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    wordBreak: "keep-all",
    overflowWrap: "normal",
    pointerEvents: "none",
    zIndex: "2147483647",
    fontFamily: "Arial, sans-serif",
    fontSize: `${style.fontSizePx}px`,
    fontWeight: style.bold ? "700" : "400",
    lineHeight: "1.35",
    color: style.color,
    backgroundColor: rgba(style.backgroundColor, style.backgroundOpacity),
    display: "none",
  });
}

function rgba(hexColor, opacity) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
