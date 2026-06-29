import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(__dirname, "../src/popup.html"), "utf8");
const popupJs = readFileSync(join(__dirname, "../src/popup.js"), "utf8");
const popupCss = readFileSync(join(__dirname, "../src/popup.css"), "utf8");

test("popup exposes subtitle style controls", () => {
  assert.match(popupHtml, /id="font-size"/);
  assert.match(popupHtml, /id="bottom-offset"/);
  assert.match(popupHtml, /id="subtitle-color"/);
  assert.match(popupHtml, /id="background-opacity"/);
  assert.match(popupHtml, /id="subtitle-bold"/);
});

test("popup places frequent action buttons before settings controls", () => {
  assert.ok(popupHtml.indexOf('id="generate"') < popupHtml.indexOf('id="reasoning-effort"'));
  assert.ok(popupHtml.indexOf('id="load"') > popupHtml.indexOf('id="status"'));
  assert.match(popupHtml, /Reload subtitles/);
});

test("popup exposes a translated subtitle on off toggle", () => {
  assert.match(popupHtml, /id="toggle-subtitles"/);
  assert.match(popupJs, /subtitlesEnabled/);
  assert.match(popupJs, /loadOnComplete && subtitlesEnabled/);
});

test("popup saves and sends subtitle style settings", () => {
  assert.match(popupJs, /subtitleStyle/);
  assert.match(popupJs, /updateSubtitleStyle/);
});

test("popup highlights generate when cached subtitles are missing", () => {
  assert.match(popupCss, /generate-attention/);
  assert.match(popupCss, /needs-attention/);
  assert.match(popupJs, /checkCachedSubtitleAvailability/);
  assert.match(popupJs, /setGenerateNeedsAttention\(true\)/);
});

test("popup shows a running progress heartbeat", () => {
  assert.match(popupCss, /progress-pulse/);
  assert.match(popupJs, /formatProgressLabel/);
  assert.match(popupJs, /startProgressClock/);
  assert.match(popupJs, /renderProgressClock/);
});

test("popup exposes subtitle y position controls above video navigation by default", () => {
  assert.match(popupHtml, /Y position/);
  assert.match(popupHtml, /id="bottom-offset"[^>]+max="180"[^>]+value="96"/);
  assert.match(popupCss, /utility-row/);
});

test("popup exposes parallel job control with default three workers", () => {
  assert.match(popupHtml, /id="parallel-jobs"/);
  assert.match(popupHtml, /<option value="3" selected>3<\/option>/);
  assert.match(popupJs, /parallelJobs/);
  assert.match(popupJs, /parallelJobsElement\.value = stored\.parallelJobs \?\? "3"/);
});
