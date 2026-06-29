import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backgroundScript = readFileSync(join(__dirname, "../src/background.js"), "utf8");

test("background attempts cached subtitle auto load when a video frame registers", () => {
  assert.match(backgroundScript, /tryAutoLoadCachedSubtitle/);
  assert.match(backgroundScript, /queueAutoLoadCachedSubtitle\(frame\)/);
});
