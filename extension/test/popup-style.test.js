import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(__dirname, "../src/popup.html"), "utf8");
const popupJs = readFileSync(join(__dirname, "../src/popup.js"), "utf8");
const popupCss = readFileSync(join(__dirname, "../src/popup.css"), "utf8");
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf8"));

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

test("popup resumes cancelled generation without requiring a live video frame", () => {
  assert.match(popupJs, /isResume && currentGeneration\?\.videoId/);
  assert.match(popupJs, /currentGeneration\.videoId/);
  assert.match(popupJs, /currentGeneration\?\.pageUrl \|\| tab\.url/);
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

test("popup disables generate when cached subtitles already exist", () => {
  assert.match(popupJs, /let cachedSubtitleAvailable = false/);
  assert.match(popupJs, /setCachedSubtitleAvailable\(true\)/);
  assert.match(popupJs, /response\?\.type === "subtitleFound"/);
  assert.match(popupJs, /generateButton\.disabled = isRunning \|\| \(cachedSubtitleAvailable && !canResume\)/);
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

test("popup exposes generation tuning controls with faster defaults", () => {
  assert.match(popupHtml, /id="parallel-jobs"/);
  assert.match(popupHtml, /<option value="5" selected>5<\/option>/);
  assert.match(popupHtml, /<option value="10">10<\/option>/);
  assert.match(popupHtml, /id="chunk-size"/);
  assert.match(popupHtml, /<option value="75" selected>75<\/option>/);
  assert.match(popupHtml, /<option value="low" selected data-i18n="low">Low<\/option>/);
  assert.match(popupJs, /parallelJobs/);
  assert.match(popupJs, /DEFAULT_PARALLEL_JOBS = "5"/);
  assert.match(popupJs, /DEFAULT_CHUNK_SIZE = "75"/);
  assert.match(popupJs, /DEFAULT_REASONING_EFFORT = "low"/);
});

test("popup exposes a delete subtitles action before subtitle style settings", () => {
  assert.match(popupHtml, /id="delete-subtitles"/);
  assert.ok(popupHtml.indexOf('id="delete-subtitles"') < popupHtml.indexOf('class="style-settings"'));
  assert.match(popupCss, /danger-row/);
  assert.match(popupJs, /deleteCachedSubtitles/);
  assert.match(popupJs, /type: "deleteSubtitle"/);
});

test("popup exposes UI language control and localization hooks", () => {
  assert.match(popupHtml, /id="ui-language"/);
  assert.match(popupHtml, /id="app-title"/);
  assert.match(popupHtml, /data-i18n="generate"/);
  assert.match(popupJs, /uiLanguage/);
  assert.match(popupJs, /applyLocalization/);
  assert.match(popupJs, /getManifest\?\.\(\)\.version/);
});

test("manifest exposes extension metadata through Chrome locales", () => {
  assert.equal(manifest.version, "0.0.2");
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.description, "__MSG_extensionDescription__");
  assert.equal(manifest.action.default_title, "__MSG_extensionName__");
});
