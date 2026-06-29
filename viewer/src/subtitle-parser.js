export function parseSubtitleText(text) {
  if (typeof text !== "string") {
    throw new TypeError("subtitle text must be a string");
  }

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\s*\n/);
  const cues = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== "");

    if (lines.length === 0 || lines[0].trim() === "WEBVTT") {
      continue;
    }

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) {
      continue;
    }

    const id = timeLineIndex > 0 ? lines[0].trim() : String(cues.length + 1);
    const [startRaw, endAndSettings] = lines[timeLineIndex].split("-->");
    const endRaw = endAndSettings.trim().split(/\s+/)[0];
    const textLines = lines.slice(timeLineIndex + 1);

    cues.push({
      id,
      start: parseTimestamp(startRaw.trim()),
      end: parseTimestamp(endRaw.trim()),
      text: textLines.join("\n").trim(),
    });
  }

  return cues;
}

function parseTimestamp(value) {
  const match = value.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) {
    throw new Error(`Invalid subtitle timestamp: ${value}`);
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}
