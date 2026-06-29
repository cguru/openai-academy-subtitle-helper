import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentScript = readFileSync(join(__dirname, "../src/content-script.js"), "utf8");

test("content script subtitle overlay supports default and live subtitle style updates", () => {
  assert.match(contentScript, /bottomOffsetPx:\s*96/);
  assert.match(contentScript, /type === "updateSubtitleStyle"/);
  assert.match(contentScript, /bottom:\s*`\$\{subtitleStyle\.bottomOffsetPx\}px`/);
  assert.match(contentScript, /fontSize:\s*`\$\{subtitleStyle\.fontSizePx\}px`/);
  assert.match(contentScript, /width:\s*"94%"/);
  assert.match(contentScript, /maxWidth:\s*"94%"/);
  assert.match(contentScript, /wordBreak:\s*"keep-all"/);
});
