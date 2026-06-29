export function findActiveCue(cues, currentTime, options = {}) {
  const offsetSeconds = options.offsetSeconds ?? 0;
  const effectiveTime = currentTime + offsetSeconds;

  return cues.find((cue) => cue.start <= effectiveTime && effectiveTime < cue.end) ?? null;
}
